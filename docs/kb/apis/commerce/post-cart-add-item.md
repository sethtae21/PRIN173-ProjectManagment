---
id: api-post-cart-add-item
title: POST /cart/add_item/
category: api
status: verified
source_of_truth: [backend/commerce/urls.py, backend/commerce/views.py, backend/commerce/serializers.py]
related: []
updated: 2026-11-21
source_sha: 6a6bbff50666363b3eba5586f6fb75526a9d9d5c
source_branch: docs/kb-wip
---

## Endpoint

`POST /cart/add_item/`. The route has no path parameters.

## Auth

Authenticated user (`IsAuthenticated`).

## Request

JSON `catalog_item` and optional positive integer `quantity` (defaults to `1`). The catalog item must exist and have active status.

## Response

`200`: the updated cart.

## Errors

Invalid input or an unavailable catalog item fails serializer validation; authentication failures follow the REST framework permission response.

## Side Effects

Adds the item or increases its existing cart quantity, refreshes the item's cart snapshot fields, and records the cart-created UAT event when applicable.

## Source

- Action, validation, quantity update, snapshot fields, and UAT event: [`views.py`](../../../../backend/commerce/views.py#L95) L95–120.
- Request validation: [`serializers.py`](../../../../backend/commerce/serializers.py#L130) L130–143.
- Router registration and root mount: [`commerce/urls.py`](../../../../backend/commerce/urls.py#L10) L10–15; [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L15) L15.

## Tests

- [`test_cart_crud_round_trip`](../../../../backend/commerce/tests.py#L59) adds an item and checks the updated cart.

## Related

- [Commerce API routes](README.md).

## Back to index

- [Commerce API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
