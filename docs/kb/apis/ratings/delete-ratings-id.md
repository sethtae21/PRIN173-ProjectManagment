---
id: api-delete-ratings-id
title: DELETE /ratings/{pk}/
category: api
status: verified
source_of_truth: [backend/ratings/urls.py, backend/ratings/views.py]
related: [api-patch-ratings-id]
updated: 2026-11-21
source_sha: 6a6bbff50666363b3eba5586f6fb75526a9d9d5c
source_branch: docs/kb-wip
---

## Endpoint

`DELETE /ratings/{pk}/`. `pk` identifies the rating.

## Auth

Authenticated user; the rating must belong to that user, and the caller must be a shopper.

## Request

No request body.

## Response

`204`: rating deleted.

## Errors

`403`: the caller is not a shopper. `404`: the rating is not owned by the caller or does not exist.

## Side Effects

Deletes the caller's rating.

## Source

- Detail route and ratings prefix mount: [`urls.py`](../../../../backend/ratings/urls.py#L22) L22; [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L18) L18.
- Shopper check, owner lookup, deletion, and `204` response: [`views.py`](../../../../backend/ratings/views.py#L241) L241–255.

## Tests

- [`test_owner_only_update_delete`](../../../../backend/ratings/tests.py#L251) checks owner deletion and `404` for another user's rating.
- [`test_seller_cannot_delete_any_rating`](../../../../backend/ratings/tests.py#L261) checks the shopper-only restriction.

## Related

- Sibling method: [PATCH](patch-ratings-id.md).

## Back to index

- [Ratings API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
