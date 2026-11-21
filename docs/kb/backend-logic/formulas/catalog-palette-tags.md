---
id: formula-catalog-palette-tags
title: Catalog color-family palette tags
category: formula
status: verified
source_of_truth: [backend/catalog/color_palette_config.py]
related: [docs-kb-formulas-index, formula-catalog-validator-active]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Purpose

Describe the configured color-family-to-tag lookup used by the active catalog validator. ([`core.py:L364-L365`](../../../../backend/catalog/views/core.py#L364); [`color_palette_config.py:L7-L89`](../../../../backend/catalog/color_palette_config.py#L7))

## Formula

Normalize the input with lowercase and trim; return the exact family's configured tags if present. Otherwise, return the first mapping whose key is a substring of the input or vice versa; if no key matches, return `["neutral", "versatile"]`. ([`color_palette_config.py:L70-L89`](../../../../backend/catalog/color_palette_config.py#L70))

## Inputs

A color-family string; the configuration contains 12 family keys and their tags, hue ranges, and compatible skin-tone labels. ([`color_palette_config.py:L7-L68`](../../../../backend/catalog/color_palette_config.py#L7); [`color_palette_config.py:L70-L89`](../../../../backend/catalog/color_palette_config.py#L70))

## Outputs

A list of palette tags selected from the mapping or the two-tag fallback. ([`color_palette_config.py:L7-L89`](../../../../backend/catalog/color_palette_config.py#L7))

## Units & Rounding

Tag lookup is string-based; configured hue-range values are degree tuples, but `get_palette_tags` does not calculate from those ranges. ([`color_palette_config.py:L7-L68`](../../../../backend/catalog/color_palette_config.py#L7); [`color_palette_config.py:L70-L89`](../../../../backend/catalog/color_palette_config.py#L70))

## Edge Cases

Partial matching follows mapping insertion order, so an input matching multiple keys returns the first matching entry. Empty or unmatched input uses the neutral/versatile fallback. ([`color_palette_config.py:L70-L89`](../../../../backend/catalog/color_palette_config.py#L70))

## Worked Example

`get_palette_tags("red")` returns `["warm-tone", "vibrant", "autumn", "gold", "bold"]`; the UT-08 test compares the active validator's result to this mapping. ([`color_palette_config.py:L7-L14`](../../../../backend/catalog/color_palette_config.py#L7); [`tests_ut_cases.py:L42-L49`](../../../../backend/catalog/tests_ut_cases.py#L42))

## Source

- [`color_palette_config.py:L7-L89`](../../../../backend/catalog/color_palette_config.py#L7)
- [`core.py:L364-L365`](../../../../backend/catalog/views/core.py#L364)

## Tests

- [`tests_ut_cases.py:L42-L49`](../../../../backend/catalog/tests_ut_cases.py#L42)

## Related

- [Active catalog validation rules](catalog-validator-active.md)
- [Formula and Algorithm Catalog](README.md)

## Back to index

- [Formula and Algorithm Catalog](README.md)

