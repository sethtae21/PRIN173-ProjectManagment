/**
 * FitFusion AI
 * Weight-responsive 2D Avatar Engine
 *
 * Supports:
 * - Female and Male Standard avatars
 * - Front, Rear (Side view removed)
 * - Height and weight
 * - Shoulders, waist, hips, thighs
 * - Female cup size
 * - Skin tone and undertone
 * - Clothing overlays
 *
 * IMPORTANT:
 * The whole avatar uses ONE continuous mesh.
 * Arms are never separated from shoulders.
 */

export const GRID_COLS = 37;
export const GRID_ROWS = 65;
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

// ==========================================
// UTILITIES
// ==========================================

const clamp = (x, min, max) =>
  Math.max(min, Math.min(max, x));

const lerp = (a, b, t) =>
  a + (b - a) * t;

const smoothstep = (a, b, x) => {
  const t = clamp(
    (x - a) / (b - a || 1),
    0,
    1
  );

  return t * t * (3 - 2 * t);
};

const gaussian = (x, center, width) => {
  const z = (x - center) / width;

  return Math.exp(-0.5 * z * z);
};

const option = (value, low, high) => {
  const s = String(value || "").toLowerCase();

  if (s === low.toLowerCase()) return -1;
  if (s === high.toLowerCase()) return 1;

  return 0;
};

function newCanvas(width, height) {
  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  return canvas;
}

// ==========================================
// SILHOUETTE SELECTION
// ==========================================

export function selectSilhouette(
  weightKg,
  heightCm
) {
  const height = clamp(
    Number(heightCm) || 164,
    120,
    218
  );

  const weight = clamp(
    Number(weightKg) || 58,
    30,
    200
  );

  const referenceWeight =
    weight * (170 / height) ** 2;

  const letter =
    referenceWeight < 55
      ? "A"
      : referenceWeight < 75
        ? "B"
        : referenceWeight < 95
          ? "C"
          : referenceWeight < 120
            ? "D"
            : "E";

  return {
    letter,
    referenceWeight,
  };
}

// ==========================================
// IMAGE TO CANVAS
// ==========================================

export function imageToCanvas(
  image,
  width,
  height
) {
  if (!image) return null;

  const canvas = newCanvas(width, height);

  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    image,
    0,
    0,
    width,
    height
  );

  return canvas;
}

// ==========================================
// DETECT AVATAR BOUNDS
// ==========================================

export function detectBodyBounds(canvas) {
  if (!canvas) return null;

  const { width, height } = canvas;

  const ctx = canvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (!ctx) return null;

  const pixels = ctx.getImageData(
    0,
    0,
    width,
    height
  ).data;

  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;

  const rows = [];

  for (let y = 0; y < height; y++) {
    let rowLeft = width;
    let rowRight = -1;

    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;

      if (pixels[index + 3] < 45) {
        continue;
      }

      rowLeft = Math.min(rowLeft, x);
      rowRight = Math.max(rowRight, x);
    }

    if (rowRight < rowLeft) {
      continue;
    }

    rows.push({
      y,
      left: rowLeft,
      right: rowRight,
    });

    left = Math.min(left, rowLeft);
    right = Math.max(right, rowRight);

    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }

  if (right <= left || bottom <= top) {
    return null;
  }

  return {
    left,
    right,
    top,
    bottom,
    rows,

    width: right - left,
    height: bottom - top,

    cx: (left + right) / 2,

    roi: {
      x0: 0,
      x1: width - 1,
      y0: 0,
      y1: height - 1,
    },
  };
}

// ==========================================
// CONTINUOUS BODY DEFORMATION
// ==========================================

export function makeLattice(
  width,
  height,
  bounds,
  config = {}
) {
  if (!bounds) {
    return { lattice: [] };
  }

  const gender =
    String(config.gender).toLowerCase() === "male"
      ? "male"
      : "female";

  const heightCm = clamp(
    Number(config.heightCm) || 164,
    120,
    218
  );

  const weightKg = clamp(
    Number(config.weightKg) ||
      (gender === "male" ? 70 : 58),
    30,
    200
  );

  const baseline =
    gender === "male" ? 70 : 58;

  const referenceWeight =
    weightKg * (164 / heightCm) ** 2;

  const weightChange = clamp(
    Math.log(
      Math.max(1, referenceWeight) / baseline
    ) / Math.log(200 / baseline),
    -0.9,
    1.35
  );

  const positive = Math.max(
    0,
    weightChange
  );

  const negative = Math.min(
    0,
    weightChange
  );

  const shoulder = option(
    config.shoulders,
    "Narrow",
    "Broad"
  );

  const waist = option(
    config.waist,
    "Slim",
    "Curvy"
  );

  const hips = option(
    config.hips,
    "Slim",
    "Wide"
  );

  const thighs = option(
    config.thighs,
    "Slim",
    "Thick"
  );

  const cup =
    gender === "female"
      ? ({
          A: -0.8,
          B: 0,
          C: 0.55,
          D: 1,
        }[
          String(
            config.cup || "B"
          ).toUpperCase()
        ] ?? 0)
      : 0;

  const strength = clamp(
    Number(config.strength ?? 1),
    0,
    1
  );

  const desiredHeightShift =
    bounds.height *
    (heightCm / 164 - 1) *
    0.62;

  const heightShift = clamp(
    desiredHeightShift,
    -bounds.height * 0.16,
    Math.max(0, bounds.top - 12)
  );

  const halfWidth = Math.max(
    1,
    bounds.width / 2
  );

  const leftRoom = Math.max(
    10,
    bounds.left - 8
  );

  const rightRoom = Math.max(
    10,
    width - bounds.right - 8
  );

  const maxExpansion =
    Math.min(leftRoom, rightRoom) /
    halfWidth;

  const lattice = [];

  for (
    let row = 0;
    row < GRID_ROWS;
    row++
  ) {
    const sy =
      ((height - 1) * row) /
      (GRID_ROWS - 1);

    const t =
      (sy - bounds.top) /
      Math.max(1, bounds.height);

    const shoulderBand = gaussian(
      t,
      0.245,
      0.095
    );

    const chestBand = gaussian(
      t,
      0.335,
      0.105
    );

    const bellyBand = gaussian(
      t,
      0.465,
      0.115
    );

    const hipBand = gaussian(
      t,
      0.585,
      0.105
    );

    const thighBand = gaussian(
      t,
      0.705,
      0.105
    );

    const calfBand = gaussian(
      t,
      0.845,
      0.075
    );

    const bodyFade =
      smoothstep(0.12, 0.23, t) *
      (
        1 -
        smoothstep(0.90, 1.01, t)
      );

    const weightGrowth =
      positive *
        (
          0.14 * shoulderBand +
          0.22 * chestBand +
          0.46 * bellyBand +
          0.35 * hipBand +
          0.26 * thighBand +
          0.13 * calfBand
        ) +
      negative *
        (
          0.10 * shoulderBand +
          0.18 * chestBand +
          0.30 * bellyBand +
          0.23 * hipBand +
          0.17 * thighBand +
          0.08 * calfBand
        );

    // FIX: Removed side-view multipliers
    const manualGrowth =
      shoulder * 0.055 * shoulderBand +
      waist * 0.07 * bellyBand +
      hips * 0.075 * hipBand +
      thighs * 0.065 * thighBand +
      cup * 0.025 * chestBand;

    const requestedGrowth = clamp(
      (
        weightGrowth +
        manualGrowth
      ) *
        bodyFade *
        strength,
      -0.24,
      0.72
    );

    const growth = Math.min(
      requestedGrowth,
      Math.max(
        0,
        maxExpansion * 0.96
      )
    );

    const dy =
      -heightShift *
      (
        1 -
        smoothstep(0.13, 1, t)
      );

    const rowPoints = [];

    for (
      let col = 0;
      col < GRID_COLS;
      col++
    ) {
      const sx =
        ((width - 1) * col) /
        (GRID_COLS - 1);

      const nx =
        (sx - bounds.cx) /
        halfWidth;

      const absX = Math.abs(nx);

      // FIX: Removed side-view scaling
      const scale = 1 + growth;

      let dx =
        (sx - bounds.cx) *
        (scale - 1);

      // FRONT / REAR BELLY AND HIP SHAPE
      const localBelly =
        positive *
          0.17 *
          bellyBand +
        Math.max(0, waist) *
          0.025 *
          bellyBand;

      const localHips =
        positive *
        0.09 *
        hipBand;

      dx +=
        Math.tanh(nx * 5) *
        halfWidth *
        (
          localBelly +
          localHips
        ) *
        gaussian(
          absX,
          0.38,
          0.32
        ) *
        bodyFade *
        strength;

      rowPoints.push({
        src: {
          x: sx,
          y: sy,
        },

        dst: {
          x: sx + dx,
          y: sy + dy,
        },
      });
    }

    for (
      let col = 1;
      col < rowPoints.length;
      col++
    ) {
      const previous =
        rowPoints[col - 1];

      const current =
        rowPoints[col];

      const minimum =
        previous.dst.x +
        (
          current.src.x -
          previous.src.x
        ) *
          0.24;

      current.dst.x = Math.max(
        current.dst.x,
        minimum
      );
    }

    lattice.push(...rowPoints);
  }

  return {
    lattice,
    weightChange,
    referenceWeight,
    heightCm,
  };
}

// ==========================================
// SMOOTH CANVAS RENDERING
// ==========================================

export function renderLayer(
  ctx,
  source,
  mesh
) {
  if (
    !ctx ||
    !source ||
    !mesh?.lattice?.length
  ) {
    return;
  }

  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  const sourceCtx = source.getContext(
    "2d",
    {
      willReadFrequently: true,
    }
  );

  if (!sourceCtx) return;

  let src;

  try {
    src = sourceCtx.getImageData(
      0,
      0,
      width,
      height
    ).data;
  } catch {
    // FIX (SecurityError guard): a tainted layer (legacy cross-origin
    // media URL) must never abort the whole avatar render. Draw it
    // unwarped instead of failing.
    ctx.drawImage(source, 0, 0);
    return;
  }

  const out = ctx.createImageData(
    width,
    height
  );

  const dst = out.data;
  const points = mesh.lattice;

  for (
    let y = 0;
    y < height;
    y++
  ) {
    const py = y + 0.5;

    if (
      py < points[0].dst.y ||
      py >
        points[
          (GRID_ROWS - 1) *
            GRID_COLS
        ].dst.y
    ) {
      continue;
    }

    let low = 0;
    let high = GRID_ROWS - 1;

    while (high - low > 1) {
      const mid =
        (low + high) >> 1;

      if (
        points[
          mid * GRID_COLS
        ].dst.y <= py
      ) {
        low = mid;
      } else {
        high = mid;
      }
    }

    const top = low * GRID_COLS;
    const bottom = high * GRID_COLS;

    const y0 = points[top].dst.y;
    const y1 = points[bottom].dst.y;

    const fy = clamp(
      (py - y0) /
        Math.max(
          0.00001,
          y1 - y0
        ),
      0,
      1
    );

    const sy = lerp(
      points[top].src.y,
      points[bottom].src.y,
      fy
    );

    const xDest = new Float32Array(
      GRID_COLS
    );

    for (
      let c = 0;
      c < GRID_COLS;
      c++
    ) {
      xDest[c] = lerp(
        points[top + c].dst.x,
        points[bottom + c].dst.x,
        fy
      );
    }

    for (
      let x = 0;
      x < width;
      x++
    ) {
      const px = x + 0.5;

      if (
        px < xDest[0] ||
        px > xDest[GRID_COLS - 1]
      ) {
        continue;
      }

      let a = 0;
      let b = GRID_COLS - 1;

      while (b - a > 1) {
        const mid = (a + b) >> 1;

        if (xDest[mid] <= px) {
          a = mid;
        } else {
          b = mid;
        }
      }

      const fx = clamp(
        (px - xDest[a]) /
          Math.max(
            0.00001,
            xDest[b] -
              xDest[a]
          ),
        0,
        1
      );

      const sx = lerp(
        points[top + a].src.x,
        points[top + b].src.x,
        fx
      );

      if (
        sx < 0 ||
        sy < 0 ||
        sx >= width - 1 ||
        sy >= height - 1
      ) {
        continue;
      }

      const u = clamp(
        sx - 0.5,
        0,
        width - 1
      );

      const v = clamp(
        sy - 0.5,
        0,
        height - 1
      );

      const ix = Math.floor(u);
      const iy = Math.floor(v);

      const jx = Math.min(
        width - 1,
        ix + 1
      );

      const jy = Math.min(
        height - 1,
        iy + 1
      );

      const tx = u - ix;
      const ty = v - iy;

      const indices = [
        (iy * width + ix) * 4,
        (iy * width + jx) * 4,
        (jy * width + ix) * 4,
        (jy * width + jx) * 4,
      ];

      const weights = [
        (1 - tx) * (1 - ty),
        tx * (1 - ty),
        (1 - tx) * ty,
        tx * ty,
      ];

      let alpha = 0;
      let red = 0;
      let green = 0;
      let blue = 0;

      for (
        let k = 0;
        k < 4;
        k++
      ) {
        const index = indices[k];

        const opacity =
          (src[index + 3] / 255) *
          weights[k];

        alpha += opacity;

        red +=
          src[index] *
          opacity;

        green +=
          src[index + 1] *
          opacity;

        blue +=
          src[index + 2] *
          opacity;
      }

      if (alpha <= 0.0001) {
        continue;
      }

      const dest =
        (y * width + x) * 4;

      dst[dest] =
        red / alpha;

      dst[dest + 1] =
        green / alpha;

      dst[dest + 2] =
        blue / alpha;

      dst[dest + 3] =
        alpha * 255;
    }
  }

  const layer = newCanvas(
    width,
    height
  );

  layer
    .getContext("2d")
    .putImageData(
      out,
      0,
      0
    );

  ctx.drawImage(
    layer,
    0,
    0
  );
}

// ==========================================
// OPTIONAL DEBUG GRID
// ==========================================

export function renderGrid(
  ctx,
  mesh
) {
  if (
    !ctx ||
    !mesh?.lattice?.length
  ) {
    return;
  }

  ctx.save();

  ctx.strokeStyle =
    "rgba(172,112,28,0.45)";

  ctx.lineWidth = 0.7;

  for (
    let row = 0;
    row < GRID_ROWS;
    row++
  ) {
    ctx.beginPath();

    for (
      let col = 0;
      col < GRID_COLS;
      col++
    ) {
      const p =
        mesh.lattice[
          row * GRID_COLS +
            col
        ].dst;

      if (col === 0) {
        ctx.moveTo(
          p.x,
          p.y
        );
      } else {
        ctx.lineTo(
          p.x,
          p.y
        );
      }
    }

    ctx.stroke();
  }

  ctx.restore();
}

// ==========================================
// SKIN TONE
// ==========================================

export function tintBody(
  source,
  tone,
  undertone = "Neutral"
) {
  if (
    !source ||
    tone == null ||
    tone === "Original"
  ) {
    return source;
  }

  const hex =
    typeof tone === "string" &&
    /^#[0-9a-f]{6}$/i.test(tone)
      ? tone
      : (
          SKIN_TONES[tone] ||
          SKIN_TONES.Fair
        );

  const rgb = [1, 3, 5].map(
    (i) =>
      parseInt(
        hex.slice(i, i + 2),
        16
      )
  );

  const offset =
    String(undertone).toLowerCase() ===
    "warm"
      ? [5, 2, -4]
      : String(
          undertone
        ).toLowerCase() === "cool"
        ? [-3, 0, 6]
        : [0, 0, 0];

  const canvas = newCanvas(
    source.width,
    source.height
  );

  const ctx = canvas.getContext(
    "2d",
    {
      willReadFrequently: true,
    }
  );

  ctx.drawImage(
    source,
    0,
    0
  );

  const frame = ctx.getImageData(
    0,
    0,
    canvas.width,
    canvas.height
  );

  const data = frame.data;

  let total = 0;
  let count = 0;

  for (
    let i = 0;
    i < data.length;
    i += 4
  ) {
    if (data[i + 3] < 45) {
      continue;
    }

    total +=
      (
        data[i] * 0.21 +
        data[i + 1] * 0.72 +
        data[i + 2] * 0.07
      ) /
      255;

    count++;
  }

  if (!count) {
    return canvas;
  }

  const average =
    total / count;

  for (
    let i = 0;
    i < data.length;
    i += 4
  ) {
    if (data[i + 3] < 5) {
      continue;
    }

    const luminance =
      (
        data[i] * 0.21 +
        data[i + 1] * 0.72 +
        data[i + 2] * 0.07
      ) /
      255;

    const light = clamp(
      1 +
        (
          luminance -
          average
        ) *
          0.95,
      0.67,
      1.23
    );

    for (
      let k = 0;
      k < 3;
      k++
    ) {
      data[i + k] = clamp(
        (
          rgb[k] +
          offset[k]
        ) *
          light,
        0,
        255
      );
    }
  }

  ctx.putImageData(
    frame,
    0,
    0
  );

  return canvas;
}

// ==========================================
// GARMENT IMAGE LAYERS (REAL CATALOG IMAGES)
//
// FIX (try-on integration): equipped items now render their actual
// rembg-processed PNG (transparent background) instead of only the flat
// color polygons. The image is loaded asynchronously (cached), its
// transparent margins are auto-cropped via the alpha bounding box, and the
// cropped garment is stretched onto the anatomical region of its category
// (torso / legs / feet) in body coordinates, so the existing lattice warp
// deforms it together with the avatar. catalogIllustration() remains the
// fallback while the image is loading or when it is missing/unreadable.
// ==========================================

const garmentImageCache = new Map();
const garmentCropCache = new Map();

// FIX (SecurityError taint): force SAME-ORIGIN media loads. Items persisted
// in sessionStorage / saved outfits / pending-item flow may still carry
// absolute http://127.0.0.1:8000/media/... URLs from before the dev proxy
// existed; drawing cross-origin images taints the layer canvas and makes
// renderLayer()'s getImageData throw. Stripping the origin routes every
// load through the same-origin proxy (Vite dev proxy / staging proxy).
function sameOriginMedia(src) {
  const raw = String(src || "");

  if (!raw) return "";
  if (raw.startsWith("/")) return raw;

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      return url.pathname + url.search;
    } catch {
      return raw;
    }
  }

  return raw;
}

// Anatomical regions in bounds-relative coordinates (same system as the
// polygon illustrations): X(p) = cx + width*p, Y(p) = top + height*p.
const GARMENT_REGIONS = {
  tops: { x0: -0.36, x1: 0.36, y0: 0.185, y1: 0.47 },
  outerwear: { x0: -0.38, x1: 0.38, y0: 0.185, y1: 0.52 },
  bottoms: { x0: -0.23, x1: 0.23, y0: 0.47, y1: 0.86 },
  skirt: { x0: -0.34, x1: 0.34, y0: 0.47, y1: 0.72 },
  dresses: { x0: -0.35, x1: 0.35, y0: 0.185, y1: 0.78 },
  footwear: { x0: -0.26, x1: 0.26, y0: 0.93, y1: 1.0 },
};

function cropTransparentCanvas(image) {
  const w = image.naturalWidth || image.width;
  const h = image.naturalHeight || image.height;

  if (!w || !h) return null;

  const scale = Math.min(1, 256 / Math.max(w, h));
  const sw = Math.max(1, Math.round(w * scale));
  const sh = Math.max(1, Math.round(h * scale));

  const probe = newCanvas(sw, sh);
  const pctx = probe.getContext("2d", {
    willReadFrequently: true,
  });

  if (!pctx) return imageToCanvas(image, w, h);

  pctx.drawImage(image, 0, 0, sw, sh);

  let data;

  try {
    data = pctx.getImageData(0, 0, sw, sh).data;
  } catch {
    // Tainted canvas (cross-origin media): keep the full image.
    return imageToCanvas(image, w, h);
  }

  let minX = sw;
  let minY = sh;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < sh; y += 1) {
    for (let x = 0; x < sw; x += 1) {
      if (data[(y * sw + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return imageToCanvas(image, w, h);
  }

  const inv = 1 / scale;
  const pad = Math.round(Math.max(2, (maxX - minX) * 0.04));

  const sx = Math.max(0, Math.floor((minX - pad) * inv));
  const sy = Math.max(0, Math.floor((minY - pad) * inv));
  const ex = Math.min(w, Math.ceil((maxX + pad) * inv));
  const ey = Math.min(h, Math.ceil((maxY + pad) * inv));

  const cw = ex - sx;
  const ch = ey - sy;

  if (cw <= 0 || ch <= 0) {
    return imageToCanvas(image, w, h);
  }

  const out = newCanvas(cw, ch);
  out
    .getContext("2d")
    .drawImage(image, sx, sy, cw, ch, 0, 0, cw, ch);

  return out;
}

// Start (or reuse) loading + cropping of a garment image.
export function preloadGarmentImage(src) {
  if (!src) return Promise.resolve(null);

  if (!garmentImageCache.has(src)) {
    const sameOrigin = sameOriginMedia(src);

    const promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error(`Missing garment image: ${sameOrigin}`));
      image.src = sameOrigin;
    })
      .then((image) => {
        const cropped = cropTransparentCanvas(image);
        garmentCropCache.set(src, cropped);
        return cropped;
      })
      .catch((error) => {
        garmentCropCache.set(src, null);
        throw error;
      });

    garmentImageCache.set(src, promise);

    promise.catch(() => {
      garmentImageCache.delete(src);
    });
  }

  return garmentImageCache.get(src);
}

// Synchronous peek: returns the cropped canvas if already loaded.
export function peekCroppedGarment(src) {
  if (!src) return null;
  return garmentCropCache.get(src) || null;
}

function regionForProduct(product) {
  const category = String(
    product.category || "Tops"
  ).toLowerCase();

  const name = String(product.name || "").toLowerCase();

  if (
    category.includes("footwear") ||
    category.includes("shoe")
  ) {
    return GARMENT_REGIONS.footwear;
  }

  if (category.includes("dress")) {
    return GARMENT_REGIONS.dresses;
  }

  if (category.includes("outer")) {
    return GARMENT_REGIONS.outerwear;
  }

  if (category.includes("bottom")) {
    return name.includes("skirt")
      ? GARMENT_REGIONS.skirt
      : GARMENT_REGIONS.bottoms;
  }

  return GARMENT_REGIONS.tops;
}

// Builds a WIDTHxHEIGHT layer canvas with the real garment image stretched
// onto its anatomical region, ready for renderLayer(). Returns null when
// the image is not ready yet (caller falls back to catalogIllustration).
export function garmentImageLayer(
  product,
  bounds,
  view,
  width,
  height
) {
  if (!product || !bounds) return null;

  const src =
    product.image ||
    product.front_image ||
    "";

  const cropped = peekCroppedGarment(src);

  if (!cropped) return null;

  const region = regionForProduct(product);

  const X = (p) => bounds.cx + bounds.width * p;
  const Y = (p) => bounds.top + bounds.height * p;

  const rx = X(region.x0);
  const rw = X(region.x1) - rx;
  const ry = Y(region.y0);
  const rh = Y(region.y1) - ry;

  if (rw <= 0 || rh <= 0) return null;

  const canvas = newCanvas(width, height);
  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Stretch-to-region: the garment conforms to the wearer's body region,
  // exactly like the polygon fallbacks do.
  ctx.drawImage(cropped, rx, ry, rw, rh);

  return canvas;
}

// ==========================================
// CLOTHING ILLUSTRATIONS (FALLBACK)
// ==========================================

export function catalogIllustration(
  product,
  bounds,
  view,
  width,
  height
) {
  if (
    !product ||
    !bounds
  ) {
    return null;
  }

  const canvas = newCanvas(
    width,
    height
  );

  const ctx = canvas.getContext("2d");

  const colors = {
    ivory: "#e4ddc8",
    beige: "#c6ad82",
    black: "#36302c",
    sand: "#baa183",
    brown: "#80604a",
    cream: "#e1ceac",
    gold: "#c5a447",
    blue: "#6b88aa",
    navy: "#3e5671",
    olive: "#75794e",
    white: "#ebebdf",
    charcoal: "#4a494b",
    red: "#ae554e",
    pink: "#d69ca5",
    green: "#788b68",
  };

  const color = String(
    product.colors?.[0] ||
      product.color ||
      "Ivory"
  ).toLowerCase();

  ctx.fillStyle =
    colors[color] ||
    (
      color.startsWith("#")
        ? color
        : "#c4a77b"
    );

  ctx.strokeStyle =
    "rgba(48,32,17,0.55)";

  ctx.lineWidth = 1;
  ctx.lineJoin = "round";

  const X = (p) =>
    bounds.cx +
    bounds.width * p;

  const Y = (p) =>
    bounds.top +
    bounds.height * p;

  const poly = (points) => {
    ctx.beginPath();

    points.forEach(
      ([x, y], i) => {
        if (i) {
          ctx.lineTo(
            X(x),
            Y(y)
          );
        } else {
          ctx.moveTo(
            X(x),
            Y(y)
          );
        }
      }
    );

    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  const category = String(
    product.category || "Tops"
  ).toLowerCase();

  const name = String(
    product.name || ""
  ).toLowerCase();

  // FIX: Removed all Side-view branches. Only Front/Rear polygons remain.
  if (
    category.includes("top") ||
    category.includes("outer")
  ) {
    poly([
      [-0.21, 0.21],
      [-0.34, 0.24],
      [-0.36, 0.32],
      [-0.24, 0.33],
      [-0.18, 0.46],
      [0.18, 0.46],
      [0.24, 0.33],
      [0.36, 0.32],
      [0.34, 0.24],
      [0.21, 0.21],
      [0.12, 0.20],
      [-0.12, 0.20],
    ]);
  } else if (
    category.includes("bottom")
  ) {
    if (name.includes("skirt")) {
      poly([
        [-0.18, 0.48],
        [0.18, 0.48],
        [0.34, 0.70],
        [-0.34, 0.70],
      ]);
    } else {
      poly([
        [-0.22, 0.51],
        [0.22, 0.51],
        [0.22, 0.60],
        [0.12, 0.84],
        [0.01, 0.84],
        [0, 0.64],
        [-0.02, 0.84],
        [-0.14, 0.84],
        [-0.22, 0.60],
      ]);
    }
  } else if (
    category.includes("dress")
  ) {
    poly([
      [-0.20, 0.21],
      [-0.32, 0.24],
      [-0.35, 0.31],
      [-0.20, 0.34],
      [-0.13, 0.47],
      [-0.34, 0.76],
      [0.34, 0.76],
      [0.13, 0.47],
      [0.20, 0.34],
      [0.35, 0.31],
      [0.32, 0.24],
      [0.20, 0.21],
    ]);
  } else if (
    category.includes("footwear") ||
    category.includes("shoe")
  ) {
    poly([
      [-0.20, 0.955],
      [-0.04, 0.955],
      [-0.03, 0.995],
      [-0.24, 0.995],
    ]);

    poly([
      [0.04, 0.955],
      [0.20, 0.955],
      [0.24, 0.995],
      [0.03, 0.995],
    ]);
  } else {
    return null;
  }

  return canvas;
}