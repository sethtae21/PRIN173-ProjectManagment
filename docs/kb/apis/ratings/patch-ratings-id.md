---
id: api-patch-ratings-id
title: PATCH /ratings/{pk}/
category: api
status: draft
source_of_truth: [backend/ratings/urls.py, backend/ratings/views.py, backend/ratings/serializers.py]
related: [api-delete-ratings-id]
updated: 2026-11-21
source_sha: 6a6bbff50666363b3eba5586f6fb75526a9d9d5c
source_branch: docs/kb-wip
---

## Endpoint

`PATCH /ratings/{pk}/`. `pk` identifies the rating.

## Auth

Authenticated user; the rating must belong to that user, and the caller must be a shopper.

## Request

Partial rating payload. The handler applies an included `score` field.

## Response

`200`: the serialized rating.

## Errors

`400`: invalid rating data. `403`: the caller is not a shopper. `404`: the rating is not owned by the caller.

## Side Effects

Updates the owner's rating score and timestamp. The successful update path is not covered by a located route test.

## Source

- Detail route and ratings prefix mount: [`urls.py`](../../../../backend/ratings/urls.py#L22) L22; [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L18) L18.
- Owner lookup, shopper check, partial validation, and score update: [`views.py`](../../../../backend/ratings/views.py#L211) L211–240.
- Strict star validation: [`serializers.py`](../../../../backend/ratings/serializers.py#L17) L17–71.

## Tests

none found for a successful owner `PATCH`; [`test_owner_only_update_delete`](../../../../backend/ratings/tests.py#L251) checks that another user's patch returns `404`.

TODO: Add a successful owner `PATCH` test and verify the updated response.

## Related

- Sibling method: [DELETE](delete-ratings-id.md).

## Back to index

- [Ratings API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
