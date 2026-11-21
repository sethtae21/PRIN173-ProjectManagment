---
id: formula-uat-obj-04
title: UAT KPI OBJ-04 security and privacy checklist
category: formula
status: verified
source_of_truth: [backend/ratings/uat_kpis.py]
related: [docs-kb-formulas-index]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Purpose

Document OBJ-04's manual security/privacy checklist acceptance target. ([`uat_kpis.py:L53-L53`](../../../../backend/ratings/uat_kpis.py#L53); [`uat_kpis.py:L413-L419`](../../../../backend/ratings/uat_kpis.py#L413))

## Formula

The target is 100% pass on the Security & Privacy checklist covering the listed controls: TLS 1.2+, Argon2id, server-side RBAC, ephemeral guests, and no photo upload. The workbook row uses manual audit evidence. ([`uat_kpis.py:L413-L419`](../../../../backend/ratings/uat_kpis.py#L413))

## Inputs

Security and privacy checklist audit evidence; no checklist item count or automated computation is defined in this module. ([`uat_kpis.py:L413-L419`](../../../../backend/ratings/uat_kpis.py#L413))

## Outputs

A manual-evidence row with actual result and sample size left unset until measured evidence is provided. ([`uat_kpis.py:L137-L151`](../../../../backend/ratings/uat_kpis.py#L137); [`uat_kpis.py:L413-L419`](../../../../backend/ratings/uat_kpis.py#L413))

## Units & Rounding

Target is a percentage; the source defines no rounding or checklist denominator. ([`uat_kpis.py:L53-L53`](../../../../backend/ratings/uat_kpis.py#L53))

## Edge Cases

Any checklist result below 100% is below target. The source does not provide a computed fallback or treat subjective survey answers as evidence. ([`uat_kpis.py:L137-L151`](../../../../backend/ratings/uat_kpis.py#L137); [`uat_kpis.py:L413-L419`](../../../../backend/ratings/uat_kpis.py#L413))

## Worked Example

If every checklist item in the audit passes, the pass percentage is 100% and the target is met; the checklist denominator must come from the audit evidence. ([`uat_kpis.py:L53-L53`](../../../../backend/ratings/uat_kpis.py#L53); [`uat_kpis.py:L413-L419`](../../../../backend/ratings/uat_kpis.py#L413))

## Source

- [`uat_kpis.py:L53-L53`](../../../../backend/ratings/uat_kpis.py#L53)
- [`uat_kpis.py:L413-L419`](../../../../backend/ratings/uat_kpis.py#L413)

## Tests

none found for direct OBJ-04 checklist percentage assertions.

## Related

- [Formula and Algorithm Catalog](README.md)

## Back to index

- [Formula and Algorithm Catalog](README.md)

