---
id: api-get-cart
title: GET /cart/
category: api
status: verified
source_of_truth: [backend/commerce/urls.py, backend/commerce/views.py, backend/commerce/serializers.py]
related: []
updated: 2026-11-21
source_sha: 6a6bbff50666363b3eba5586f6fb75526a9d9d5c
source_branch: docs/kb-wip
---

## Endpoint

`GET /cart/`. The route has no path parameters.

## Auth

Authenticated user (`IsAuthenticated`).

## Request

No request body.

## Response

`200`: the caller's cart with serialized items, `total_amount`, `item_count`, `created_at`, and `updated_at`.

## Errors

Authentication failures follow the REST framework permission response.

## Side Effects

Creates an empty cart for the caller when one does not already exist.

## Source

- `CartViewSet` requires authentication, obtains the caller's cart, and returns it from `list`: [`views.py`](../../../../backend/commerce/views.py#L63) L63–93.
- Cart response fields: [`serializers.py`](../../../../backend/commerce/serializers.py#L101) L101–121.
- Router registration and root mount: [`commerce/urls.py`](../../../../backend/commerce/urls.py#L10) L10–15; [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L15) L15.

## Tests

- [`test_cart_crud_round_trip`](../../../../backend/commerce/tests.py#L59) checks an empty-cart `GET`.

## Related

- [Commerce API routes](README.md).

## Back to index

- [Commerce API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
