---
id: formula-uat-obj-08
title: UAT KPI OBJ-08 CSV pipeline time
category: formula
status: verified
source_of_truth: [backend/ratings/uat_kpis.py]
related: [docs-kb-formulas-index]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Purpose

Document OBJ-08's observed CSV pipeline budget; the workbook row requires a timing run rather than computing performance data. ([`uat_kpis.py:L54-L55`](../../../../backend/ratings/uat_kpis.py#L54); [`uat_kpis.py:L440-L446`](../../../../backend/ratings/uat_kpis.py#L440))

## Formula

Run the 10-item CSV upload pipeline and compare its elapsed time with a strict `<60 seconds` budget. The workbook row is manual evidence. ([`uat_kpis.py:L54-L55`](../../../../backend/ratings/uat_kpis.py#L54); [`uat_kpis.py:L440-L446`](../../../../backend/ratings/uat_kpis.py#L440))

## Inputs

Measured elapsed time from the `measure_upload` run for the 10-item pipeline. ([`uat_kpis.py:L440-L446`](../../../../backend/ratings/uat_kpis.py#L440))

## Outputs

A manual-evidence workbook row; the KPI engine does not calculate or populate the elapsed time. ([`uat_kpis.py:L137-L151`](../../../../backend/ratings/uat_kpis.py#L137); [`uat_kpis.py:L440-L446`](../../../../backend/ratings/uat_kpis.py#L440))

## Units & Rounding

Pipeline size is item count; budget is seconds. The source does not specify rounding for measured elapsed time. ([`uat_kpis.py:L54-L55`](../../../../backend/ratings/uat_kpis.py#L54))

## Edge Cases

Exactly 60 seconds is outside the strict `<60` target; a different item count is not the stated objective. ([`uat_kpis.py:L440-L446`](../../../../backend/ratings/uat_kpis.py#L440))

## Worked Example

A 10-item measured run completing in 59.9 seconds meets the time budget. ([`uat_kpis.py:L54-L55`](../../../../backend/ratings/uat_kpis.py#L54); [`uat_kpis.py:L440-L446`](../../../../backend/ratings/uat_kpis.py#L440))

## Source

- [`uat_kpis.py:L54-L55`](../../../../backend/ratings/uat_kpis.py#L54)
- [`uat_kpis.py:L440-L446`](../../../../backend/ratings/uat_kpis.py#L440)

## Tests

none found for direct OBJ-08 timing assertions.

## Related

- [Formula and Algorithm Catalog](README.md)

## Back to index

- [Formula and Algorithm Catalog](README.md)

