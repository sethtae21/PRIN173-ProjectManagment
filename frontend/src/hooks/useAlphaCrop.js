import { useEffect, useState } from "react";

// Version marker so you can CONFIRM in DevTools that this file is the one running.
const PIPELINE_VERSION = "v7-solid-aware";
console.info("[useAlphaCrop] pipeline", PIPELINE_VERSION);

const CONNECT_STEPS = [24, 12];
const LOW_ALPHA = 8;
const LINK_RATIO = 0.05;
const MIN_COMPONENT_AREA_RATIO = 0.0008;
const TIGHTEN_ALPHA = 96;
const TIGHTEN_FALLBACK_ALPHA = 40;
const FAINT_ALPHA_CEILING = 200;

const cropCache = new Map();
const CACHE_LIMIT = 80;

function cacheSet(src, dataUrl) {
  if (cropCache.size >= CACHE_LIMIT) {
    const oldest = cropCache.keys().next().value;
    cropCache.delete(oldest);
  }
  cropCache.set(src, dataUrl);
}

function rescueFaintAlpha(imageData) {
  const { data } = imageData;
  const hist = new Uint32Array(256);
  let nonZero = 0;
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    if (a > 0) { hist[a] += 1; nonZero += 1; }
  }
  if (nonZero === 0) return false;
  const target = Math.max(1, Math.ceil(nonZero * 0.5));
  let cum = 0, median = 255;
  for (let a = 255; a >= 1; a -= 1) {
    cum += hist[a];
    if (cum >= target) { median = a; break; }
  }
  if (median >= FAINT_ALPHA_CEILING) return false;
  const gain = 255 / Math.max(1, median);
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    if (a > 0) data[i] = Math.min(255, Math.round(a * gain));
  }
  return true;
}

function fillTransparentHoles(imageData) {
  const { data, width: w, height: h } = imageData;
  const total = w * h;
  const isTransparent = (i) => data[i * 4 + 3] <= CONNECT_STEPS[0];
  const outside = new Uint8Array(total);
  const stack = new Int32Array(total);
  let sp = 0;
  const pushOutside = (i) => {
    if (i < 0 || i >= total || outside[i] || !isTransparent(i)) return;
    outside[i] = 1; stack[sp++] = i;
  };
  for (let x = 0; x < w; x += 1) { pushOutside(x); pushOutside((h - 1) * w + x); }
  for (let y = 0; y < h; y += 1) { pushOutside(y * w); pushOutside(y * w + w - 1); }
  while (sp > 0) {
    const i = stack[--sp]; const x = i % w;
    if (x > 0) pushOutside(i - 1);
    if (x < w - 1) pushOutside(i + 1);
    if (i - w >= 0) pushOutside(i - w);
    if (i + w < total) pushOutside(i + w);
  }
  const known = new Uint8Array(total);
  let holeCount = 0;
  for (let i = 0; i < total; i += 1) {
    if (isTransparent(i)) { if (!outside[i]) holeCount += 1; }
    else known[i] = 1;
  }
  if (holeCount === 0) return 0;
  const inQueue = new Uint8Array(total);
  const queue = new Int32Array(total);
  let qHead = 0, qTail = 0;
  const avg = (i) => {
    const x = i % w; let r = 0, g = 0, b = 0, n = 0;
    if (x > 0 && known[i - 1]) { r += data[(i - 1) * 4]; g += data[(i - 1) * 4 + 1]; b += data[(i - 1) * 4 + 2]; n++; }
    if (x < w - 1 && known[i + 1]) { r += data[(i + 1) * 4]; g += data[(i + 1) * 4 + 1]; b += data[(i + 1) * 4 + 2]; n++; }
    if (i - w >= 0 && known[i - w]) { r += data[(i - w) * 4]; g += data[(i - w) * 4 + 1]; b += data[(i - w) * 4 + 2]; n++; }
    if (i + w < total && known[i + w]) { r += data[(i + w) * 4]; g += data[(i + w) * 4 + 1]; b += data[(i + w) * 4 + 2]; n++; }
    return n ? [r / n, g / n, b / n] : null;
  };
  for (let i = 0; i < total; i += 1) {
    if (!isTransparent(i) || outside[i] || inQueue[i]) continue;
    const x = i % w;
    const has = (x > 0 && known[i - 1]) || (x < w - 1 && known[i + 1]) || (i - w >= 0 && known[i - w]) || (i + w < total && known[i + w]);
    if (has) { inQueue[i] = 1; queue[qTail++] = i; }
  }
  let filled = 0;
  while (qHead < qTail) {
    const i = queue[qHead++];
    const c = avg(i); if (!c) continue;
    data[i * 4] = c[0]; data[i * 4 + 1] = c[1]; data[i * 4 + 2] = c[2]; data[i * 4 + 3] = 255;
    known[i] = 1; filled++;
    const x = i % w; const nb = [];
    if (x > 0) nb.push(i - 1);
    if (x < w - 1) nb.push(i + 1);
    if (i - w >= 0) nb.push(i - w);
    if (i + w < total) nb.push(i + w);
    for (const j of nb) if (isTransparent(j) && !outside[j] && !known[j] && !inQueue[j]) { inQueue[j] = 1; queue[qTail++] = j; }
  }
  return filled;
}

function scanClusteredComponentBox(data, sw, sh, connectThreshold, lowThreshold, minRatio, linkRatio, solidThreshold = TIGHTEN_ALPHA) {
  const total = sw * sh;
  const visited = new Uint8Array(total);
  const stack = new Int32Array(total);
  const minArea = Math.max(16, Math.floor(total * minRatio));
  const allComps = []; const comps = [];
  for (let start = 0; start < total; start += 1) {
    if (visited[start] || data[start * 4 + 3] <= connectThreshold) continue;
    let sp = 0; stack[sp++] = start; visited[start] = 1;
    let area = 0, solid = 0;
    let minX = sw, minY = sh, maxX = -1, maxY = -1;
    while (sp > 0) {
      const idx = stack[--sp]; const x = idx % sw; const y = (idx / sw) | 0;
      area++; if (data[idx * 4 + 3] > solidThreshold) solid++;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (x > 0 && !visited[idx - 1] && data[(idx - 1) * 4 + 3] > connectThreshold) { visited[idx - 1] = 1; stack[sp++] = idx - 1; }
      if (x < sw - 1 && !visited[idx + 1] && data[(idx + 1) * 4 + 3] > connectThreshold) { visited[idx + 1] = 1; stack[sp++] = idx + 1; }
      if (y > 0 && !visited[idx - sw] && data[(idx - sw) * 4 + 3] > connectThreshold) { visited[idx - sw] = 1; stack[sp++] = idx - sw; }
      if (y < sh - 1 && !visited[idx + sw] && data[(idx + sw) * 4 + 3] > connectThreshold) { visited[idx + sw] = 1; stack[sp++] = idx + sw; }
    }
    const comp = { minX, minY, maxX, maxY, area, solid };
    allComps.push(comp); if (area >= minArea) comps.push(comp);
  }
  if (!comps.length) {
    let biggest = null;
    for (const c of allComps) if (!biggest || c.area > biggest.area) biggest = c;
    if (!biggest) return null;
    comps.push(biggest);
  }
  const linkGap = Math.max(3, Math.round(linkRatio * Math.max(sw, sh)));
  const parent = comps.map((_, i) => i);
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const unite = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; };
  const linked = (a, b) =>
    a.minX - linkGap <= b.maxX + linkGap && b.minX - linkGap <= a.maxX + linkGap &&
    a.minY - linkGap <= b.maxY + linkGap && b.minY - linkGap <= a.maxY + linkGap;
  for (let i = 0; i < comps.length; i++) for (let j = i + 1; j < comps.length; j++) if (linked(comps[i], comps[j])) unite(i, j);
  const clusters = new Map();
  for (let i = 0; i < comps.length; i++) {
    const r = find(i); let c = clusters.get(r);
    if (!c) { c = { minX: sw, minY: sh, maxX: -1, maxY: -1, area: 0, solid: 0 }; clusters.set(r, c); }
    const b = comps[i];
    if (b.minX < c.minX) c.minX = b.minX; if (b.minY < c.minY) c.minY = b.minY;
    if (b.maxX > c.maxX) c.maxX = b.maxX; if (b.maxY > c.maxY) c.maxY = b.maxY;
    c.area += b.area; c.solid += b.solid;
  }
  // SOLID-AWARE: prefer the cluster with the most SOLID pixels so a large faint
  // ghost can never out-vote a small solid dress.
  let core = null;
  for (const c of clusters.values()) {
    if (!core) { core = c; continue; }
    const cs = c.solid > 0, ks = core.solid > 0;
    if (cs && !ks) core = c;
    else if (cs === ks) { if (cs ? c.solid > core.solid : c.area > core.area) core = c; }
  }
  if (!core) return null;
  const subMin = allComps.filter((c) => c.area < minArea);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of subMin) {
      if (c.__absorbed) continue;
      if (linked(c, core)) {
        c.__absorbed = true;
        if (c.minX < core.minX) core.minX = c.minX; if (c.minY < core.minY) core.minY = c.minY;
        if (c.maxX > core.maxX) core.maxX = c.maxX; if (c.maxY > core.maxY) core.maxY = c.maxY;
        grew = true;
      }
    }
  }
  const margin = Math.max(2, Math.round(0.06 * Math.max(sw, sh)));
  const gx0 = Math.max(0, core.minX - margin), gy0 = Math.max(0, core.minY - margin);
  const gx1 = Math.min(sw - 1, core.maxX + margin), gy1 = Math.min(sh - 1, core.maxY + margin);
  const gw = gx1 - gx0 + 1, gh = gy1 - gy0 + 1;
  const gVisited = new Uint8Array(gw * gh); const gQueue = new Int32Array(gw * gh);
  let gHead = 0, gTail = 0;
  let outMinX = sw, outMinY = sh, outMaxX = -1, outMaxY = -1;
  const gi = (x, y) => (y - gy0) * gw + (x - gx0);
  for (let y = Math.max(gy0, core.minY); y <= Math.min(gy1, core.maxY); y++)
    for (let x = Math.max(gx0, core.minX); x <= Math.min(gx1, core.maxX); x++)
      if (data[(y * sw + x) * 4 + 3] > connectThreshold) {
        const id = gi(x, y);
        if (!gVisited[id]) { gVisited[id] = 1; gQueue[gTail++] = id;
          if (x < outMinX) outMinX = x; if (x > outMaxX) outMaxX = x;
          if (y < outMinY) outMinY = y; if (y > outMaxY) outMaxY = y; }
      }
  while (gHead < gTail) {
    const id = gQueue[gHead++]; const x = (id % gw) + gx0; const y = ((id / gw) | 0) + gy0;
    const nbx = [x + 1, x - 1, x, x], nby = [y, y, y + 1, y - 1];
    for (let k = 0; k < 4; k++) {
      const nx = nbx[k], ny = nby[k];
      if (nx < gx0 || nx > gx1 || ny < gy0 || ny > gy1) continue;
      const nid = gi(nx, ny);
      if (gVisited[nid] || data[(ny * sw + nx) * 4 + 3] <= lowThreshold) continue;
      gVisited[nid] = 1; gQueue[gTail++] = nid;
      if (nx < outMinX) outMinX = nx; if (nx > outMaxX) outMaxX = nx;
      if (ny < outMinY) outMinY = ny; if (ny > outMaxY) outMaxY = ny;
    }
  }
  if (outMaxX < outMinX) return { minX: core.minX, minY: core.minY, maxX: core.maxX, maxY: core.maxY, coreMinX: core.minX, coreMinY: core.minY, coreMaxX: core.maxX, coreMaxY: core.maxY, area: core.area, solid: core.solid };
  return { minX: outMinX, minY: outMinY, maxX: outMaxX, maxY: outMaxY, coreMinX: core.minX, coreMinY: core.minY, coreMaxX: core.maxX, coreMaxY: core.maxY, area: core.area, solid: core.solid };
}

function tightenBoxToOpaque(data, sw, sh, box, alpha = TIGHTEN_ALPHA) {
  if (!box) return null;
  const { minX, minY, maxX, maxY } = box;
  let tMinX = sw, tMinY = sh, tMaxX = -1, tMaxY = -1;
  for (let y = minY; y <= maxY; y++) {
    const row = y * sw;
    for (let x = minX; x <= maxX; x++) {
      if (data[(row + x) * 4 + 3] > alpha) {
        if (x < tMinX) tMinX = x; if (x > tMaxX) tMaxX = x;
        if (y < tMinY) tMinY = y; if (y > tMaxY) tMaxY = y;
      }
    }
  }
  if (tMaxX < tMinX || tMaxY < tMinY) return null;
  if ((tMaxX - tMinX + 1) * (tMaxY - tMinY + 1) < 16) return null;
  return { minX: tMinX, minY: tMinY, maxX: tMaxX, maxY: tMaxY, area: box.area };
}

export function useAlphaCrop(src) {
  const [cropped, setCropped] = useState(() => (src && cropCache.has(src) ? cropCache.get(src) : null));
  useEffect(() => {
    let cancelled = false;
    if (!src) { setCropped(null); return undefined; }
    if (cropCache.has(src)) { setCropped(cropCache.get(src)); return undefined; }
    setCropped(null);
    const probe = new Image();
    probe.crossOrigin = "anonymous";
    probe.onload = () => {
      if (cancelled) return;
      try {
        const w = probe.naturalWidth, h = probe.naturalHeight;
        if (!w || !h) return;
        const full = document.createElement("canvas");
        full.width = w; full.height = h;
        const fullCtx = full.getContext("2d", { willReadFrequently: true });
        fullCtx.drawImage(probe, 0, 0);
        const fullImage = fullCtx.getImageData(0, 0, w, h);
        const holesFilled = fillTransparentHoles(fullImage);
        if (holesFilled > 0) fullCtx.putImageData(fullImage, 0, 0);
        const scale = Math.min(1, 512 / Math.max(w, h));
        const sw = Math.max(1, Math.round(w * scale)), sh = Math.max(1, Math.round(h * scale));
        const scan = document.createElement("canvas");
        scan.width = sw; scan.height = sh;
        const scanCtx = scan.getContext("2d", { willReadFrequently: true });
        scanCtx.drawImage(full, 0, 0, sw, sh);
        const { data } = scanCtx.getImageData(0, 0, sw, sh);
        let box = null;
        for (let i = 0; i < CONNECT_STEPS.length && !box; i++) box = scanClusteredComponentBox(data, sw, sh, CONNECT_STEPS[i], LOW_ALPHA, MIN_COMPONENT_AREA_RATIO, LINK_RATIO);
        if (!box) return;
        const grown = { minX: box.minX, minY: box.minY, maxX: box.maxX, maxY: box.maxY };
        let finalBox = tightenBoxToOpaque(data, sw, sh, grown, TIGHTEN_ALPHA) || tightenBoxToOpaque(data, sw, sh, grown, TIGHTEN_FALLBACK_ALPHA);
        if (!finalBox && box.coreMaxX >= box.coreMinX && box.coreMaxY >= box.coreMinY) finalBox = { minX: box.coreMinX, minY: box.coreMinY, maxX: box.coreMaxX, maxY: box.coreMaxY, area: box.area };
        if (!finalBox) return;
        box = finalBox;
        const { minX, minY, maxX, maxY } = box;
        const covers = (maxX - minX + 1 >= sw * 0.98) && (maxY - minY + 1 >= sh * 0.98);
        if (covers) {
          const rescued = rescueFaintAlpha(fullImage);
          if (rescued) fullCtx.putImageData(fullImage, 0, 0);
          if ((holesFilled > 0 || rescued) && !cancelled) { const u = full.toDataURL("image/png"); cacheSet(src, u); setCropped(u); }
          return;
        }
        const pad = Math.max(1, Math.round(Math.max(maxX - minX, maxY - minY) * 0.03));
        const cx1 = Math.max(0, (minX - pad) / scale), cy1 = Math.max(0, (minY - pad) / scale);
        const cx2 = Math.min(w, (maxX + pad + 1) / scale), cy2 = Math.min(h, (maxY + pad + 1) / scale);
        const cw = Math.max(1, Math.round(cx2 - cx1)), ch = Math.max(1, Math.round(cy2 - cy1));
        const crop = document.createElement("canvas");
        crop.width = cw; crop.height = ch;
        const cropCtx = crop.getContext("2d", { willReadFrequently: true });
        cropCtx.drawImage(full, Math.round(cx1), Math.round(cy1), cw, ch, 0, 0, cw, ch);
        const cd = cropCtx.getImageData(0, 0, cw, ch);
        if (rescueFaintAlpha(cd)) cropCtx.putImageData(cd, 0, 0);
        const u = crop.toDataURL("image/png");
        cacheSet(src, u); if (!cancelled) setCropped(u);
      } catch (e) { console.warn("Alpha-crop skipped:", e); }
    };
    probe.onerror = () => {};
    probe.src = src;
    return () => { cancelled = true; };
  }, [src]);
  return cropped;
}

export default useAlphaCrop;