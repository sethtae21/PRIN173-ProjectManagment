---
id: formula-uat-obj-09
title: UAT KPI OBJ-09 uncorrected item publication
category: formula
status: verified
source_of_truth: [backend/ratings/uat_kpis.py]
related: [docs-kb-formulas-index]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Purpose

Document OBJ-09's manual audit criterion for CSV-uploaded items published without manual correction. ([`uat_kpis.py:L38-L43`](../../../../backend/ratings/uat_kpis.py#L38); [`uat_kpis.py:L447-L454`](../../../../backend/ratings/uat_kpis.py#L447))

## Formula

`100 × CSV-uploaded items published without manual correction / audited CSV-uploaded items`; target is at least 80%. The workbook uses a Seller Dashboard validation-report audit as manual evidence rather than calculating the percentage. ([`uat_kpis.py:L38-L43`](../../../../backend/ratings/uat_kpis.py#L38); [`uat_kpis.py:L447-L454`](../../../../backend/ratings/uat_kpis.py#L447))

## Inputs

Seller Dashboard validation-report audit evidence identifying published items and manual corrections. ([`uat_kpis.py:L447-L454`](../../../../backend/ratings/uat_kpis.py#L447))

## Outputs

A manual-evidence row; numeric results remain unset until the audit supplies measurements. ([`uat_kpis.py:L137-L151`](../../../../backend/ratings/uat_kpis.py#L137); [`uat_kpis.py:L447-L454`](../../../../backend/ratings/uat_kpis.py#L447))

## Units & Rounding

Target is a percentage; the source does not specify the audit denominator or rounding convention. ([`uat_kpis.py:L447-L454`](../../../../backend/ratings/uat_kpis.py#L447))

## Edge Cases

Subjective seller-validation survey responses are context only and cannot replace the audit evidence. ([`uat_kpis.py:L16-L16`](../../../../backend/ratings/uat_kpis.py#L16); [`uat_kpis.py:L363-L365`](../../../../backend/ratings/uat_kpis.py#L363))

## Worked Example

Eight items published without correction among ten audited items yield 80%, meeting the target; this is illustrative arithmetic, not a value computed by the module. ([`uat_kpis.py:L38-L43`](../../../../backend/ratings/uat_kpis.py#L38); [`uat_kpis.py:L447-L454`](../../../../backend/ratings/uat_kpis.py#L447))

## Source

- [`uat_kpis.py:L16-L16`](../../../../backend/ratings/uat_kpis.py#L16)
- [`uat_kpis.py:L38-L43`](../../../../backend/ratings/uat_kpis.py#L38)
- [`uat_kpis.py:L447-L454`](../../../../backend/ratings/uat_kpis.py#L447)

## Tests

none found for direct OBJ-09 audit percentage assertions.

## Related

- [Formula and Algorithm Catalog](README.md)

## Back to index

- [Formula and Algorithm Catalog](README.md)

