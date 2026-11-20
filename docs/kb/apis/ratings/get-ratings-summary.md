---
id: api-get-ratings-summary
title: GET /ratings/summary/
category: api
status: verified
source_of_truth: [backend/ratings/urls.py, backend/ratings/views.py, backend/ratings/serializers.py, Frontend/src/services/api.js]
related: []
updated: 2026-11-21
source_sha: 6a6bbff50666363b3eba5586f6fb75526a9d9d5c
source_branch: docs/kb-wip
---

## Endpoint

`GET /ratings/summary/`. The route has no path parameters.

## Auth

Public (`AllowAny`).

## Request

The frontend sends query parameters `target_type` and `target_id`. Both are required by the endpoint. Optional `source` is also accepted by the endpoint to filter the aggregate to one rating source.

## Response

`200`: target identifiers, selected source (`all` when omitted), score count, average, counts for each star value, and approval count.

## Errors

`400`: either required target parameter is missing or the optional source is unsupported.

## Side Effects

Read-only aggregate over matching ratings.

## Source

- Route and prefix mount: [`urls.py`](../../../../backend/ratings/urls.py#L16) L16; [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L18) L18.
- Public permission, required query parameters, optional source filter, and aggregate calculation: [`views.py`](../../../../backend/ratings/views.py#L126) L126–180.
- Response fields: [`serializers.py`](../../../../backend/ratings/serializers.py#L74) L74–84.
- Frontend request query string contains `target_type` and `target_id`: [`api.js`](../../../../Frontend/src/services/api.js#L509) L509–513.

## Tests

- [`test_summary_filters_by_source_and_counts_approvals`](../../../../backend/ratings/tests.py#L186) checks filtering and summary fields.
- [`test_summary_approval_threshold_is_four`](../../../../backend/ratings/tests.py#L209) checks the approval threshold.

## Related

- [Ratings API routes](README.md).

## Back to index

- [Ratings API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
