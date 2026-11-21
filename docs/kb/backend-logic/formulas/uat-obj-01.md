---
id: formula-uat-obj-01
title: UAT KPI OBJ-01 fit and style confidence
category: formula
status: verified
source_of_truth: [backend/ratings/uat_kpis.py]
related: [docs-kb-formulas-index, formula-uat-obj-06]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Purpose

Define the computed OBJ-01 percentage for eligible try-on sessions. ([`uat_kpis.py:L38-L43`](../../../../backend/ratings/uat_kpis.py#L38); [`uat_kpis.py:L209-L248`](../../../../backend/ratings/uat_kpis.py#L209))

## Formula

`100 × passing eligible sessions / eligible sessions`. A session is eligible only when both fit-confidence and style-confidence have paired before/after answers for the same session/product. Each confidence measure must independently satisfy `after − before ≥ 1 OR after ≥ 4/5`; a matching fit-visualization star rating must also be at least 4. Target: at least 80%. ([`uat_kpis.py:L155-L187`](../../../../backend/ratings/uat_kpis.py#L155); [`uat_kpis.py:L209-L248`](../../../../backend/ratings/uat_kpis.py#L209))

## Inputs

Paired `fit_confidence` and `style_confidence` answers, the session's user/product association, and `fit_visualization` ratings for target type `fit`. ([`uat_kpis.py:L155-L169`](../../../../backend/ratings/uat_kpis.py#L155); [`uat_kpis.py:L209-L245`](../../../../backend/ratings/uat_kpis.py#L209))

## Outputs

Actual percentage, denominator as sample size, numerator and denominator strings, target status, and evidence reference. ([`uat_kpis.py:L190-L203`](../../../../backend/ratings/uat_kpis.py#L190))

## Units & Rounding

Percentage is multiplied by 100 and formatted to two decimal places. No eligible sessions produces Not Run, not a computed zero-percent KPI. ([`uat_kpis.py:L190-L203`](../../../../backend/ratings/uat_kpis.py#L190); [`uat_kpis.py:L209-L248`](../../../../backend/ratings/uat_kpis.py#L209))

## Edge Cases

Unpaired answers are excluded, and a missing matching fit rating means the session does not pass. Approval is stars-only; no vote field is used. ([`uat_kpis.py:L155-L187`](../../../../backend/ratings/uat_kpis.py#L155); [`uat_kpis.py:L209-L245`](../../../../backend/ratings/uat_kpis.py#L209))

## Worked Example

If 4 of 5 eligible sessions pass all three conditions, the result is 80.00%, meeting the 80% target. ([`uat_kpis.py:L38-L43`](../../../../backend/ratings/uat_kpis.py#L38); [`uat_kpis.py:L190-L203`](../../../../backend/ratings/uat_kpis.py#L190))

## Source

- [`uat_kpis.py:L38-L66`](../../../../backend/ratings/uat_kpis.py#L38)
- [`uat_kpis.py:L155-L248`](../../../../backend/ratings/uat_kpis.py#L155)

## Tests

none found for direct OBJ-01 workbook formula assertions.

## Related

- [UAT KPI OBJ-06](uat-obj-06.md)
- [Formula and Algorithm Catalog](README.md)

## Back to index

- [Formula and Algorithm Catalog](README.md)

