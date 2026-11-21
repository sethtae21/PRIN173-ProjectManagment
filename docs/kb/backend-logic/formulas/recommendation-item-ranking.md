---
id: formula-recommendation-item-ranking
title: Deterministic recommendation ranking
category: formula
status: verified
source_of_truth: [backend/recommendations/scoring.py]
related: [docs-kb-formulas-index, formula-recommendation-item-scoring]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Purpose

Document how `rank_items` scores candidates, orders them deterministically, and applies the requested result limit. ([`scoring.py:L153-L159`](../../../../backend/recommendations/scoring.py#L153))

## Formula

For each item, compute `score_item`; sort by `(-total, item_name)`; return the first `limit` entries. The default limit is 10. ([`scoring.py:L153-L159`](../../../../backend/recommendations/scoring.py#L153))

## Inputs

An avatar profile, item iterable, optional limit, and optional weight mapping. The default weight mapping is used when the supplied value is falsey. ([`scoring.py:L153-L157`](../../../../backend/recommendations/scoring.py#L153))

## Outputs

A list of `ScoreBreakdown` values in descending score order, with lexicographically ascending item names resolving ties. ([`scoring.py:L153-L159`](../../../../backend/recommendations/scoring.py#L153))

## Units & Rounding

The sort key uses integer rule-point totals; there is no rounding. ([`scoring.py:L144-L159`](../../../../backend/recommendations/scoring.py#L144))

## Edge Cases

Equal scores are resolved by item name, making repeated calls over the same inputs stable. The function itself slices by `limit`; its API caller may impose additional input validation. ([`scoring.py:L153-L159`](../../../../backend/recommendations/scoring.py#L153); [`tests_weights.py:L208-L219`](../../../../backend/recommendations/tests_weights.py#L208))

## Worked Example

If `Alpha` and `Zeta` have equal totals, `Alpha` is placed first; the test suite asserts that tie-break. ([`tests_weights.py:L214-L219`](../../../../backend/recommendations/tests_weights.py#L214))

## Source

- [`scoring.py:L144-L159`](../../../../backend/recommendations/scoring.py#L144)

## Tests

- [`tests_weights.py:L208-L219`](../../../../backend/recommendations/tests_weights.py#L208)

## Related

- [Rule-based recommendation item score](recommendation-item-scoring.md)
- [Formula and Algorithm Catalog](README.md)

## Back to index

- [Formula and Algorithm Catalog](README.md)

