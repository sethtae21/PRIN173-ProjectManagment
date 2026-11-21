---
id: formula-avatar-crop-normalization
title: Avatar normalization and alpha union-crop thresholds
category: formula
status: draft
source_of_truth: [Frontend/src/pages/Shopper/AvatarCanvas.jsx, Frontend/src/pages/Shopper/canvasWarp2D.js]
related: [docs-kb-formulas-index, formula-canvas-body-bounds, formula-canvas-alpha-crop-hook]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Purpose

Record the current avatar bounds-normalization constants and the nearby garment union-crop implementation. TODO: the requested union-crop thresholds are not in `AvatarCanvas.jsx`; that file's current working-tree change contains avatar sizing, while `canvasWarp2D.js` contains the garment crop helper. The avatar file is modified locally and its present contents are not represented by `source_sha`. ([`AvatarCanvas.jsx:L78-L169`](../../../../Frontend/src/pages/Shopper/AvatarCanvas.jsx#L78); [`canvasWarp2D.js:L1184-L1188`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L1184); [`canvasWarp2D.js:L1265-L1445`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L1265))

## Formula

Avatar normalization first detects body bounds, then targets height `0.72 × canvas height`; target width is the smaller of `0.70 × canvas width` and the bounds aspect ratio times target height. It horizontally centers the result and positions its bottom at `0.96 × canvas height`. Separately, garment crop scans at scale `min(1,256/max(width,height))`, marks alpha above 96 as opaque, and unions every 4-connected component with area at least `max(16, scanPixels × 0.005)`. If no significant component exists, it tries alpha thresholds `[128,64,32,12]`; final padding is `max(2, round(3% of union-box width))`. ([`AvatarCanvas.jsx:L79-L169`](../../../../Frontend/src/pages/Shopper/AvatarCanvas.jsx#L79); [`canvasWarp2D.js:L1184-L1188`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L1184); [`canvasWarp2D.js:L1265-L1445`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L1265))

## Inputs

Avatar image and fixed 320×640 preview canvas; garment image and its natural dimensions for the separate union-crop helper. ([`AvatarCanvas.jsx:L14-L15`](../../../../Frontend/src/pages/Shopper/AvatarCanvas.jsx#L14); [`AvatarCanvas.jsx:L79-L169`](../../../../Frontend/src/pages/Shopper/AvatarCanvas.jsx#L79); [`canvasWarp2D.js:L1265-L1295`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L1265))

## Outputs

Avatar preparation returns the preview unchanged if no body bounds/context is available, otherwise returns a normalized 320×640 canvas. The garment helper returns a cropped canvas or falls back to the full image when no crop box is available. ([`AvatarCanvas.jsx:L79-L169`](../../../../Frontend/src/pages/Shopper/AvatarCanvas.jsx#L79); [`canvasWarp2D.js:L1265-L1445`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L1265))

## Units & Rounding

Avatar target dimensions are fractions of canvas pixels. Garment scan coordinates are scaled back to original pixels; crop padding uses a minimum of 2 scan pixels before scale conversion. ([`AvatarCanvas.jsx:L125-L169`](../../../../Frontend/src/pages/Shopper/AvatarCanvas.jsx#L125); [`canvasWarp2D.js:L1265-L1445`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L1265))

## Edge Cases

The avatar path uses `detectBodyBounds`' alpha threshold (45), not union-component detection. The garment union crop includes disconnected significant components; when none qualify it retries lower alpha thresholds. ([`canvasWarp2D.js:L212-L295`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L212); [`canvasWarp2D.js:L1294-L1420`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L1294))

## Worked Example

For a 320×640 avatar canvas, target height is 460.8 px and the width cap is 224 px; the final width may be smaller to preserve detected-bounds aspect ratio. For a 200×200 garment scan, the minimum component area is 200 pixels. ([`AvatarCanvas.jsx:L125-L142`](../../../../Frontend/src/pages/Shopper/AvatarCanvas.jsx#L125); [`canvasWarp2D.js:L1337-L1340`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L1337))

## Source

- [`AvatarCanvas.jsx:L79-L169`](../../../../Frontend/src/pages/Shopper/AvatarCanvas.jsx#L79)
- [`canvasWarp2D.js:L1184-L1188`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L1184)
- [`canvasWarp2D.js:L1265-L1445`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L1265)

## Tests

none found for direct avatar-normalization or union-crop threshold assertions.

## Related

- [Canvas body-bounds detection](canvas-body-bounds.md)
- [Alpha crop hook](canvas-alpha-crop-hook.md)
- [Formula and Algorithm Catalog](README.md)

## Back to index

- [Formula and Algorithm Catalog](README.md)

