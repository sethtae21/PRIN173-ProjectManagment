---
id: api-post-ratings-uat-response
title: POST /ratings/uat/response/
category: api
status: draft
source_of_truth: [backend/ratings/urls.py, backend/ratings/views.py, backend/ratings/serializers.py, backend/ratings/models.py]
related: []
updated: 2026-11-21
source_sha: 6a6bbff50666363b3eba5586f6fb75526a9d9d5c
source_branch: docs/kb-wip
---

## Endpoint

`POST /ratings/uat/response/`. The route has no path parameters.

## Auth

Authenticated shopper; the referenced UAT session must belong to the caller.

## Request

JSON `session_id`, `product_id`, `question_key` (or `key`), and `value`; optional `phase` defaults to `before`.

## Response

`201` when a response is created or `200` when the matching session/product/question/phase row is updated. The body contains `created` and a serialized response.

## Errors

`400`: required fields are missing, question key is unknown, or value is not a whole number within the configured range. `403`: caller is not a shopper. `404`: session is missing or not owned by the caller.

## Side Effects

Creates or updates one answer for the matching session, product, question, and phase. A successful shopper submission has not been located in tests.

## Source

- Route and prefix mount: [`urls.py`](../../../../backend/ratings/urls.py#L20) L20; [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L18) L18.
- Shopper/session checks, input validation, upsert, and response: [`views.py`](../../../../backend/ratings/views.py#L293) L293–381.
- Serialized UAT response fields: [`serializers.py`](../../../../backend/ratings/serializers.py#L62) L62–72.
- Configured value bounds: [`models.py`](../../../../backend/ratings/models.py#L16) L16–17.

## Tests

none found for a successful shopper submission; [`test_uat_response_seller_rejected`](../../../../backend/ratings/tests.py#L332) and guest-denial tests at [`tests.py`](../../../../backend/ratings/tests.py#L423) cover rejected calls only.

TODO: Add a successful shopper response test, including answer creation and update behavior.

## Related

- [Ratings API routes](README.md).

## Back to index

- [Ratings API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
