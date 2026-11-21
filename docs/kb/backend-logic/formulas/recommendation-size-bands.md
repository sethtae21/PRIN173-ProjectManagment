---
id: formula-recommendation-size-bands
title: Reference size bands and body proportion
category: formula
status: verified
source_of_truth: [backend/recommendations/knowledge_table.py]
related: [docs-kb-formulas-index, formula-catalog-validator-active]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Purpose

Document the reference-only clothing-size bands and the `body_proportion` output. The code states the table is displayed, not scored or stored. ([`knowledge_table.py:L117-L128`](../../../../backend/recommendations/knowledge_table.py#L117); [`knowledge_table.py:L196-L218`](../../../../backend/recommendations/knowledge_table.py#L196))

## Formula

Clamp body build to 86–112 cm, then map using half-open bands: S [86,90), M [90,94), L [94,98), XL [98,102), 2XL [102,106), 3XL [106,110), and 4XL [110,112] inclusive at the upper end. `average = round((clamp(height,120–218) + clamp(build,86–112)) / 2, 1)`. ([`knowledge_table.py:L61-L63`](../../../../backend/recommendations/knowledge_table.py#L61); [`knowledge_table.py:L117-L128`](../../../../backend/recommendations/knowledge_table.py#L117); [`knowledge_table.py:L196-L218`](../../../../backend/recommendations/knowledge_table.py#L196))

## Inputs

Height and body-build measurements in centimeters. Invalid numeric values clamp to the lower bound through `clamp_range`. ([`knowledge_table.py:L72-L82`](../../../../backend/recommendations/knowledge_table.py#L72); [`knowledge_table.py:L196-L218`](../../../../backend/recommendations/knowledge_table.py#L196))

## Outputs

`body_proportion` returns a size label and a one-decimal average in centimeters. ([`knowledge_table.py:L210-L218`](../../../../backend/recommendations/knowledge_table.py#L210))

## Units & Rounding

All measurements are centimeters. The recommended average is rounded to one decimal place; size-band membership is not rounded. ([`knowledge_table.py:L117-L128`](../../../../backend/recommendations/knowledge_table.py#L117); [`knowledge_table.py:L210-L218`](../../../../backend/recommendations/knowledge_table.py#L210))

## Edge Cases

Values outside the configured ranges clamp to their nearest endpoint; the final 4XL band includes 112 cm, while other upper bounds belong to the next band. ([`knowledge_table.py:L61-L63`](../../../../backend/recommendations/knowledge_table.py#L61); [`knowledge_table.py:L196-L208`](../../../../backend/recommendations/knowledge_table.py#L196))

## Worked Example

Build 90 cm maps to M; with height 170 cm, the average is `(170 + 90) / 2 = 130.0 cm`. ([`knowledge_table.py:L117-L128`](../../../../backend/recommendations/knowledge_table.py#L117); [`knowledge_table.py:L210-L218`](../../../../backend/recommendations/knowledge_table.py#L210))

## Source

- [`knowledge_table.py:L61-L63`](../../../../backend/recommendations/knowledge_table.py#L61)
- [`knowledge_table.py:L117-L218`](../../../../backend/recommendations/knowledge_table.py#L117)

## Tests

none found for direct size-band or `body_proportion` assertions.

## Related

- [Active catalog validation rules](catalog-validator-active.md)
- [Formula and Algorithm Catalog](README.md)

## Back to index

- [Formula and Algorithm Catalog](README.md)

