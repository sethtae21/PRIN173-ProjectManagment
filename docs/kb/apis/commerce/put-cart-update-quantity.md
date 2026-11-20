---
id: api-put-cart-update-quantity
title: PUT /cart/update_quantity/
category: api
status: draft
source_of_truth: [backend/commerce/urls.py, backend/commerce/views.py, backend/commerce/serializers.py]
related: [api-patch-cart-update-quantity]
updated: 2026-11-21
source_sha: 6a6bbff50666363b3eba5586f6fb75526a9d9d5c
source_branch: docs/kb-wip
---

## Endpoint

`PUT /cart/update_quantity/`. The route has no path parameters.

## Auth

Authenticated user (`IsAuthenticated`).

## Request

JSON `catalog_item` identifier and positive integer replacement `quantity`.

## Response

`200`: the caller's updated cart.

## Errors

The shared handler returns `400` for unavailable items or invalid input and `404` when the item is not in the caller's cart.

## Side Effects

The shared `update_quantity` handler replaces the quantity for an item already in the caller's cart. A successful `PUT` case has not been located in tests.

## Source

- `update_quantity` is exposed for `PUT` and `PATCH` and saves the replacement quantity: [`views.py`](../../../../backend/commerce/views.py#L122) L122–152.
- Request fields and positive-quantity validation: [`serializers.py`](../../../../backend/commerce/serializers.py#L130) L130–147.
- Router registration and root mount: [`commerce/urls.py`](../../../../backend/commerce/urls.py#L10) L10–15; [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L15) L15.

## Tests

none found for a successful `PUT /cart/update_quantity/`; the `PATCH` sibling is covered by [`test_cart_crud_round_trip`](../../../../backend/commerce/tests.py#L59).

TODO: Verify successful `PUT /cart/update_quantity/` behavior with a route-level test.

## Related

- Sibling method: [PATCH](patch-cart-update-quantity.md).

## Back to index

- [Commerce API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
