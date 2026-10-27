
/**
 * FitFusion AI
 * Weight-responsive 2D Avatar Engine
 *
 * Supports:
 * - Female and Male Standard avatars
 * - Front, Side, Rear
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

  const view = String(
    config.view || "front"
  ).toLowerCase();

  const sideView = view === "side";

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

  // Height-aware weight index.
  // Used only for visual avatar proportions.
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

  // ========================================
  // MANUAL BODY CONTROLS
  // ========================================

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

  // ========================================
  // HEIGHT ADJUSTMENT
  // ========================================

  const desiredHeightShift =
    bounds.height *
    (heightCm / 164 - 1) *
    0.62;

  const heightShift = clamp(
    desiredHeightShift,
    -bounds.height * 0.16,
    Math.max(0, bounds.top - 12)
  );

  // ========================================
  // CANVAS SAFETY
  // ========================================

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

  // ========================================
  // BUILD DEFORMATION ROWS
  // ========================================

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

    // Smooth overlapping body regions.
    // No abrupt separation at shoulders.
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

    // Protect head and feet.
    const bodyFade =
      smoothstep(0.12, 0.23, t) *
      (
        1 -
        smoothstep(0.90, 1.01, t)
      );

    // ======================================
    // AUTOMATIC WEIGHT PROPORTIONS
    // ======================================

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

    // ======================================
    // MANUAL PROPORTION REFINEMENTS
    // ======================================

    const manualGrowth =
      shoulder * 0.055 * shoulderBand +
      waist * 0.07 * bellyBand +
      hips * 0.075 * hipBand +
      thighs * 0.065 * thighBand +
      cup *
        (sideView ? 0.065 : 0.025) *
        chestBand;

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

    // Expand the entire body continuously.
    // Arms move outward with the torso.
    const growth = Math.min(
      requestedGrowth,
      Math.max(
        0,
        maxExpansion * 0.96
      )
    );

    // Keep feet anchored.
    const dy =
      -heightShift *
      (
        1 -
        smoothstep(0.13, 1, t)
      );

    const rowPoints = [];

    // ======================================
    // BUILD HORIZONTAL CONTROL POINTS
    // ======================================

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

      // Whole-body scaling keeps shoulder
      // and upper-arm pixels connected.
      const scale =
        1 +
        growth *
          (sideView ? 0.82 : 1);

      let dx =
        (sx - bounds.cx) *
        (scale - 1);

      // ====================================
      // FRONT / REAR BELLY AND HIP SHAPE
      // ====================================

      if (!sideView) {
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
      } else {
        // ==================================
        // SIDE-VIEW BODY PROJECTION
        // ==================================

        const facing =
          config.sideFacing === "right"
            ? 1
            : -1;

        dx +=
          facing *
          halfWidth *
          (
            positive *
              0.12 *
              bellyBand +
            positive *
              0.045 *
              chestBand +
            Math.max(0, waist) *
              0.035 *
              bellyBand
          ) *
          gaussian(
            nx,
            0,
            0.62
          ) *
          bodyFade *
          strength;
      }

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

    // ======================================
    // PREVENT FOLDED MESH / BROKEN ARMS
    // ======================================

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

  const src = sourceCtx.getImageData(
    0,
    0,
    width,
    height
  ).data;

  const out = ctx.createImageData(
    width,
    height
  );

  const dst = out.data;
  const points = mesh.lattice;

  // ========================================
  // INVERSE PIXEL MAPPING
  // ========================================

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

    // ======================================
    // SAMPLE HORIZONTAL PIXELS
    // ======================================

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

      // ====================================
      // BILINEAR PIXEL SAMPLING
      // ====================================

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

  // Use an offscreen canvas so transparent
  // clothing layers composite correctly.
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
// CLOTHING ILLUSTRATIONS
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

  const side =
    String(view).toLowerCase() ===
    "side";

  if (
    category.includes("top") ||
    category.includes("outer")
  ) {
    poly(
      side
        ? [
            [-0.19, 0.22],
            [0.15, 0.21],
            [0.21, 0.30],
            [0.17, 0.47],
            [-0.14, 0.47],
            [-0.20, 0.34],
          ]
        : [
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
          ]
    );
  } else if (
    category.includes("bottom")
  ) {
    if (name.includes("skirt")) {
      poly(
        side
          ? [
              [-0.16, 0.48],
              [0.17, 0.48],
              [0.27, 0.70],
              [-0.23, 0.70],
            ]
          : [
              [-0.18, 0.48],
              [0.18, 0.48],
              [0.34, 0.70],
              [-0.34, 0.70],
            ]
      );
    } else {
      poly(
        side
          ? [
              [-0.18, 0.51],
              [0.19, 0.51],
              [0.19, 0.83],
              [-0.09, 0.83],
              [-0.07, 0.62],
              [-0.17, 0.83],
              [-0.29, 0.83],
            ]
          : [
              [-0.22, 0.51],
              [0.22, 0.51],
              [0.22, 0.60],
              [0.12, 0.84],
              [0.01, 0.84],
              [0, 0.64],
              [-0.02, 0.84],
              [-0.14, 0.84],
              [-0.22, 0.60],
            ]
      );
    }
  } else if (
    category.includes("dress")
  ) {
    poly(
      side
        ? [
            [-0.17, 0.22],
            [0.17, 0.22],
            [0.14, 0.49],
            [0.31, 0.75],
            [-0.26, 0.75],
            [-0.13, 0.48],
          ]
        : [
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
          ]
    );
  } else if (
    category.includes("footwear") ||
    category.includes("shoe")
  ) {
    if (side) {
      poly([
        [-0.18, 0.955],
        [-0.03, 0.955],
        [0.10, 0.972],
        [0.12, 0.995],
        [-0.20, 0.995],
      ]);

      poly([
        [0.03, 0.955],
        [0.18, 0.955],
        [0.28, 0.975],
        [0.28, 0.995],
        [0, 0.995],
      ]);
    } else {
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
    }
  } else {
    return null;
  }

  return canvas;
}
