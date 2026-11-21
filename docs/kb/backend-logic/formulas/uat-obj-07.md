---
id: formula-uat-obj-07
title: UAT KPI OBJ-07 mock checkout completion
category: formula
status: verified
source_of_truth: [backend/ratings/uat_kpis.py]
related: [docs-kb-formulas-index]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Purpose

Define OBJ-07 as completed mock checkouts divided by UAT carts created, using server-side session evidence. ([`uat_kpis.py:L38-L43`](../../../../backend/ratings/uat_kpis.py#L38); [`uat_kpis.py:L290-L315`](../../../../backend/ratings/uat_kpis.py#L290))

## Formula

`100 × sessions with checkout_completed=true and cart_created=true / sessions with cart_created=true`. The target is at least 70%. The function treats its per-session flags as exact cart counts under the singleton-cart contract described in its docstring. ([`uat_kpis.py:L290-L315`](../../../../backend/ratings/uat_kpis.py#L290))

## Inputs

UAT sessions' JSON notes containing server-recorded `cart_created` and `checkout_completed` booleans. ([`uat_kpis.py:L290-L315`](../../../../backend/ratings/uat_kpis.py#L290); [`uat_kpis.py:L465-L484`](../../../../backend/ratings/uat_kpis.py#L465))

## Outputs

Percentage, created-cart denominator, completed-cart numerator, status, and evidence reference; no created carts produces Not Run. ([`uat_kpis.py:L190-L203`](../../../../backend/ratings/uat_kpis.py#L190); [`uat_kpis.py:L290-L315`](../../../../backend/ratings/uat_kpis.py#L290))

## Units & Rounding

Percentage is formatted to two decimal places; numerator and denominator count per-session cart flags. ([`uat_kpis.py:L190-L203`](../../../../backend/ratings/uat_kpis.py#L190); [`uat_kpis.py:L290-L315`](../../../../backend/ratings/uat_kpis.py#L290))

## Edge Cases

Sessions without a true `cart_created` flag are excluded; checkout completion without a created-cart flag cannot enter the numerator. Client claims and manual POSTs are not accepted as evidence. ([`uat_kpis.py:L10-L16`](../../../../backend/ratings/uat_kpis.py#L10); [`uat_kpis.py:L290-L315`](../../../../backend/ratings/uat_kpis.py#L290))

## Worked Example

Seven completed checkouts out of ten created carts yield 70.00%, meeting the target. ([`uat_kpis.py:L38-L43`](../../../../backend/ratings/uat_kpis.py#L38); [`uat_kpis.py:L190-L203`](../../../../backend/ratings/uat_kpis.py#L190))

## Source

- [`uat_kpis.py:L10-L16`](../../../../backend/ratings/uat_kpis.py#L10)
- [`uat_kpis.py:L290-L315`](../../../../backend/ratings/uat_kpis.py#L290)
- [`uat_kpis.py:L465-L484`](../../../../backend/ratings/uat_kpis.py#L465)

## Tests

none found for direct OBJ-07 workbook formula assertions.

## Related

- [Formula and Algorithm Catalog](README.md)

## Back to index

- [Formula and Algorithm Catalog](README.md)

