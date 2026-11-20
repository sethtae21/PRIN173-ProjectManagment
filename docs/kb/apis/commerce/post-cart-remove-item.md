---
id: api-post-cart-remove-item
title: POST /cart/remove_item/
category: api
status: verified
source_of_truth: [backend/commerce/urls.py, backend/commerce/views.py, backend/commerce/serializers.py]
related: [api-delete-cart-remove-item]
updated: 2026-11-21
source_sha: 6a6bbff50666363b3eba5586f6fb75526a9d9d5c
source_branch: docs/kb-wip
---

## Endpoint

`POST /cart/remove_item/`. The route has no path parameters.

## Auth

Authenticated user (`IsAuthenticated`).

## Request

JSON `catalog_item` identifier.

## Response

`200`: the caller's updated cart.

## Errors

Invalid or unavailable catalog-item input fails serializer validation; authentication failures follow the REST framework permission response.

## Side Effects

Removes the specified item from the caller's cart, including a matching unavailable-item entry.

## Source

- `remove_item` is exposed for `POST` and `DELETE`, validates the item, removes matching entries, and returns the cart: [`views.py`](../../../../backend/commerce/views.py#L154) L154–173.
- The request identifier is validated by `AddToCartSerializer`: [`serializers.py`](../../../../backend/commerce/serializers.py#L130) L130–143.
- Router registration and root mount: [`commerce/urls.py`](../../../../backend/commerce/urls.py#L10) L10–15; [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L15) L15.

## Tests

- [`test_cart_crud_round_trip`](../../../../backend/commerce/tests.py#L59) removes an item using `POST`.

## Related

- Sibling method: [DELETE](delete-cart-remove-item.md).

## Back to index

- [Commerce API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
