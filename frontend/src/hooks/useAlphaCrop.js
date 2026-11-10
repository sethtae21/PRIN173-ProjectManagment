import { useEffect, useState } from "react";

/* ==========================================
   SHARED ALPHA NORMALIZATION PIPELINE
   (extracted from SellerItemDetailsPage.jsx so the Shopper Catalog cards
   and the Seller Item Details page share one implementation)

   1. fillTransparentHoles — rembg (white-on-white shots) sometimes deletes
      pockets INSIDE the garment. We flood-fill the "outside" transparent
      region from the image borders; any transparent pixel NOT reached is an
      enclosed hole and is inpainted by growing the rim colour inward (BFS),
      restoring a solid garment.
   2. scanClusteredComponentBox (TWO-THRESHOLD CLUSTERED CROP) — labels
      components at a LOW connect threshold (so a thin/translucent folded hood
      survives), merges nearby components into clusters, absorbs sub-minimum
      components that touch the chosen cluster (the hood fold), then grows the
      final box outward through soft anti-aliased fringes at an even lower
      threshold (fixes overcrop of cuffs / hem / hood rim). Cropping to the
      SINGLE LARGEST cluster drops a second garment that shares the frame
      (e.g. trousers photographed under a jacket) without losing an adjacent
      hood -- which plain "largest component" and plain "union" both got wrong.
   3. TIGHT-CROP v2 — the clustered box can still carry a band of EMPTY
      transparent rows/columns (a faint hanger rod the low-alpha grow leaked
      up, or soft fringe). For tall garments (dresses / pants) that loose box
      made `object-fit: contain` shrink the real garment to a near-invisible
      sliver in the small listing tile, and pinned the dress to the BOTTOM of
      the large detail stage instead of centring it. We now re-scan the chosen
      box at the solid alpha threshold (96, matching the avatar crop) and
      shrink it to the first/last row & column that actually hold opaque
      garment pixels. If the garment is FAINT (max alpha below 96 — e.g. a
      pale multicolor camisole rembg nearly ate) the 96/40 scans find nothing,
      so we fall back to the CORE cluster box: the tight bounding box of the
      connected component, built BEFORE the low-alpha grow, which by
      construction contains no empty band. Only when even the core is
      degenerate (no coherent garment at the lowest connect threshold) do we
      signal "empty" so the caller can show a legible placeholder instead of
      misleading blank gold. Wide garments are already tight -> unchanged.

   RESULT: the uneven transparent margins around the garment are trimmed AND
   the box is tightened to the silhouette, so whatever container centers the
   returned data-URL is centering the GARMENT, not the empty canvas padding --
   with nothing clipped and no stray garment. The crop's own aspect ratio now
   equals the garment's true length, which the listing tile uses to size
   itself per garment.
========================================== */

/* Two-threshold clustered crop tuning. */
const CONNECT_STEPS = [24, 12];   // connectivity / component labelling (NOT the box)
const LOW_ALPHA = 8;              // box grow-through threshold (recovers soft fringe)
const LINK_RATIO = 0.05;          // hood-fold gap merges; trousers gap does not
const MIN_COMPONENT_AREA_RATIO = 0.0008; // seed threshold; adjacency rescues thinner hoods

/* TIGHT-CROP v2: solid-alpha thresholds used to shrink the final box to the
   opaque garment. 96 matches the avatar's crop and analyzeTShape so the
   tighten sees exactly the pixels the rest of the pipeline treats as garment;
   40 is the faint-garment rescue (a pale cami whose body sits between the
   connect floor and 96). Below both, we trust the CORE box (>= connect). */
const TIGHTEN_ALPHA = 96;
const TIGHTEN_FALLBACK_ALPHA = 40;

/* Module-level cache: catalog grids re-render often; never reprocess the
   same source URL twice per session. Bounded to keep memory sane. */
const cropCache = new Map();
const CACHE_LIMIT = 80;

function cacheSet(src, dataUrl) {
  if (cropCache.size >= CACHE_LIMIT) {
    const oldest = cropCache.keys().next().value;
    cropCache.delete(oldest);
  }
  cropCache.set(src, dataUrl);
}

function fillTransparentHoles(imageData) {
  const { data, width: w, height: h } = imageData;
  const total = w * h;
  const isTransparent = (i) => data[i * 4 + 3] <= CONNECT_STEPS[0];

  /* 1. Flood-fill the OUTSIDE transparent region from all four borders. */
  const outside = new Uint8Array(total);
  const stack = new Int32Array(total);
  let sp = 0;
  const pushOutside = (i) => {
    if (i < 0 || i >= total || outside[i] || !isTransparent(i)) return;
    outside[i] = 1;
    stack[sp++] = i;
  };
  for (let x = 0; x < w; x += 1) {
    pushOutside(x);
    pushOutside((h - 1) * w + x);
  }
  for (let y = 0; y < h; y += 1) {
    pushOutside(y * w);
    pushOutside(y * w + w - 1);
  }
  while (sp > 0) {
    const i = stack[--sp];
    const x = i % w;
    if (x > 0) pushOutside(i - 1);
    if (x < w - 1) pushOutside(i + 1);
    pushOutside(i - w);
    pushOutside(i + w);
  }

  /* 2. Holes = transparent pixels never reached from the border. */
  const known = new Uint8Array(total);
  let holeCount = 0;
  for (let i = 0; i < total; i += 1) {
    if (isTransparent(i)) {
      if (!outside[i]) holeCount += 1;
    } else {
      known[i] = 1;
    }
  }
  if (holeCount === 0) return 0;

  const inQueue = new Uint8Array(total);
  const queue = new Int32Array(total);
  let qHead = 0;
  let qTail = 0;

  const averageKnownNeighbours = (i) => {
    const x = i % w;
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    if (x > 0 && known[i - 1]) { r += data[(i - 1) * 4]; g += data[(i - 1) * 4 + 1]; b += data[(i - 1) * 4 + 2]; n += 1; }
    if (x < w - 1 && known[i + 1]) { r += data[(i + 1) * 4]; g += data[(i + 1) * 4 + 1]; b += data[(i + 1) * 4 + 2]; n += 1; }
    if (i - w >= 0 && known[i - w]) { r += data[(i - w) * 4]; g += data[(i - w) * 4 + 1]; b += data[(i - w) * 4 + 2]; n += 1; }
    if (i + w < total && known[i + w]) { r += data[(i + w) * 4]; g += data[(i + w) * 4 + 1]; b += data[(i + w) * 4 + 2]; n += 1; }
    if (n === 0) return null;
    return [r / n, g / n, b / n];
  };

  /* Seed the BFS with hole pixels that touch solid garment pixels. */
  for (let i = 0; i < total; i += 1) {
    if (!isTransparent(i) || outside[i] || inQueue[i]) continue;
    const x = i % w;
    const hasKnown =
      (x > 0 && known[i - 1]) ||
      (x < w - 1 && known[i + 1]) ||
      (i - w >= 0 && known[i - w]) ||
      (i + w < total && known[i + w]);
    if (hasKnown) {
      inQueue[i] = 1;
      queue[qTail++] = i;
    }
  }

  /* Grow the rim colour inward until every hole pixel is solid. */
  let filled = 0;
  while (qHead < qTail) {
    const i = queue[qHead++];
    const color = averageKnownNeighbours(i);
    if (!color) continue;
    data[i * 4] = color[0];
    data[i * 4 + 1] = color[1];
    data[i * 4 + 2] = color[2];
    data[i * 4 + 3] = 255;
    known[i] = 1;
    filled += 1;

    const x = i % w;
    const neighbours = [];
    if (x > 0) neighbours.push(i - 1);
    if (x < w - 1) neighbours.push(i + 1);
    if (i - w >= 0) neighbours.push(i - w);
    if (i + w < total) neighbours.push(i + w);
    for (let n = 0; n < neighbours.length; n += 1) {
      const j = neighbours[n];
      if (isTransparent(j) && !outside[j] && !known[j] && !inQueue[j]) {
        inQueue[j] = 1;
        queue[qTail++] = j;
      }
    }
  }
  return filled;
}

// TWO-THRESHOLD CLUSTERED CROP. See header comment for the full rationale.
//  • connectThreshold -> labels components & clusters (low enough to retain a
//                        thin/translucent folded hood, high enough to ignore
//                        alpha-0 background and 1-px dust).
//  • lowThreshold     -> grows the final box outward through soft anti-aliased
//                        fringes (cuffs / hem / hood rim) the connect step
//                        dropped, so nothing is clipped any more.
//  • adjacency absorb -> a hood sliver that never cleared minArea still joins
//                        the body box because it TOUCHES it.
//  • largest cluster  -> a second garment far below (trousers) stays a separate
//                        smaller cluster and is discarded.
// TIGHT-CROP v2: the returned object carries BOTH the grown box (minX..maxY,
// fringe-inclusive) AND the core cluster box (coreMinX..coreMaxY, the tight
// bounding box of the connected component BEFORE the low-alpha grow, so it has
// no empty hanger band). The hook prefers a solid-alpha tightening of the grown
// box, then falls back to the core box for faint garments.
function scanClusteredComponentBox(data, sw, sh, connectThreshold, lowThreshold, minRatio, linkRatio) {
  const total = sw * sh;
  const visited = new Uint8Array(total);
  const stack = new Int32Array(total);
  const minArea = Math.max(16, Math.floor(total * minRatio));
  const allComps = [];
  const comps = [];

  for (let start = 0; start < total; start += 1) {
    if (visited[start] || data[start * 4 + 3] <= connectThreshold) continue;
    let sp = 0;
    stack[sp++] = start;
    visited[start] = 1;
    let area = 0;
    let minX = sw, minY = sh, maxX = -1, maxY = -1;
    while (sp > 0) {
      const idx = stack[--sp];
      const x = idx % sw;
      const y = (idx / sw) | 0;
      area += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x > 0 && !visited[idx - 1] && data[(idx - 1) * 4 + 3] > connectThreshold) { visited[idx - 1] = 1; stack[sp++] = idx - 1; }
      if (x < sw - 1 && !visited[idx + 1] && data[(idx + 1) * 4 + 3] > connectThreshold) { visited[idx + 1] = 1; stack[sp++] = idx + 1; }
      if (y > 0 && !visited[idx - sw] && data[(idx - sw) * 4 + 3] > connectThreshold) { visited[idx - sw] = 1; stack[sp++] = idx - sw; }
      if (y < sh - 1 && !visited[idx + sw] && data[(idx + sw) * 4 + 3] > connectThreshold) { visited[idx + sw] = 1; stack[sp++] = idx + sw; }
    }
    const comp = { minX, minY, maxX, maxY, area };
    allComps.push(comp);
    if (area >= minArea) comps.push(comp);
  }

  if (!comps.length) {
    // Nothing cleared minArea: fall back to the single biggest blob so a faint
    // but real garment still crops (a dust-only canvas yields a tiny/empty box).
    let biggest = null;
    for (const c of allComps) if (!biggest || c.area > biggest.area) biggest = c;
    if (!biggest) return null;
    comps.push(biggest);
  }

  const linkGap = Math.max(3, Math.round(linkRatio * Math.max(sw, sh)));
  const parent = comps.map((_, i) => i);
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const unite = (a, b) => { const ra = find(a); const rb = find(b); if (ra !== rb) parent[ra] = rb; };
  const linked = (a, b) =>
    a.minX - linkGap <= b.maxX + linkGap && b.minX - linkGap <= a.maxX + linkGap &&
    a.minY - linkGap <= b.maxY + linkGap && b.minY - linkGap <= a.maxY + linkGap;

  for (let i = 0; i < comps.length; i += 1)
    for (let j = i + 1; j < comps.length; j += 1)
      if (linked(comps[i], comps[j])) unite(i, j);

  const clusters = new Map();
  for (let i = 0; i < comps.length; i += 1) {
    const r = find(i);
    let c = clusters.get(r);
    if (!c) { c = { minX: sw, minY: sh, maxX: -1, maxY: -1, area: 0 }; clusters.set(r, c); }
    const b = comps[i];
    if (b.minX < c.minX) c.minX = b.minX;
    if (b.minY < c.minY) c.minY = b.minY;
    if (b.maxX > c.maxX) c.maxX = b.maxX;
    if (b.maxY > c.maxY) c.maxY = b.maxY;
    c.area += b.area;
  }

  let core = null;
  for (const c of clusters.values()) if (!core || c.area > core.area) core = c;
  if (!core) return null;

  // Absorb sub-min-area components adjacent to the core (thin folded hood).
  const subMin = allComps.filter((c) => c.area < minArea);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of subMin) {
      if (c.__absorbed) continue;
      if (linked(c, core)) {
        c.__absorbed = true;
        if (c.minX < core.minX) core.minX = c.minX;
        if (c.minY < core.minY) core.minY = c.minY;
        if (c.maxX > core.maxX) core.maxX = c.maxX;
        if (c.maxY > core.maxY) core.maxY = c.maxY;
        grew = true;
      }
    }
  }

  // Low-threshold grow around the core -> recovers soft anti-aliased fringes.
  const margin = Math.max(2, Math.round(0.06 * Math.max(sw, sh)));
  const gx0 = Math.max(0, core.minX - margin);
  const gy0 = Math.max(0, core.minY - margin);
  const gx1 = Math.min(sw - 1, core.maxX + margin);
  const gy1 = Math.min(sh - 1, core.maxY + margin);
  const gw = gx1 - gx0 + 1;
  const gh = gy1 - gy0 + 1;
  const gVisited = new Uint8Array(gw * gh);
  const gQueue = new Int32Array(gw * gh);
  let gHead = 0;
  let gTail = 0;
  let outMinX = sw, outMinY = sh, outMaxX = -1, outMaxY = -1;
  const gi = (x, y) => (y - gy0) * gw + (x - gx0);
  for (let y = Math.max(gy0, core.minY); y <= Math.min(gy1, core.maxY); y += 1)
    for (let x = Math.max(gx0, core.minX); x <= Math.min(gx1, core.maxX); x += 1)
      if (data[(y * sw + x) * 4 + 3] > connectThreshold) {
        const id = gi(x, y);
        if (!gVisited[id]) {
          gVisited[id] = 1;
          gQueue[gTail++] = id;
          if (x < outMinX) outMinX = x;
          if (x > outMaxX) outMaxX = x;
          if (y < outMinY) outMinY = y;
          if (y > outMaxY) outMaxY = y;
        }
      }
  while (gHead < gTail) {
    const id = gQueue[gHead++];
    const lx = id % gw;
    const ly = (id / gw) | 0;
    const x = lx + gx0;
    const y = ly + gy0;
    const nbx = [x + 1, x - 1, x, x];
    const nby = [y, y, y + 1, y - 1];
    for (let k = 0; k < 4; k += 1) {
      const nx = nbx[k];
      const ny = nby[k];
      if (nx < gx0 || nx > gx1 || ny < gy0 || ny > gy1) continue;
      const nid = gi(nx, ny);
      if (gVisited[nid] || data[(ny * sw + nx) * 4 + 3] <= lowThreshold) continue;
      gVisited[nid] = 1;
      gQueue[gTail++] = nid;
      if (nx < outMinX) outMinX = nx;
      if (nx > outMaxX) outMaxX = nx;
      if (ny < outMinY) outMinY = ny;
      if (ny > outMaxY) outMaxY = ny;
    }
  }

  // TIGHT-CROP v2: emit the grown box AND the core box so the hook can choose.
  if (outMaxX < outMinX) {
    return {
      minX: core.minX, minY: core.minY, maxX: core.maxX, maxY: core.maxY,
      coreMinX: core.minX, coreMinY: core.minY, coreMaxX: core.maxX, coreMaxY: core.maxY,
      area: core.area,
    };
  }
  return {
    minX: outMinX, minY: outMinY, maxX: outMaxX, maxY: outMaxY,
    coreMinX: core.minX, coreMinY: core.minY, coreMaxX: core.maxX, coreMaxY: core.maxY,
    area: core.area,
  };
}

/* TIGHT-CROP v2: shrink a candidate box to the rows/columns that actually hold
   opaque (> alpha) pixels, removing the empty transparent band that the
   clustered grow can leave above/beside a tall garment. `alpha` lets the hook
   try a solid pass (96) then a faint pass (40). Returns null when the box has
   no pixels above `alpha` (caller then falls back to the core box, so a
   genuinely faint garment is never over-cropped away). Runs in SCAN space on
   the same `data` the cluster used. */
function tightenBoxToOpaque(data, sw, sh, box, alpha = TIGHTEN_ALPHA) {
  if (!box) return null;
  const { minX, minY, maxX, maxY } = box;

  let tMinX = sw, tMinY = sh, tMaxX = -1, tMaxY = -1;

  for (let y = minY; y <= maxY; y += 1) {
    const rowOff = y * sw;
    for (let x = minX; x <= maxX; x += 1) {
      if (data[(rowOff + x) * 4 + 3] > alpha) {
        if (x < tMinX) tMinX = x;
        if (x > tMaxX) tMaxX = x;
        if (y < tMinY) tMinY = y;
        if (y > tMaxY) tMaxY = y;
      }
    }
  }

  // No pixel above `alpha` inside the box: caller decides the fallback.
  if (tMaxX < tMinX || tMaxY < tMinY) return null;

  // Require a meaningful area before trusting the tightened box; otherwise the
  // garment was mostly faint and a wider box is safer.
  const tightenedArea = (tMaxX - tMinX + 1) * (tMaxY - tMinY + 1);
  if (tightenedArea < 16) return null;

  return { minX: tMinX, minY: tMinY, maxX: tMaxX, maxY: tMaxY, area: box.area };
}

/**
 * Trims the transparent margins around a rembg cutout, repairs enclosed
 * holes, tightens the box to the opaque garment (with a faint-garment core
 * fallback), and returns a tightly cropped PNG data-URL so the garment (not
 * the canvas) is what gets centered and scaled inside its frame. Returns null
 * when there is no coherent garment at all, so the caller can show a legible
 * placeholder instead of misleading blank gold. If the canvas is tainted
 * (CORS) or anything else fails, returns null and the caller keeps the
 * original image — never broken.
 */
export function useAlphaCrop(src) {
  const [cropped, setCropped] = useState(() =>
    src && cropCache.has(src) ? cropCache.get(src) : null
  );

  useEffect(() => {
    let cancelled = false;

    if (!src) {
      setCropped(null);
      return undefined;
    }

    if (cropCache.has(src)) {
      setCropped(cropCache.get(src));
      return undefined;
    }

    setCropped(null);

    const probe = new Image();
    probe.crossOrigin = "anonymous";

    probe.onload = () => {
      if (cancelled) return;
      try {
        const w = probe.naturalWidth;
        const h = probe.naturalHeight;
        if (!w || !h) return;

        const full = document.createElement("canvas");
        full.width = w;
        full.height = h;
        const fullCtx = full.getContext("2d");
        fullCtx.drawImage(probe, 0, 0);

        /* Repair enclosed transparent pockets BEFORE anything else, so the
           repaired garment is what gets cropped and displayed. */
        const fullImage = fullCtx.getImageData(0, 0, w, h);
        const holesFilled = fillTransparentHoles(fullImage);
        if (holesFilled > 0) fullCtx.putImageData(fullImage, 0, 0);

        /* Scan on a downscaled copy for speed (max 512px) */
        const scanMax = 512;
        const scale = Math.min(1, scanMax / Math.max(w, h));
        const sw = Math.max(1, Math.round(w * scale));
        const sh = Math.max(1, Math.round(h * scale));
        const scan = document.createElement("canvas");
        scan.width = sw;
        scan.height = sh;
        const scanCtx = scan.getContext("2d");
        scanCtx.drawImage(full, 0, 0, sw, sh);

        const { data } = scanCtx.getImageData(0, 0, sw, sh);

        let box = null;
        let usedThreshold = null;
        for (let i = 0; i < CONNECT_STEPS.length && !box; i += 1) {
          box = scanClusteredComponentBox(data, sw, sh, CONNECT_STEPS[i], LOW_ALPHA, MIN_COMPONENT_AREA_RATIO, LINK_RATIO);
          if (box) usedThreshold = CONNECT_STEPS[i];
        }
        if (!box) {
          console.info("[alpha-crop] fully transparent canvas, keeping original:", src);
          return;
        }

        /* TIGHT-CROP v2 selection: solid tighten (96) -> faint tighten (40) ->
           CORE cluster box (tight to the >=connect component, no empty hanger
           band) -> empty signal. This is what centres every garment on its own
           true extent (so the listing tile can size itself by garment length)
           and rescues faint garments like a pale multicolor camisole that the
           96-only pass used to drop back to the loose grown box. */
        const grownWindow = { minX: box.minX, minY: box.minY, maxX: box.maxX, maxY: box.maxY };
        let finalBox =
          tightenBoxToOpaque(data, sw, sh, grownWindow, TIGHTEN_ALPHA) ||
          tightenBoxToOpaque(data, sw, sh, grownWindow, TIGHTEN_FALLBACK_ALPHA);
        if (!finalBox && box.coreMaxX >= box.coreMinX && box.coreMaxY >= box.coreMinY) {
          finalBox = {
            minX: box.coreMinX, minY: box.coreMinY, maxX: box.coreMaxX, maxY: box.coreMaxY,
            area: box.area,
          };
        }
        if (!finalBox) {
          // No coherent garment even at the lowest connect threshold: signal
          // empty so the caller shows a placeholder, not misleading blank gold.
          console.info("[alpha-crop] no opaque garment, keeping original:", src);
          return;
        }
        box = finalBox;

        const { minX, minY, maxX, maxY } = box;

        /* Garment component genuinely fills the canvas → nothing to trim.
           Still publish the repaired canvas when holes were filled. */
        const coversWidth = maxX - minX + 1 >= sw * 0.98;
        const coversHeight = maxY - minY + 1 >= sh * 0.98;
        if (coversWidth && coversHeight) {
          if (holesFilled > 0 && !cancelled) {
            const dataUrl = full.toDataURL("image/png");
            cacheSet(src, dataUrl);
            setCropped(dataUrl);
          }
          return;
        }

        /* Map back to full-resolution coords with a small safety pad */
        const padScan = Math.max(1, Math.round(Math.max(maxX - minX, maxY - minY) * 0.03));
        const cx1 = Math.max(0, (minX - padScan) / scale);
        const cy1 = Math.max(0, (minY - padScan) / scale);
        const cx2 = Math.min(w, (maxX + padScan + 1) / scale);
        const cy2 = Math.min(h, (maxY + padScan + 1) / scale);
        const cw = Math.max(1, Math.round(cx2 - cx1));
        const ch = Math.max(1, Math.round(cy2 - cy1));

        const crop = document.createElement("canvas");
        crop.width = cw;
        crop.height = ch;
        crop
          .getContext("2d")
          .drawImage(full, Math.round(cx1), Math.round(cy1), cw, ch, 0, 0, cw, ch);

        const dataUrl = crop.toDataURL("image/png");
        cacheSet(src, dataUrl);
        if (!cancelled) setCropped(dataUrl);
      } catch (err) {
        /* Tainted canvas (CORS) or decode issue → keep the original image */
        console.warn("Alpha-crop skipped, using original asset:", err);
      }
    };

    probe.onerror = () => {
      /* the visible <img> onError handles the placeholder fallback */
    };
    probe.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  return cropped;
}

export default useAlphaCrop;