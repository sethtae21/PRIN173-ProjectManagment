---
id: api-get-catalog-my-listings-underscore
title: GET /catalog/my_listings/
category: api
status: verified
source_of_truth: [backend/catalog/urls.py, backend/catalog/views/core.py, backend/catalog/serializers.py]
related: [api-get-catalog-my-listings-alias]
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`GET /catalog/my_listings/` (underscore preserved). No path parameters.

## Auth

Seller-only (`IsSeller`).

## Request

No request body.

## Response

`200`: serialized listings owned by the authenticated seller, ordered newest first.

## Errors

`401`/`403`: unauthenticated or non-seller.

## Side Effects

Read-only.

## Source

- Handler `CatalogViewSet.my_listings`, [`core.py`](../../../../backend/catalog/views/core.py#L968) L968–979.
- Router action registration via [`catalog/urls.py`](../../../../backend/catalog/urls.py#L7) L7; router inclusion L23 and root mount [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L13) L13. The underscore is the action's generated route path.

## Tests

none found for the underscore route; the hyphen route is covered by [`test_seller_can_list_and_manage_own_items`](../../../../backend/catalog/tests.py#L497).

## Related

- Hyphen alias: [GET /catalog/my-listings/](get-catalog-my-listings-alias.md).

## Back to index

- [Catalog API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
