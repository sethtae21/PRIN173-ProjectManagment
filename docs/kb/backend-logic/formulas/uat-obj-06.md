---
id: formula-uat-obj-06
title: UAT KPI OBJ-06 purchase-decision confidence
category: formula
status: verified
source_of_truth: [backend/ratings/uat_kpis.py]
related: [docs-kb-formulas-index, formula-uat-obj-01]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Purpose

Define OBJ-06 as the percentage of eligible sessions with both purchase confidence rising and return intent falling. ([`uat_kpis.py:L38-L43`](../../../../backend/ratings/uat_kpis.py#L38); [`uat_kpis.py:L267-L287`](../../../../backend/ratings/uat_kpis.py#L267))

## Formula

`100 × passing eligible sessions / eligible sessions`. A session is eligible only when `purchase_confidence` and `return_intent` each have before/after pairs for the same session/product. It passes only if after-confidence is strictly greater than before-confidence and after-return-intent is strictly less than before-return-intent. Target: at least 80%. ([`uat_kpis.py:L155-L169`](../../../../backend/ratings/uat_kpis.py#L155); [`uat_kpis.py:L267-L287`](../../../../backend/ratings/uat_kpis.py#L267))

## Inputs

Paired `purchase_confidence` and `return_intent` responses. ([`uat_kpis.py:L155-L169`](../../../../backend/ratings/uat_kpis.py#L155); [`uat_kpis.py:L267-L287`](../../../../backend/ratings/uat_kpis.py#L267))

## Outputs

Percentage, eligible-session sample size, numerator, denominator, target status, and evidence reference. ([`uat_kpis.py:L190-L203`](../../../../backend/ratings/uat_kpis.py#L190))

## Units & Rounding

Percentage is formatted to two decimal places; no eligible sessions produces Not Run. ([`uat_kpis.py:L190-L203`](../../../../backend/ratings/uat_kpis.py#L190); [`uat_kpis.py:L267-L287`](../../../../backend/ratings/uat_kpis.py#L267))

## Edge Cases

Unpaired answers do not enter the denominator. Equality on either measure does not pass because both comparisons are strict. ([`uat_kpis.py:L155-L169`](../../../../backend/ratings/uat_kpis.py#L155); [`uat_kpis.py:L267-L287`](../../../../backend/ratings/uat_kpis.py#L267))

## Worked Example

If confidence rises from 3 to 4 and return intent falls from 4 to 2, that eligible session passes; a 4-to-4 confidence pair does not. ([`uat_kpis.py:L267-L287`](../../../../backend/ratings/uat_kpis.py#L267))

## Source

- [`uat_kpis.py:L38-L43`](../../../../backend/ratings/uat_kpis.py#L38)
- [`uat_kpis.py:L155-L169`](../../../../backend/ratings/uat_kpis.py#L155)
- [`uat_kpis.py:L267-L287`](../../../../backend/ratings/uat_kpis.py#L267)

## Tests

none found for direct OBJ-06 workbook formula assertions.

## Related

- [UAT KPI OBJ-01](uat-obj-01.md)
- [Formula and Algorithm Catalog](README.md)

## Back to index

- [Formula and Algorithm Catalog](README.md)

