---
id: formula-canvas-alpha-crop-hook
title: Alpha crop hook thresholds and pipeline
category: formula
status: verified
source_of_truth: [Frontend/src/hooks/useAlphaCrop.js]
related: [docs-kb-formulas-index, formula-avatar-crop-normalization]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Purpose

Document the `useAlphaCrop` image pipeline, including component selection, solid-pixel tightening, faint-alpha rescue, and its crop thresholds. ([`useAlphaCrop.js:L4-L13`](../../../../Frontend/src/hooks/useAlphaCrop.js#L4); [`useAlphaCrop.js:L232-L285`](../../../../Frontend/src/hooks/useAlphaCrop.js#L232))

## Formula

Fill enclosed pixels with alpha ≤24, scan with maximum dimension 512, and try connected-component alpha thresholds 24 then 12. Components use low-alpha threshold 8, minimum area `max(16,floor(total×0.0008))`, and a linking gap `max(3,round(5%×maxDimension))`; choose the cluster with the most pixels above alpha 96. Grow by `max(3,round(6%×maxDimension))`, then tighten at alpha >96 or fallback >40. If the box covers at least 98% of both scan dimensions, avoid cropping; otherwise use 3% padding and map the box back to source coordinates. ([`useAlphaCrop.js:L7-L13`](../../../../Frontend/src/hooks/useAlphaCrop.js#L7); [`useAlphaCrop.js:L50-L212`](../../../../Frontend/src/hooks/useAlphaCrop.js#L50); [`useAlphaCrop.js:L232-L283`](../../../../Frontend/src/hooks/useAlphaCrop.js#L232))

## Inputs

An image source URL loaded through an `Image` with anonymous CORS mode. ([`useAlphaCrop.js:L232-L255`](../../../../Frontend/src/hooks/useAlphaCrop.js#L232))

## Outputs

Returns a cached or newly generated PNG data URL, or null until one is available. Source-keyed results are kept in a cache limited to 80 entries. ([`useAlphaCrop.js:L15-L24`](../../../../Frontend/src/hooks/useAlphaCrop.js#L15); [`useAlphaCrop.js:L232-L285`](../../../../Frontend/src/hooks/useAlphaCrop.js#L232))

## Units & Rounding

Alpha thresholds are 0–255; component and crop bounds use pixels. Scan size is rounded to at least 1 pixel, and crop padding is rounded to 3% of the selected box's maximum dimension with a minimum of 1 pixel. ([`useAlphaCrop.js:L7-L13`](../../../../Frontend/src/hooks/useAlphaCrop.js#L7); [`useAlphaCrop.js:L232-L280`](../../../../Frontend/src/hooks/useAlphaCrop.js#L232))

## Edge Cases

If no component or tightened box is found, the hook leaves the current result unset. A box covering at least 98% in each dimension is not cropped; faint-alpha rescue rescales nonzero alpha only when its median is below 200. ([`useAlphaCrop.js:L26-L48`](../../../../Frontend/src/hooks/useAlphaCrop.js#L26); [`useAlphaCrop.js:L232-L283`](../../../../Frontend/src/hooks/useAlphaCrop.js#L232))

## Worked Example

For a 1000×500 source image, scan dimensions are 512×256. At 512×256 the component-area floor is `max(16,floor(131072×0.0008)) = 104` pixels; the linking gap is `max(3,round(512×0.05)) = 26` pixels. ([`useAlphaCrop.js:L110-L145`](../../../../Frontend/src/hooks/useAlphaCrop.js#L110); [`useAlphaCrop.js:L232-L262`](../../../../Frontend/src/hooks/useAlphaCrop.js#L232))

## Source

- [`useAlphaCrop.js:L4-L13`](../../../../Frontend/src/hooks/useAlphaCrop.js#L4)
- [`useAlphaCrop.js:L26-L230`](../../../../Frontend/src/hooks/useAlphaCrop.js#L26)
- [`useAlphaCrop.js:L232-L285`](../../../../Frontend/src/hooks/useAlphaCrop.js#L232)

## Tests

none found for direct alpha-crop pipeline threshold assertions.

## Related

- [Avatar normalization and alpha union crop](avatar-crop-normalization.md)
- [Formula and Algorithm Catalog](README.md)

## Back to index

- [Formula and Algorithm Catalog](README.md)

