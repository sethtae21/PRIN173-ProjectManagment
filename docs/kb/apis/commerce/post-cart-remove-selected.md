---
id: api-post-cart-remove-selected
title: POST /cart/remove_selected/
category: api
status: verified
source_of_truth: [backend/commerce/urls.py, backend/commerce/views.py, backend/commerce/serializers.py]
related: []
updated: 2026-11-21
source_sha: 6a6bbff50666363b3eba5586f6fb75526a9d9d5c
source_branch: docs/kb-wip
---

## Endpoint

`POST /cart/remove_selected/`. The route has no path parameters.

## Auth

Authenticated user (`IsAuthenticated`).

## Request

JSON `catalog_items`: a non-empty list of catalog-item identifiers.

## Response

`200`: the caller's updated cart.

## Errors

Invalid input fails serializer validation; authentication failures follow the REST framework permission response.

## Side Effects

Removes selected items from the caller's cart only.

## Source

- `remove_selected` validates the selection, deletes matching cart entries for the caller, and returns the cart: [`views.py`](../../../../backend/commerce/views.py#L175) L175–192.
- The request requires a non-empty `catalog_items` list: [`serializers.py`](../../../../backend/commerce/serializers.py#L149) L149–153.
- Router registration and root mount: [`commerce/urls.py`](../../../../backend/commerce/urls.py#L10) L10–15; [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L15) L15.

## Tests

- [`test_remove_selected_items_only_removes_current_users_selection`](../../../../backend/commerce/tests.py#L133) verifies removal is scoped to the current user's cart.

## Related

- [Commerce API routes](README.md).

## Back to index

- [Commerce API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
