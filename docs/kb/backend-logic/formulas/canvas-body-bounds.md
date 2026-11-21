---
id: formula-canvas-body-bounds
title: Canvas body-bounds detection
category: formula
status: verified
source_of_truth: [Frontend/src/pages/Shopper/canvasWarp2D.js]
related: [docs-kb-formulas-index, formula-canvas-silhouette-selection, formula-canvas-make-lattice, formula-canvas-tint-body, formula-avatar-crop-normalization]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Purpose

Describe `detectBodyBounds`, which scans canvas alpha values and returns a body bounding box with per-row extents. ([`canvasWarp2D.js:L212-L295`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L212))

## Formula

Ignore pixels whose alpha is below 45; for each remaining row, find its left and rightmost pixels, then union those row extents into left/right/top/bottom. Width and height are computed as `right - left` and `bottom - top`; center is `(left + right) / 2`. ([`canvasWarp2D.js:L212-L295`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L212))

## Inputs

A readable canvas with nonzero dimensions. ([`canvasWarp2D.js:L212-L229`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L212))

## Outputs

Returns `null` for a missing context, empty/degenerate bounds, or no visible row; otherwise returns bounds, row records, center, dimensions, and a full-canvas ROI. ([`canvasWarp2D.js:L220-L295`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L220))

## Units & Rounding

Bounds are integer pixel coordinates; `cx` may be a half-pixel. Width/height are coordinate differences, not inclusive pixel counts. ([`canvasWarp2D.js:L233-L295`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L233))

## Edge Cases

Alpha exactly 45 is included; alpha below 45 is excluded. A fully transparent image or a one-coordinate-wide/high bound returns `null`. ([`canvasWarp2D.js:L248-L295`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L248))

## Worked Example

If the included pixels span x=10 through x=30 and y=5 through y=50, the returned width is 20 and height is 45. ([`canvasWarp2D.js:L233-L295`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L233))

## Source

- [`canvasWarp2D.js:L212-L295`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L212)

## Tests

none found for direct `detectBodyBounds` formula assertions.

## Related

- [Canvas silhouette selection](canvas-silhouette-selection.md)
- [Canvas deformation lattice](canvas-make-lattice.md)
- [Canvas body tint](canvas-tint-body.md)
- [Avatar normalization and alpha union crop](avatar-crop-normalization.md)
- [Formula and Algorithm Catalog](README.md)

## Back to index

- [Formula and Algorithm Catalog](README.md)

