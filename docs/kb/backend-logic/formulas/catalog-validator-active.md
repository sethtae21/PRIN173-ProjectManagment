---
id: formula-catalog-validator-active
title: Active catalog validation rules
category: formula
status: verified
source_of_truth: [backend/catalog/views/core.py, backend/catalog/color_rules.py, backend/recommendations/knowledge_table.py]
related: [docs-kb-formulas-index, formula-catalog-validator-legacy, formula-catalog-palette-tags, formula-recommendation-size-bands]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Purpose

Describe the `CatalogValidator` used by upload and listing-edit paths, distinguishing its checks from the compatibility validator. ([`core.py:L172-L215`](../../../../backend/catalog/views/core.py#L172); [`core.py:L358-L365`](../../../../backend/catalog/views/core.py#L358))

## Formula

A CSV row passes when all 10 required fields are non-empty, price parses as a finite positive `Decimal`, category is one of tops/bottoms/dresses/outerwear (with `dresses/one-piece` normalized), size passes the shared size-label rule, and submitted style tags are in the controlled vocabulary. Image format allows JPEG/JPG/PNG/WEBP and rejects animated PNG/WEBP; each dimension must be at least 800 px. Rear-view orientation fails when the nontransparent garment bounding-box width/height ratio exceeds 1.0. ([`core.py:L172-L270`](../../../../backend/catalog/views/core.py#L172))

## Inputs

CSV row data, row number, image file or bytes, view label, and category. Color alignment and suggested color are delegated to `catalog.color_rules`; palette tags come from `get_palette_tags(color_family)`. ([`core.py:L186-L213`](../../../../backend/catalog/views/core.py#L186); [`core.py:L245-L270`](../../../../backend/catalog/views/core.py#L245); [`core.py:L358-L365`](../../../../backend/catalog/views/core.py#L358))

## Outputs

Validation methods return `(valid, error)` or `(valid, errors)`; the image pipeline and color helpers return processed image data or color-derived values. ([`core.py:L186-L270`](../../../../backend/catalog/views/core.py#L186); [`core.py:L358-L365`](../../../../backend/catalog/views/core.py#L358))

## Units & Rounding

Image bounds are pixels, rear orientation is a width/height ratio, and the maximum upload-file size constant is 5 MiB. The upload route also checks the file size. ([`core.py:L172-L180`](../../../../backend/catalog/views/core.py#L172); [`core.py:L844-L845`](../../../../backend/catalog/views/core.py#L844))

## Edge Cases

`MAX_IMAGE_DIMENSION` is declared as 4096, but `check_image_dimensions` enforces only the 800-pixel minimum. The rear-view ratio check is skipped for other view labels. ([`core.py:L172-L180`](../../../../backend/catalog/views/core.py#L172); [`core.py:L234-L270`](../../../../backend/catalog/views/core.py#L234))

## Worked Example

A rear image with a detected 900-by-900-pixel garment has ratio 1.0 and meets the orientation boundary; a wider-than-tall rear garment has ratio greater than 1.0 and is rejected. ([`core.py:L245-L270`](../../../../backend/catalog/views/core.py#L245))

## Source

- [`core.py:L172-L270`](../../../../backend/catalog/views/core.py#L172)
- [`core.py:L358-L365`](../../../../backend/catalog/views/core.py#L358)
- [`core.py:L844-L845`](../../../../backend/catalog/views/core.py#L844)

## Tests

- [`tests.py:L431-L489`](../../../../backend/catalog/tests.py#L431)
- [`tests.py:L280-L313`](../../../../backend/catalog/tests.py#L280)

## Related

- [Compatibility catalog validator](catalog-validator-legacy.md)
- [Catalog palette tag mapping](catalog-palette-tags.md)
- [Recommendation size bands](recommendation-size-bands.md)
- [Formula and Algorithm Catalog](README.md)

## Back to index

- [Formula and Algorithm Catalog](README.md)

