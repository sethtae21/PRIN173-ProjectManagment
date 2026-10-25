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
   2. scanLargestComponentBox — crops to the largest connected opaque region
      so border rings / specks / haze can never stretch the crop box.
   Threshold ladder 128 → 64 → 24 (128 matches backend: alpha < 128 = bg).

   RESULT: the uneven transparent margins around the garment are trimmed, so
   whatever container centers the returned data-URL is centering the GARMENT,
   not the empty canvas padding.
========================================== */

const ALPHA_STEPS = [128, 64, 24];
const MIN_COMPONENT_AREA = 24; // px at scan scale; ignores dust

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
  const isTransparent = (i) => data[i * 4 + 3] <= ALPHA_STEPS[0];

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

function scanLargestComponentBox(data, sw, sh, threshold) {
  const total = sw * sh;
  const visited = new Uint8Array(total);
  const stack = new Int32Array(total);
  let bestArea = 0;
  let bestBox = null;

  for (let start = 0; start < total; start += 1) {
    if (visited[start] || data[start * 4 + 3] <= threshold) continue;

    let sp = 0;
    stack[sp++] = start;
    visited[start] = 1;

    let area = 0;
    let minX = sw;
    let minY = sh;
    let maxX = -1;
    let maxY = -1;

    while (sp > 0) {
      const idx = stack[--sp];
      const x = idx % sw;
      const y = (idx / sw) | 0;
      area += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      if (x > 0) {
        const n = idx - 1;
        if (!visited[n] && data[n * 4 + 3] > threshold) {
          visited[n] = 1;
          stack[sp++] = n;
        }
      }
      if (x < sw - 1) {
        const n = idx + 1;
        if (!visited[n] && data[n * 4 + 3] > threshold) {
          visited[n] = 1;
          stack[sp++] = n;
        }
      }
      if (y > 0) {
        const n = idx - sw;
        if (!visited[n] && data[n * 4 + 3] > threshold) {
          visited[n] = 1;
          stack[sp++] = n;
        }
      }
      if (y < sh - 1) {
        const n = idx + sw;
        if (!visited[n] && data[n * 4 + 3] > threshold) {
          visited[n] = 1;
          stack[sp++] = n;
        }
      }
    }

    if (area > bestArea) {
      bestArea = area;
      bestBox = { minX, minY, maxX, maxY, area };
    }
  }

  if (!bestBox || bestArea < MIN_COMPONENT_AREA) return null;
  return bestBox;
}

/**
 * Trims the transparent margins around a rembg cutout, repairs enclosed
 * holes, and returns a tightly cropped PNG data-URL so the garment (not the
 * canvas) is what gets centered and scaled inside its frame.
 * If the canvas is tainted (CORS) or anything else fails, returns null and
 * the caller keeps the original image — never broken.
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
        for (let i = 0; i < ALPHA_STEPS.length && !box; i += 1) {
          box = scanLargestComponentBox(data, sw, sh, ALPHA_STEPS[i]);
          if (box) usedThreshold = ALPHA_STEPS[i];
        }
        if (!box) {
          console.info("[alpha-crop] fully transparent canvas, keeping original:", src);
          return;
        }

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