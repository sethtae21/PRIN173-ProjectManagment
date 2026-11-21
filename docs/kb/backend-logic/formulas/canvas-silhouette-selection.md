---
id: formula-canvas-silhouette-selection
title: Canvas silhouette selection
category: formula
status: verified
source_of_truth: [Frontend/src/pages/Shopper/canvasWarp2D.js]
related: [docs-kb-formulas-index, formula-canvas-make-lattice, formula-canvas-body-bounds]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Purpose

Describe `selectSilhouette`, which maps clamped height and weight to a letter silhouette using a height-adjusted reference weight. ([`canvasWarp2D.js:L141-L177`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L141))

## Formula

`referenceWeight = weightKg × (170 / heightCm)^2`. Select A below 55, B below 75, C below 95, D below 120, otherwise E. Height clamps to 120–218 cm and weight to 30–200 kg; falsey or nonnumeric values use defaults 164 cm and 58 kg before clamping. ([`canvasWarp2D.js:L141-L177`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L141))

## Inputs

Weight in kilograms and height in centimeters. ([`canvasWarp2D.js:L141-L160`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L141))

## Outputs

An object containing the selected letter and numeric reference weight. ([`canvasWarp2D.js:L160-L177`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L160))

## Units & Rounding

Inputs and reference weight use kilogram/centimeter values; no rounding is applied before threshold comparison. ([`canvasWarp2D.js:L141-L177`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L141))

## Edge Cases

Because defaults use JavaScript `||`, zero weight or zero height selects the default rather than the minimum clamp. The final bucket has no upper reference-weight limit. ([`canvasWarp2D.js:L146-L175`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L146))

## Worked Example

At 164 cm and 58 kg, reference weight is approximately 62.4 kg, which selects letter B. ([`canvasWarp2D.js:L146-L177`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L146))

## Source

- [`canvasWarp2D.js:L141-L177`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L141)

## Tests

none found for direct `selectSilhouette` formula assertions.

## Related

- [Canvas body-bounds detection](canvas-body-bounds.md)
- [Canvas lattice deformation](canvas-make-lattice.md)
- [Formula and Algorithm Catalog](README.md)

## Back to index

- [Formula and Algorithm Catalog](README.md)

