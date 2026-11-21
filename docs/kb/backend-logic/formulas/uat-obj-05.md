---
id: formula-uat-obj-05
title: UAT KPI OBJ-05 recommendation approval
category: formula
status: verified
source_of_truth: [backend/ratings/uat_kpis.py]
related: [docs-kb-formulas-index]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Purpose

Define OBJ-05 as the percentage of recorded recommendation-panel ratings that approve by star score. ([`uat_kpis.py:L38-L43`](../../../../backend/ratings/uat_kpis.py#L38); [`uat_kpis.py:L250-L264`](../../../../backend/ratings/uat_kpis.py#L250))

## Formula

`100 × recommendation-panel item ratings with score ≥4 / all recorded recommendation-panel item ratings`. Target: at least 80%. ([`uat_kpis.py:L38-L43`](../../../../backend/ratings/uat_kpis.py#L38); [`uat_kpis.py:L179-L203`](../../../../backend/ratings/uat_kpis.py#L179); [`uat_kpis.py:L250-L264`](../../../../backend/ratings/uat_kpis.py#L250))

## Inputs

Rating rows filtered to `target_type='item'` and `source='recommendation_panel'`; only the integer score determines approval. ([`uat_kpis.py:L179-L187`](../../../../backend/ratings/uat_kpis.py#L179); [`uat_kpis.py:L250-L264`](../../../../backend/ratings/uat_kpis.py#L250))

## Outputs

Percentage, rating-row sample size, approvals numerator, denominator, status, and evidence reference; no rating rows produces Not Run. ([`uat_kpis.py:L190-L203`](../../../../backend/ratings/uat_kpis.py#L190); [`uat_kpis.py:L250-L264`](../../../../backend/ratings/uat_kpis.py#L250))

## Units & Rounding

The percentage is formatted to two decimal places; approval is a score of at least 4 on the 5-star scale. ([`uat_kpis.py:L179-L203`](../../../../backend/ratings/uat_kpis.py#L179))

## Edge Cases

Ratings from product-page or fit surfaces and all survey questions are excluded. There is no like/dislike approval path. ([`uat_kpis.py:L250-L264`](../../../../backend/ratings/uat_kpis.py#L250))

## Worked Example

Eight approving scores among ten recommendation-panel item ratings produce 80.00%, meeting the target. ([`uat_kpis.py:L38-L43`](../../../../backend/ratings/uat_kpis.py#L38); [`uat_kpis.py:L190-L203`](../../../../backend/ratings/uat_kpis.py#L190))

## Source

- [`uat_kpis.py:L38-L43`](../../../../backend/ratings/uat_kpis.py#L38)
- [`uat_kpis.py:L179-L203`](../../../../backend/ratings/uat_kpis.py#L179)
- [`uat_kpis.py:L250-L264`](../../../../backend/ratings/uat_kpis.py#L250)

## Tests

none found for direct OBJ-05 workbook formula assertions.

## Related

- [Formula and Algorithm Catalog](README.md)

## Back to index

- [Formula and Algorithm Catalog](README.md)

