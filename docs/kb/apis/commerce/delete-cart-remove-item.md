---
id: api-delete-cart-remove-item
title: DELETE /cart/remove_item/
category: api
status: draft
source_of_truth: [backend/commerce/urls.py, backend/commerce/views.py, backend/commerce/serializers.py]
related: [api-post-cart-remove-item]
updated: 2026-11-21
source_sha: 6a6bbff50666363b3eba5586f6fb75526a9d9d5c
source_branch: docs/kb-wip
---

## Endpoint

`DELETE /cart/remove_item/`. The route has no path parameters.

## Auth

Authenticated user (`IsAuthenticated`).

## Request

JSON `catalog_item` identifier.

## Response

`200`: the caller's updated cart.

## Errors

Invalid or unavailable catalog-item input fails serializer validation; authentication failures follow the REST framework permission response.

## Side Effects

The shared `remove_item` handler removes the specified item from the caller's cart. A successful `DELETE` case has not been located in tests.

## Source

- `remove_item` is exposed for `DELETE` and `POST` and removes the item from the caller's cart: [`views.py`](../../../../backend/commerce/views.py#L154) L154–173.
- The request identifier is validated by `AddToCartSerializer`: [`serializers.py`](../../../../backend/commerce/serializers.py#L130) L130–143.
- Router registration and root mount: [`commerce/urls.py`](../../../../backend/commerce/urls.py#L10) L10–15; [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L15) L15.

## Tests

none found for a successful `DELETE /cart/remove_item/`; the test suite uses `DELETE` only for an unauthenticated request in [`test_guest_rejected_from_cart_and_checkout`](../../../../backend/commerce/tests.py#L110).

TODO: Verify successful `DELETE /cart/remove_item/` behavior with a route-level test.

## Related

- Sibling method: [POST](post-cart-remove-item.md).

## Back to index

- [Commerce API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
