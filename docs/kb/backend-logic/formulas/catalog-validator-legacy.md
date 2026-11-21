---
id: formula-catalog-validator-legacy
title: Compatibility catalog validator
category: formula
status: verified
source_of_truth: [backend/catalog/validators.py]
related: [docs-kb-formulas-index, formula-catalog-validator-active]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Purpose

Document the older `catalog.validators.CatalogValidator` algorithm without presenting it as the active upload/edit validator; the module itself identifies `catalog.views.core.CatalogValidator` as the wired implementation. ([`validators.py:L1-L24`](../../../../backend/catalog/validators.py#L1))

## Formula

The compatibility CSV check requires the listed catalog fields, a positive float price, and one of four categories. Image validation checks expected filename, minimum and maximum dimensions, and RGB/RGBA/L mode. Dominant color is the most frequent nontransparent pixel after resizing to 150×150. Legacy palette tags classify HSV hue as warm when `h < 0.15` or `h > 0.83`, saturation as vibrant above 0.6, muted above 0.3, otherwise neutral, and brightness as light above 0.7, medium above 0.4, otherwise dark; a nonempty family adds a family tag. ([`validators.py:L20-L90`](../../../../backend/catalog/validators.py#L20); [`validators.py:L124-L203`](../../../../backend/catalog/validators.py#L124))

## Inputs

CSV row and row number, uploaded image and expected filename/view type, image bytes, declared color, dominant hex color, and optional color family. ([`validators.py:L37-L90`](../../../../backend/catalog/validators.py#L37); [`validators.py:L124-L203`](../../../../backend/catalog/validators.py#L124))

## Outputs

CSV validation returns `(valid, errors)`; image validation returns an error list; color extraction returns a hex string and the palette method returns tags. ([`validators.py:L37-L90`](../../../../backend/catalog/validators.py#L37); [`validators.py:L124-L203`](../../../../backend/catalog/validators.py#L124))

## Units & Rounding

Dimensions are pixels; dominant-color sampling resizes to 150×150; HSV thresholds use normalized values from 0 to 1. ([`validators.py:L25-L27`](../../../../backend/catalog/validators.py#L25); [`validators.py:L124-L203`](../../../../backend/catalog/validators.py#L124))

## Edge Cases

This compatibility implementation has a 512-pixel minimum and 4096-pixel maximum. Color-alignment methods delegate to the shared `color_rules` helpers; dominant-color extraction falls back to `#000000` on invalid input. ([`validators.py:L25-L27`](../../../../backend/catalog/validators.py#L25); [`validators.py:L124-L168`](../../../../backend/catalog/validators.py#L124))

## Worked Example

For hue `0.10`, saturation `0.70`, value `0.80`, and family `red`, the generated tags are warm-tone, vibrant, light, and red-family. ([`validators.py:L168-L203`](../../../../backend/catalog/validators.py#L168))

## Source

- [`validators.py:L1-L203`](../../../../backend/catalog/validators.py#L1)

## Tests

- [`tests.py:L1433-L1523`](../../../../backend/catalog/tests.py#L1433)

## Related

- [Active catalog validation rules](catalog-validator-active.md)
- [Formula and Algorithm Catalog](README.md)

## Back to index

- [Formula and Algorithm Catalog](README.md)

