---
id: api-delete-cart-clear
title: DELETE /cart/clear/
category: api
status: verified
source_of_truth: [backend/commerce/urls.py, backend/commerce/views.py]
related: [api-post-cart-clear]
updated: 2026-11-21
source_sha: 6a6bbff50666363b3eba5586f6fb75526a9d9d5c
source_branch: docs/kb-wip
---

## Endpoint

`DELETE /cart/clear/`. The route has no path parameters.

## Auth

Authenticated user (`IsAuthenticated`).

## Request

No request body.

## Response

`200`: the caller's updated cart.

## Errors

Authentication failures follow the REST framework permission response.

## Side Effects

Deletes all items from the caller's cart; the cart itself remains.

## Source

- `clear` is exposed for `DELETE` and removes all items from the current user's cart: [`views.py`](../../../../backend/commerce/views.py#L194) L194–199.
- Router registration and root mount: [`commerce/urls.py`](../../../../backend/commerce/urls.py#L10) L10–15; [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L15) L15.

## Tests

- [`test_cart_crud_round_trip`](../../../../backend/commerce/tests.py#L59) clears the authenticated user's cart with `DELETE`.

## Related

- Sibling method: [POST](post-cart-clear.md).

## Back to index

- [Commerce API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
