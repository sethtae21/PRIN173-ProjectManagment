---
id: formula-recommendation-item-scoring
title: Rule-based recommendation item score
category: formula
status: verified
source_of_truth: [backend/recommendations/scoring.py, backend/recommendations/knowledge_table.py]
related: [docs-kb-formulas-index, formula-recommendation-score-weights, formula-recommendation-item-ranking]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Purpose

Describe how `score_item` applies four explainable rules in a fixed order and sums their points. ([`scoring.py:L28-L30`](../../../../backend/recommendations/scoring.py#L28); [`scoring.py:L83-L151`](../../../../backend/recommendations/scoring.py#L83))

## Formula

`total = color + contrast + shading + style`; each term is its rule weight when that rule fires, otherwise zero. Color fires on an intersection between item color families and the avatar undertone's compatible families; contrast fires when the explicit or inferred contrast is allowed for the height zone; shading fires when category-group shade is allowed for body shape; style fires on a shared normalized tag. ([`scoring.py:L83-L141`](../../../../backend/recommendations/scoring.py#L83); [`knowledge_table.py:L32-L38`](../../../../backend/recommendations/knowledge_table.py#L32); [`knowledge_table.py:L61-L90`](../../../../backend/recommendations/knowledge_table.py#L61))

## Inputs

Avatar undertone, height, body shape, and style tags; item color families or description, category, shade or description, and style tags; optionally, a weight mapping. Strings are lowercased and stripped before set comparisons. ([`scoring.py:L32-L54`](../../../../backend/recommendations/scoring.py#L32); [`scoring.py:L77-L82`](../../../../backend/recommendations/scoring.py#L77))

## Outputs

A `ScoreBreakdown` containing item name, fixed-order `RuleResult` records, summed total, and maximum score. ([`scoring.py:L57-L74`](../../../../backend/recommendations/scoring.py#L57); [`scoring.py:L144-L151`](../../../../backend/recommendations/scoring.py#L144))

## Units & Rounding

The total is integer points on a 0-to-7 scale with the default weight table; no rounding is used. ([`knowledge_table.py:L32-L38`](../../../../backend/recommendations/knowledge_table.py#L32))

## Edge Cases

An unrecognized body-shape/category group or unsupported category does not earn shading points. Empty style overlap and incompatible color/contrast each yield zero for that rule. ([`scoring.py:L83-L141`](../../../../backend/recommendations/scoring.py#L83))

## Worked Example

With all four default rules firing, the result is `3 + 2 + 1 + 1 = 7`. If the shading rule does not fire, the same item scores 6. ([`scoring.py:L83-L151`](../../../../backend/recommendations/scoring.py#L83); [`knowledge_table.py:L32-L38`](../../../../backend/recommendations/knowledge_table.py#L32))

## Source

- [`scoring.py:L28-L151`](../../../../backend/recommendations/scoring.py#L28)
- [`knowledge_table.py:L32-L111`](../../../../backend/recommendations/knowledge_table.py#L32)

## Tests

- [`tests_weights.py:L208-L229`](../../../../backend/recommendations/tests_weights.py#L208)

## Related

- [Recommendation score weights](recommendation-score-weights.md)
- [Recommendation item ranking](recommendation-item-ranking.md)
- [Formula and Algorithm Catalog](README.md)

## Back to index

- [Formula and Algorithm Catalog](README.md)

