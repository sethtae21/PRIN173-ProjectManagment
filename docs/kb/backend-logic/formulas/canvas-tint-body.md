---
id: formula-canvas-tint-body
title: Canvas skin-tone tint and luminance preservation
category: formula
status: verified
source_of_truth: [Frontend/src/pages/Shopper/canvasWarp2D.js]
related: [docs-kb-formulas-index, formula-canvas-body-bounds]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Purpose

Describe `tintBody`, which recolors visible source pixels while applying a bounded luminance factor to retain shading. ([`canvasWarp2D.js:L1029-L1100`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L1029))

## Formula

Convert the selected hex tone to RGB; add undertone offset (warm `[5,2,-4]`, cool `[-3,0,6]`, otherwise zero). Compute mean luminance from pixels with alpha at least 45 using weights 0.21/0.72/0.07. For pixels with alpha at least 5, use `light = clamp(1 + (luminance - mean) × 0.95, 0.67, 1.23)` and set each output channel to `clamp((base + offset) × light, 0, 255)`. ([`canvasWarp2D.js:L1029-L1100`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L1029))

## Inputs

Source canvas, tone name or six-digit hex string, and undertone label. `Original` or null tone returns the source unchanged. ([`canvasWarp2D.js:L1029-L1072`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L1029))

## Outputs

A canvas with tinted RGB values and source alpha retained. ([`canvasWarp2D.js:L1060-L1100`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L1060))

## Units & Rounding

RGB and alpha channels use 0–255 integer storage; luminance and multiplier are floating point before channel clamping. ([`canvasWarp2D.js:L1070-L1100`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L1070))

## Edge Cases

Pixels below the two alpha cutoffs contribute differently: alpha below 45 is excluded from mean luminance, while alpha below 5 is not recolored. Unknown tone names fall back to Fair; malformed hex strings are treated as tone names. ([`canvasWarp2D.js:L1030-L1092`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L1030))

## Worked Example

A pixel whose luminance equals the source mean gets a multiplier of 1, so its output channel is the selected base channel plus the undertone offset, clamped to 0–255. ([`canvasWarp2D.js:L1070-L1100`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L1070))

## Source

- [`canvasWarp2D.js:L1029-L1100`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L1029)

## Tests

none found for direct `tintBody` pixel assertions.

## Related

- [Canvas body-bounds detection](canvas-body-bounds.md)
- [Formula and Algorithm Catalog](README.md)

## Back to index

- [Formula and Algorithm Catalog](README.md)

