---
id: api-patch-cart-update-quantity
title: PATCH /cart/update_quantity/
category: api
status: verified
source_of_truth: [backend/commerce/urls.py, backend/commerce/views.py, backend/commerce/serializers.py]
related: [api-put-cart-update-quantity]
updated: 2026-11-21
source_sha: 6a6bbff50666363b3eba5586f6fb75526a9d9d5c
source_branch: docs/kb-wip
---

## Endpoint

`PATCH /cart/update_quantity/`. The route has no path parameters.

## Auth

Authenticated user (`IsAuthenticated`).

## Request

JSON `catalog_item` identifier and positive integer replacement `quantity`.

## Response

`200`: the caller's updated cart.

## Errors

`400`: item is unavailable because its seller account was deleted, or request validation fails. `404`: the item is not in the caller's cart.

## Side Effects

Replaces the quantity for an item already in the caller's cart.

## Source

- `update_quantity` is exposed for `PATCH` and `PUT`, validates the item, checks cart ownership and availability, and saves the replacement quantity: [`views.py`](../../../../backend/commerce/views.py#L122) L122–152.
- Request fields and positive-quantity validation: [`serializers.py`](../../../../backend/commerce/serializers.py#L130) L130–147.
- Router registration and root mount: [`commerce/urls.py`](../../../../backend/commerce/urls.py#L10) L10–15; [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L15) L15.

## Tests

- [`test_cart_crud_round_trip`](../../../../backend/commerce/tests.py#L59) updates quantity using `PATCH`.

## Related

- Sibling method: [PUT](put-cart-update-quantity.md).

## Back to index

- [Commerce API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
