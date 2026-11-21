---
id: formula-uat-obj-02
title: UAT KPI OBJ-02 guest first try-on
category: formula
status: verified
source_of_truth: [backend/ratings/uat_kpis.py]
related: [docs-kb-formulas-index]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Purpose

Document OBJ-02's observed guest try-on acceptance criterion. Its workbook row is manual evidence, not a calculated survey KPI. ([`uat_kpis.py:L48-L55`](../../../../backend/ratings/uat_kpis.py#L48); [`uat_kpis.py:L396-L403`](../../../../backend/ratings/uat_kpis.py#L396))

## Formula

Pass the observed criterion when a first-time Guest completes one virtual try-on in no more than 2 minutes, without training or registration and with zero photo uploads. The workbook leaves calculated result fields unset and uses manual evidence status. ([`uat_kpis.py:L396-L403`](../../../../backend/ratings/uat_kpis.py#L396))

## Inputs

Observed UAT session timing and upload audit; subjective survey ratings are explicitly not a substitute. ([`uat_kpis.py:L396-L403`](../../../../backend/ratings/uat_kpis.py#L396))

## Outputs

A manual-evidence row with no fabricated numeric actual result. ([`uat_kpis.py:L137-L151`](../../../../backend/ratings/uat_kpis.py#L137); [`uat_kpis.py:L396-L403`](../../../../backend/ratings/uat_kpis.py#L396))

## Units & Rounding

Time budget is 2 minutes; the source does not define a workbook rounding rule for observed timing. ([`uat_kpis.py:L48-L48`](../../../../backend/ratings/uat_kpis.py#L48))

## Edge Cases

Exactly 2 minutes meets the stated `≤` boundary; any photo upload or failure to meet the guest conditions does not. No survey percentage is computed for this row. ([`uat_kpis.py:L396-L403`](../../../../backend/ratings/uat_kpis.py#L396))

## Worked Example

An observed first try-on completed in 1 minute 55 seconds with no training, registration, or photo upload meets the stated threshold. ([`uat_kpis.py:L396-L403`](../../../../backend/ratings/uat_kpis.py#L396))

## Source

- [`uat_kpis.py:L48-L48`](../../../../backend/ratings/uat_kpis.py#L48)
- [`uat_kpis.py:L396-L403`](../../../../backend/ratings/uat_kpis.py#L396)

## Tests

none found for direct OBJ-02 measurement assertions.

## Related

- [Formula and Algorithm Catalog](README.md)

## Back to index

- [Formula and Algorithm Catalog](README.md)

