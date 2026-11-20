---
id: api-get-ratings-uat-export
title: GET /ratings/uat/export/
category: api
status: draft
source_of_truth: [backend/ratings/urls.py, backend/ratings/views.py, backend/ratings/uat_kpis.py]
related: []
updated: 2026-11-21
source_sha: 6a6bbff50666363b3eba5586f6fb75526a9d9d5c
source_branch: docs/kb-wip
---

## Endpoint

`GET /ratings/uat/export/`. The route has no path parameters.

## Auth

Authenticated staff user.

## Request

No request body.

## Response

`200`: CSV attachment named `fitfusion_uat_results.csv`, containing the UAT KPI workbook rows.

## Errors

`403`: authenticated caller is not staff.

## Side Effects

Read-only export. A successful staff download has not been located in tests.

## Source

- Route and prefix mount: [`urls.py`](../../../../backend/ratings/urls.py#L21) L21; [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L18) L18.
- Authentication and staff-only check (`is_staff`, otherwise `403`): [`views.py`](../../../../backend/ratings/views.py#L385) L385, L388–390.
- CSV headers, row writing, and attachment filename: [`views.py`](../../../../backend/ratings/views.py#L391) L391–410.
- Export row builder: [`uat_kpis.py`](../../../../backend/ratings/uat_kpis.py#L372) L372 onward.

## Tests

none found for a successful staff export; [`test_guest_cannot_export_uat_workbook`](../../../../backend/ratings/tests.py#L464) covers guest denial only.

TODO: Add a successful staff export test and verify the CSV response.

## Related

- [Ratings API routes](README.md).

## Back to index

- [Ratings API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
