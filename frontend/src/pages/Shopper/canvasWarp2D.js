/**
 * FitFusion AI - KAN-116 Canvas 2D reference implementation.
 * 14 x 34 control vertices, no WebGL/PixiJS.
 * Every layer shares the exact SAME source grid and destination displacements.
 * Visual approximation only. Not an anatomical model or fit prediction.
 */
export const GRID_COLS = 14;
export const GRID_ROWS = 34;
export const REFERENCE_HEIGHT_CM = 164;

export const BODY_OPTIONS = {
  shoulders: ["Narrow", "Average", "Broad"],
  waist: ["Slim", "Average", "Curvy"],
  hips: ["Slim", "Average", "Wide"],
  thighs: ["Slim", "Average", "Thick"],
  cup: ["A", "B", "C", "D"],
};

export const SKIN_TONES = {
  Original: null,
  Fair: "#ebc9b5",
  Light: "#dcb293",
  Medium: "#b88668",
  Tan: "#9e694b",
  Deep: "#65432f",
};

const SILHOUETTES = ["A", "B", "C", "D", "E"];
export function selectSilhouette(weightKg, heightCm) {
  const safeHeight = Math.max(1, Number(heightCm) || REFERENCE_HEIGHT_CM);
  const referenceWeight = Number(weightKg) * (170 / safeHeight) ** 2;
  const index = referenceWeight < 55 ? 0 : referenceWeight < 75 ? 1 : referenceWeight < 95 ? 2 : referenceWeight < 120 ? 3 : 4;
  return { referenceWeight, letter: SILHOUETTES[index] };
}

export function imageToCanvas(image, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, width, height);
  return canvas;
}

/**
 * Detect the actual silhouette, not the blank margin of the exported PNG.
 * Perimeter pixels with alpha>=50 count as body, with noise rejected by row counts.
 * Results are in the same canvas coordinates used by all image layers.
 */
export function detectBodyBounds(canvas) {
  if (!canvas) return null;
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const { data } = ctx.getImageData(0, 0, w, h);
  const scanStep = Math.max(1, Math.floor(w / 450));
  const minPixels = Math.max(2, Math.floor(w / (250 * scanStep)));
  let left = w, right = -1, top = h, bottom = -1;
  const rows = [];
  for (let y = 0; y < h; y += scanStep) {
    let rowL = w, rowR = -1, count = 0;
    for (let x = 0; x < w; x += scanStep) {
      if (data[(y * w + x) * 4 + 3] < 50) continue;
      count++;
      rowL = Math.min(rowL, x);
      rowR = Math.max(rowR, x);
    }
    if (count < minPixels) continue;
    rows.push({ y, left: rowL, right: rowR });
    left = Math.min(left, rowL);
    right = Math.max(right, rowR);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  if (right < left || bottom <= top) return null;
  const width = Math.max(1, right - left);
  const height = Math.max(1, bottom - top);
  // The padded ROI protects the hands and garment overlays from being cropped.
  const xPad = Math.max(8, width * 0.20);
  const yPad = Math.max(5, height * 0.05);
  const roi = {
    x0: Math.max(0, left - xPad),
    x1: Math.min(w, right + xPad),
    y0: Math.max(0, top - yPad),
    y1: Math.min(h, bottom + yPad),
  };
  return {
    left, right, top, bottom, width, height,
    cx: (left + right) / 2,
    roi, rows,
  };
}

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const region = (t, center, radius) => {
  const u = Math.abs(t - center) / radius;
  return u >= 1 ? 0 : (1 - u * u) ** 2;
};

/**
 * Height uses the detected body from head to feet, moving the head as a rigid
 * block rather than changing its length. Foot pixel remains fixed.
 */
function heightShift(bodyT, fullHeight, requestedCm) {
  const delta = clamp((requestedCm - REFERENCE_HEIGHT_CM) / REFERENCE_HEIGHT_CM, -0.18, 0.34);
  const total = fullHeight * delta * 0.79;
  const legs = total * 0.61;
  const torso = total * 0.39;
  if (bodyT >= 1) return 0;
  if (bodyT >= 0.56) return -legs * (1 - bodyT) / 0.44;
  if (bodyT >= 0.14) return -legs - torso * (0.56 - bodyT) / 0.42;
  return -legs - torso; // head moves together, never stretches
}

/**
 * The local horizontal influence fades to zero outside the body envelope.
 * Vertical regions reference the detected body height, NOT entire PNG height.
 * Thus shoulders stop at the neck; the head does not deform sideways.
 */
export function makeLattice(width, height, bounds, config) {
  const { view, heightCm, shoulders, waist, hips, thighs, cup, strength = 1 } = config;
  const sign = (value, neg, pos) => value === pos ? 1 : value === neg ? -1 : 0;
  const s = sign(shoulders, "Narrow", "Broad");
  const w = sign(waist, "Slim", "Curvy");
  const h = sign(hips, "Slim", "Wide");
  const t = sign(thighs, "Slim", "Thick");
  const b = ({ A: -0.9, B: 0, C: 0.55, D: 1 })[cup] ?? 0;
  const roi = bounds.roi;
  const lattice = [];
  const sideAttenuation = view === "side" ? 0.42 : 1;
  for (let row = 0; row < GRID_ROWS; row++) {
    const sy = roi.y0 + ((roi.y1 - roi.y0) * row) / (GRID_ROWS - 1);
    const bodyT = (sy - bounds.top) / bounds.height;
    const shoulderInfluence = region(bodyT, 0.215, 0.097);
    const waistInfluence = region(bodyT, 0.435, 0.10);
    const hipInfluence = region(bodyT, 0.575, 0.102);
    const thighInfluence = region(bodyT, 0.715, 0.125);
    const chestInfluence = region(bodyT, 0.320, 0.088);
    const dxAmount =
      s * shoulderInfluence * 0.105 * sideAttenuation +
      w * waistInfluence * 0.093 * sideAttenuation +
      h * hipInfluence * 0.11 * sideAttenuation +
      t * thighInfluence * 0.09 * sideAttenuation +
      b * chestInfluence * 0.032 * (view === "side" ? 0 : 1);
    for (let col = 0; col < GRID_COLS; col++) {
      const sx = roi.x0 + ((roi.x1 - roi.x0) * col) / (GRID_COLS - 1);
      const xRelative = (sx - bounds.cx) / (bounds.width / 2);
      const xFalloff = Math.max(0, 1 - (Math.abs(xRelative) / 1.65) ** 2);
      let dx = bounds.width * dxAmount * xRelative * xFalloff * strength;
      if (view === "side") {
        // Chest variant render is recommended for production. This limited
        // localized displacement is only a quick experimental cup-size test.
        const facing = config.sideFacing === "right" ? 1 : -1;
        dx += facing * bounds.width * b * chestInfluence * 0.042 * xFalloff * strength;
      }
      const dy = heightShift(bodyT, bounds.height, heightCm);
      lattice.push({
        src: { x: sx, y: sy },
        dst: { x: sx + dx, y: sy + dy },
      });
    }
  }
  return { lattice };
}

function getAffine(a, b, c) {
  const [s0, s1, s2] = [a.src, b.src, c.src];
  const [d0, d1, d2] = [a.dst, b.dst, c.dst];
  const den = s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);
  if (Math.abs(den) < 1e-5) return null;
  const A = (d0.x * (s1.y - s2.y) + d1.x * (s2.y - s0.y) + d2.x * (s0.y - s1.y)) / den;
  const C = (d0.x * (s2.x - s1.x) + d1.x * (s0.x - s2.x) + d2.x * (s1.x - s0.x)) / den;
  const E = (d0.x * (s1.x * s2.y - s2.x * s1.y) + d1.x * (s2.x * s0.y - s0.x * s2.y) + d2.x * (s0.x * s1.y - s1.x * s0.y)) / den;
  const B = (d0.y * (s1.y - s2.y) + d1.y * (s2.y - s0.y) + d2.y * (s0.y - s1.y)) / den;
  const D = (d0.y * (s2.x - s1.x) + d1.y * (s0.x - s2.x) + d2.y * (s1.x - s0.x)) / den;
  const F = (d0.y * (s1.x * s2.y - s2.x * s1.y) + d1.y * (s2.x * s0.y - s0.x * s2.y) + d2.y * (s0.x * s1.y - s1.x * s0.y)) / den;
  return [A, B, C, D, E, F];
}

function drawTriangle(ctx, source, a, b, c) {
  const mat = getAffine(a, b, c);
  if (!mat) return;
  ctx.save();
  ctx.beginPath();
  const centroid = { x: (a.dst.x + b.dst.x + c.dst.x) / 3, y: (a.dst.y + b.dst.y + c.dst.y) / 3 };
  function edge(p) {
    const dx = p.x - centroid.x, dy = p.y - centroid.y;
    const norm = Math.hypot(dx, dy) || 1;
    return { x: p.x + 0.5 * dx / norm, y: p.y + 0.5 * dy / norm };
  }
  const p0 = edge(a.dst), p1 = edge(b.dst), p2 = edge(c.dst);
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.closePath();
  ctx.clip();
  ctx.transform(...mat);
  const sx = Math.max(0, Math.floor(Math.min(a.src.x, b.src.x, c.src.x) - 2));
  const sy = Math.max(0, Math.floor(Math.min(a.src.y, b.src.y, c.src.y) - 2));
  const ex = Math.min(source.width, Math.ceil(Math.max(a.src.x, b.src.x, c.src.x) + 2));
  const ey = Math.min(source.height, Math.ceil(Math.max(a.src.y, b.src.y, c.src.y) + 2));
  if (ex > sx && ey > sy) ctx.drawImage(source, sx, sy, ex - sx, ey - sy, sx, sy, ex - sx, ey - sy);
  ctx.restore();
}

export function renderLayer(ctx, source, mesh) {
  if (!source || !mesh) return;
  const { lattice } = mesh;
  for (let r = 0; r < GRID_ROWS - 1; r++) {
    for (let c = 0; c < GRID_COLS - 1; c++) {
      const k = r * GRID_COLS + c;
      const tl = lattice[k], tr = lattice[k + 1], bl = lattice[k + GRID_COLS], br = lattice[k + GRID_COLS + 1];
      drawTriangle(ctx, source, tl, tr, br);
      drawTriangle(ctx, source, tl, br, bl);
    }
  }
}

export function renderGrid(ctx, mesh, bounds) {
  if (!mesh) return;
  ctx.save();
  ctx.strokeStyle = "rgba(195, 128, 30, .65)";
  ctx.lineWidth = 1;
  for (let row = 0; row < GRID_ROWS; row++) {
    ctx.beginPath();
    for (let col = 0; col < GRID_COLS; col++) {
      const p = mesh.lattice[row * GRID_COLS + col].dst;
      if (col === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  for (let col = 0; col < GRID_COLS; col++) {
    ctx.beginPath();
    for (let row = 0; row < GRID_ROWS; row++) {
      const p = mesh.lattice[row * GRID_COLS + col].dst;
      if (row === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  // Draw landmark bars so developers can inspect the ACTUAL calibrated zones.
  const landmarkY = [0.215, 0.32, 0.435, 0.575, 0.715];
  const names = ["Shoulders", "Cup", "Waist", "Hips", "Thighs"];
  ctx.font = "11px Arial";
  ctx.fillStyle = "#9b6f2c";
  landmarkY.forEach((t, i) => {
    const y = bounds.top + t * bounds.height;
    ctx.fillText(names[i], Math.max(3, bounds.left - 95), y);
  });
  ctx.restore();
}

function rgb(hex) { return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); }
export function tintBody(source, tone, undertone) {
  if (!source || tone === "Original") return source;
  const canvas = document.createElement("canvas");
  canvas.width = source.width; canvas.height = source.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return source;
  ctx.drawImage(source, 0, 0);
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const [r0, g0, b0] = rgb(SKIN_TONES[tone] || SKIN_TONES.Fair);
  const offsets = undertone === "Warm" ? [6, 3, -7] : undertone === "Cool" ? [-4, 0, 9] : [0, 0, 0];
  for (let i = 0; i < frame.data.length; i += 4) {
    if (frame.data[i + 3] < 5) continue;
    const luma = (frame.data[i] * .2126 + frame.data[i + 1] * .7152 + frame.data[i + 2] * .0722) / 255;
    const brightness = clamp(0.75 + (luma - 0.5) * 0.65, 0.50, 1.08);
    frame.data[i] = clamp(Math.round((r0 + offsets[0]) * brightness), 0, 255);
    frame.data[i + 1] = clamp(Math.round((g0 + offsets[1]) * brightness), 0, 255);
    frame.data[i + 2] = clamp(Math.round((b0 + offsets[2]) * brightness), 0, 255);
  }
  ctx.putImageData(frame, 0, 0);
  return canvas;
}

/**
 * Draws a clearly labeled ILLUSTRATIVE piece for a real catalog item.
 * CatalogPage currently stores emoji + metadata, not three registered PNGs.
 * This is not a photo conversion, and cannot prove actual seller-photo fit.
 */
export function catalogIllustration(product, bounds, view, width, height) {
  if (!product || !bounds) return null;
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  const bw = bounds.width, bh = bounds.height;
  const cx = bounds.cx;
  const fy = (p) => bounds.top + bh * p;
  const fx = (p) => cx + bw * p;
  const isSide = view === "side";
  const originalColor = String(product.colors?.[0] || "Ivory").toLowerCase();
  const colors = {
    ivory: "#e4ddc8", beige: "#c6ad82", black: "#36302c", sand: "#baa183",
    brown: "#80604a", cream: "#e1ceac", gold: "#c5a447", blue: "#6b88aa",
    navy: "#3e5671", olive: "#75794e", white: "#ebebdf",
  };
  ctx.fillStyle = colors[originalColor] || "#c4a77b";
  ctx.strokeStyle = "rgba(48,32,17,.55)";
  ctx.lineWidth = Math.max(0.8, width / 750);
  ctx.lineJoin = "round";

  function poly(coords) {
    ctx.beginPath();
    coords.forEach(([x, y], i) => i ? ctx.lineTo(fx(x), fy(y)) : ctx.moveTo(fx(x), fy(y)));
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  const category = String(product.category || "Tops").toLowerCase();
  const sleeve = category.includes("outer") ? 0.10 : 0.06;
  if (category.includes("top") || category.includes("outer")) {
    if (isSide) {
      poly([[-0.19, .22], [0.15, .21], [0.21, .3], [0.17, .47], [-0.14, .47], [-0.20, .34]]);
    } else {
      poly([[-.21,.21],[-.34,.24],[-.36,.24+sleeve],[-.24,.33],[-.18,.46],[.18,.46],[.24,.33],[.36,.24+sleeve],[.34,.24],[.21,.21],[.12,.20],[-.12,.20]]);
    }
  } else if (category.includes("bottom")) {
    if (product.name.toLowerCase().includes("skirt")) {
      poly(isSide ? [[-.16,.48],[.17,.48],[.27,.70],[-.23,.70]] : [[-.18,.48],[.18,.48],[.34,.70],[-.34,.70]]);
    } else {
      poly(isSide ? [[-.18,.51],[.19,.51],[.19,.83],[-.09,.83],[-.07,.62],[-.17,.83],[-.29,.83]] : [[-.22,.51],[.22,.51],[.22,.6],[.12,.84],[.01,.84],[0,.64],[-.02,.84],[-.14,.84],[-.22,.6]]);
    }
  } else if (category.includes("dress")) {
    poly(isSide ? [[-.17,.22],[.17,.22],[.14,.49],[.31,.75],[-.26,.75],[-.13,.48]] : [[-.2,.21],[-.32,.24],[-.35,.31],[-.20,.34],[-.13,.47],[-.34,.76],[.34,.76],[.13,.47],[.2,.34],[.35,.31],[.32,.24],[.20,.21]]);
  } else {
    return null;
  }
  // Subtle seams identify this as illustration, not the real seller photo.
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = "#392818";
  ctx.beginPath();
  ctx.moveTo(fx(0), fy(category.includes("bottom") ? .52 : .24));
  ctx.lineTo(fx(0), fy(category.includes("bottom") ? .82 : .45));
  ctx.stroke(); ctx.restore();
  return canvas;
}
