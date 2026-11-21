---
id: formula-uat-obj-03
title: UAT KPI OBJ-03 performance budgets
category: formula
status: verified
source_of_truth: [backend/ratings/uat_kpis.py]
related: [docs-kb-formulas-index]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Purpose

Record the observed performance acceptance budgets represented by OBJ-03. The workbook expects measured evidence rather than calculating values from survey responses. ([`uat_kpis.py:L49-L52`](../../../../backend/ratings/uat_kpis.py#L49); [`uat_kpis.py:L404-L412`](../../../../backend/ratings/uat_kpis.py#L404))

## Formula

The stated criterion is: at least 95% of catalog/filtering/recommendation/commerce API requests are below 500 ms; canvas overlay/view/proportion renders are below 1 second; initial page load is below 3 seconds. The row is marked manual evidence. ([`uat_kpis.py:L49-L52`](../../../../backend/ratings/uat_kpis.py#L49); [`uat_kpis.py:L404-L412`](../../../../backend/ratings/uat_kpis.py#L404))

## Inputs

Automated API performance run, canvas-render benchmark, and load-time test measurements. ([`uat_kpis.py:L404-L412`](../../../../backend/ratings/uat_kpis.py#L404))

## Outputs

A manual-evidence workbook row; this module does not compute the measurements or populate an actual result. ([`uat_kpis.py:L137-L151`](../../../../backend/ratings/uat_kpis.py#L137); [`uat_kpis.py:L404-L412`](../../../../backend/ratings/uat_kpis.py#L404))

## Units & Rounding

Request latency is milliseconds; canvas render and page-load budgets are seconds; API request coverage is a percentage. ([`uat_kpis.py:L49-L52`](../../../../backend/ratings/uat_kpis.py#L49))

## Edge Cases

The latency and duration boundaries are strict `<` limits; exactly 500 ms, 1 second, or 3 seconds does not satisfy its corresponding budget. ([`uat_kpis.py:L404-L412`](../../../../backend/ratings/uat_kpis.py#L404))

## Worked Example

An API performance run with 95% of the measured covered requests below 500 ms meets the API portion; the canvas and page-load limits must also be evidenced separately. ([`uat_kpis.py:L49-L52`](../../../../backend/ratings/uat_kpis.py#L49); [`uat_kpis.py:L404-L412`](../../../../backend/ratings/uat_kpis.py#L404))

## Source

- [`uat_kpis.py:L49-L52`](../../../../backend/ratings/uat_kpis.py#L49)
- [`uat_kpis.py:L404-L412`](../../../../backend/ratings/uat_kpis.py#L404)

## Tests

none found for direct OBJ-03 measurement assertions.

## Related

- [Formula and Algorithm Catalog](README.md)

## Back to index

- [Formula and Algorithm Catalog](README.md)

