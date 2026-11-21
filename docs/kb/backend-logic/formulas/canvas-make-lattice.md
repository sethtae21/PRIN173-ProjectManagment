---
id: formula-canvas-make-lattice
title: Canvas body-deformation lattice
category: formula
status: verified
source_of_truth: [Frontend/src/pages/Shopper/canvasWarp2D.js]
related: [docs-kb-formulas-index, formula-canvas-silhouette-selection, formula-canvas-body-bounds, formula-canvas-render-layer]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Purpose

Describe `makeLattice`, which creates source/destination mesh points for continuous avatar deformation from measured and manual body-profile inputs. ([`canvasWarp2D.js:L297-L647`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L297))

## Formula

Clamp height to 120–218 cm and weight to 30–200 kg. Compute `referenceWeight = weight × (164 / height)^2`; normalize logarithmically against the gender baseline (70 kg male, 58 kg female), clamped to −0.9…1.35. For each grid row, Gaussian shoulder/chest/belly/hip/thigh/calf bands weight the profile and manual-shape terms; multiply by body fade and strength, clamp requested horizontal growth to −0.24…0.72, then cap it by available side room. Destination x/y are source x/y plus row-specific dx/dy. ([`canvasWarp2D.js:L297-L410`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L297); [`canvasWarp2D.js:L411-L647`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L411))

## Inputs

Canvas width/height, detected body bounds, and configuration including gender, height, weight, freeze/rigid flags, anchor position, shoulder/waist/hip/thigh/cup settings, and strength. ([`canvasWarp2D.js:L297-L410`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L297))

## Outputs

Returns mesh lattice points and normalized `weightChange`, `referenceWeight`, and `heightCm`; missing bounds returns an empty lattice. ([`canvasWarp2D.js:L297-L410`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L297); [`canvasWarp2D.js:L635-L647`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L635))

## Units & Rounding

Height is centimeters and weight kilograms; lattice coordinates and displacements are canvas pixels. Intermediate values remain floating point. ([`canvasWarp2D.js:L297-L410`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L297))

## Edge Cases

The defaults differ by gender for weight and baseline; unsupported gender values select the female branch. `freezeWeight` zeroes weight-derived growth, while `rigidShift` changes the vertical-shift profile. ([`canvasWarp2D.js:L303-L365`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L303))

## Worked Example

With no profile changes, requested growth can be zero and each lattice destination equals its source coordinate except for the computed height shift. The grid rows and columns are created from the module's fixed grid dimensions. ([`canvasWarp2D.js:L297-L410`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L297); [`canvasWarp2D.js:L411-L647`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L411))

## Source

- [`canvasWarp2D.js:L297-L647`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L297)

## Tests

none found for direct `makeLattice` formula assertions.

## Related

- [Canvas silhouette selection](canvas-silhouette-selection.md)
- [Canvas body-bounds detection](canvas-body-bounds.md)
- [Canvas layer resampling](canvas-render-layer.md)
- [Formula and Algorithm Catalog](README.md)

## Back to index

- [Formula and Algorithm Catalog](README.md)

