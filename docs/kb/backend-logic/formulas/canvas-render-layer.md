---
id: formula-canvas-render-layer
title: Canvas mesh layer resampling
category: formula
status: verified
source_of_truth: [Frontend/src/pages/Shopper/canvasWarp2D.js]
related: [docs-kb-formulas-index, formula-canvas-make-lattice]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Purpose

Describe `renderLayer`, which inverse-maps destination pixels through the deformation lattice and samples the source image. ([`canvasWarp2D.js:L678-L969`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L678))

## Formula

For each destination pixel center, locate the surrounding lattice row and column intervals and interpolate the corresponding source coordinate. Bilinear weights combine four source pixels; alpha and alpha-weighted RGB are accumulated, then RGB is normalized by accumulated alpha. ([`canvasWarp2D.js:L678-L969`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L678))

## Inputs

A 2D context, source canvas, and mesh with a nonempty lattice. ([`canvasWarp2D.js:L678-L709`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L678))

## Outputs

Writes resampled pixels to the destination context; invalid inputs return without drawing. If source pixels cannot be read, it falls back to drawing the source at the origin. ([`canvasWarp2D.js:L678-L719`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L678))

## Units & Rounding

Coordinates are canvas pixels and interpolation fractions are clamped to [0,1]. Pixel centers use a 0.5 offset. ([`canvasWarp2D.js:L720-L830`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L720))

## Edge Cases

Pixels outside the destination lattice extent and source coordinates outside the valid sampling region are skipped. A `getImageData` failure uses the unwarped draw fallback. ([`canvasWarp2D.js:L678-L719`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L678); [`canvasWarp2D.js:L786-L850`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L786))

## Worked Example

At an exact lattice node, interpolation fractions are 0 or 1, so the mapped source coordinate equals that node's source coordinate. ([`canvasWarp2D.js:L720-L830`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L720))

## Source

- [`canvasWarp2D.js:L678-L969`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L678)

## Tests

none found for direct `renderLayer` resampling assertions.

## Related

- [Canvas body-deformation lattice](canvas-make-lattice.md)
- [Formula and Algorithm Catalog](README.md)

## Back to index

- [Formula and Algorithm Catalog](README.md)

