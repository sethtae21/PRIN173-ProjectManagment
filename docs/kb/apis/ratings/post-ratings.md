---
id: api-post-ratings
title: POST /ratings/
category: api
status: verified
source_of_truth: [backend/ratings/urls.py, backend/ratings/views.py, backend/ratings/serializers.py]
related: []
updated: 2026-11-21
source_sha: 6a6bbff50666363b3eba5586f6fb75526a9d9d5c
source_branch: docs/kb-wip
---

## Endpoint

`POST /ratings/`. The route has no path parameters.

## Auth

Public route; only registered shoppers may persist ratings. Guests and sellers receive `403`.

## Request

JSON `target_type`, `target_id`, integer `score` from 1 to 5, and a supported `source`. Legacy `vote`, `like`, and `dislike` keys are rejected.

## Response

`201` when a rating is created, or `200` when the caller's existing rating for the same target and source is updated. The response includes `persisted`, `created`, and the serialized rating.

## Errors

`400`: invalid payload or unsupported source. `403`: guest or non-shopper.

## Side Effects

Creates or upserts one rating for the shopper, target, and source. Guest attempts are not persisted.

## Source

- Route: [`urls.py`](../../../../backend/ratings/urls.py#L15) L15; ratings prefix mount: [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L18) L18.
- Shopper checks, source validation, upsert, and response: [`views.py`](../../../../backend/ratings/views.py#L59) L59–124.
- Required star-only payload and strict integer/range validation: [`serializers.py`](../../../../backend/ratings/serializers.py#L17) L17–71.

## Tests

- [`test_star_persists`](../../../../backend/ratings/tests.py#L50) checks successful creation.
- [`test_upsert_same_user_target_source_keeps_one_row`](../../../../backend/ratings/tests.py#L171) checks an update reuses the row.
- [`test_guest_submit_rejected_and_not_persisted`](../../../../backend/ratings/tests.py#L217) and [`test_seller_submit_rejected_and_not_persisted`](../../../../backend/ratings/tests.py#L237) check role restrictions.

## Related

- [Ratings API routes](README.md).

## Back to index

- [Ratings API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
