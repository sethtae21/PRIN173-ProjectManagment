---
id: formula-recommendation-score-weights
title: Recommendation score weights
category: formula
status: verified
source_of_truth: [backend/recommendations/knowledge_table.py, docs/TUNING_LOG.md]
related: [docs-kb-formulas-index, formula-recommendation-item-scoring]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Purpose

Record the deterministic FR-7.2 rule weights and their tuning-log contract. The code defines weights 3, 2, 1, and 1, with a maximum score of 7. The tuning log says these baseline rows remain candidates until KAN-103 is Done. ([`knowledge_table.py:L29-L38`](../../../../backend/recommendations/knowledge_table.py#L29); [`TUNING_LOG.md:L12-L22`](../../../TUNING_LOG.md#L12))

## Formula

`MAX_SCORE = 3 + 2 + 1 + 1 = 7`. The weights are `color_compatibility = 3`, `height_contrast = 2`, `proportion_shading = 1`, and `style_occasion = 1`. ([`knowledge_table.py:L32-L38`](../../../../backend/recommendations/knowledge_table.py#L32))

## Inputs

The four named scoring rules; `score_item` uses this table unless a caller supplies a truthy override mapping. ([`knowledge_table.py:L32-L38`](../../../../backend/recommendations/knowledge_table.py#L32); [`scoring.py:L144-L151`](../../../../backend/recommendations/scoring.py#L144))

## Outputs

Each fired rule contributes its configured integer weight; the total ceiling is 7 for the four default rules. ([`scoring.py:L83-L141`](../../../../backend/recommendations/scoring.py#L83); [`knowledge_table.py:L32-L38`](../../../../backend/recommendations/knowledge_table.py#L32))

## Units & Rounding

Weights and scores are integer points; no rounding is applied. ([`knowledge_table.py:L32-L38`](../../../../backend/recommendations/knowledge_table.py#L32))

## Edge Cases

The table's version is `1.1.0`. The tuning log requires a corresponding dated log row and test freeze update when weights change; its current baseline entries are explicitly described as candidates pending KAN-103 completion. ([`knowledge_table.py:L29-L38`](../../../../backend/recommendations/knowledge_table.py#L29); [`TUNING_LOG.md:L3-L22`](../../../TUNING_LOG.md#L3))

## Worked Example

If color, height contrast, and style rules fire while shading does not, the score is `3 + 2 + 1 + 0 = 6 / 7`. The per-rule zero-or-weight behavior is asserted by the recommendation test suite. ([`scoring.py:L83-L141`](../../../../backend/recommendations/scoring.py#L83); [`tests_weights.py:L220-L229`](../../../../backend/recommendations/tests_weights.py#L220))

## Source

- [`knowledge_table.py:L29-L38`](../../../../backend/recommendations/knowledge_table.py#L29)
- [`TUNING_LOG.md:L3-L22`](../../../TUNING_LOG.md#L3)

## Tests

- [`tests_weights.py:L292-L316`](../../../../backend/recommendations/tests_weights.py#L292)

## Related

- [Recommendation item scoring](recommendation-item-scoring.md)
- [Formula and Algorithm Catalog](README.md)

## Back to index

- [Formula and Algorithm Catalog](README.md)

