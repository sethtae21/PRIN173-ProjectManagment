---
id: api-get-catalog-my-listings-alias
title: GET /catalog/my-listings/
category: api
status: verified
source_of_truth: [backend/catalog/urls.py, backend/catalog/views/core.py, backend/catalog/serializers.py]
related: [api-get-catalog-my-listings-underscore]
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`GET /catalog/my-listings/` (hyphen alias). No path parameters.

## Auth

Seller-only (`IsSeller`).

## Request

No request body.

## Response

`200`: serialized listings owned by the authenticated seller, ordered newest first.

## Errors

`401`/`403`: unauthenticated or non-seller.

## Side Effects

Read-only; this explicit path alias maps to the same `my_listings` handler as the underscore route.

## Source

- Handler `CatalogViewSet.my_listings`, [`core.py`](../../../../backend/catalog/views/core.py#L968) L968–979.
- Explicit route `path('catalog/my-listings/', ...)`, [`catalog/urls.py`](../../../../backend/catalog/urls.py#L22) L22; root mount [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L13) L13.

## Tests

none found for the list alias.

## Related

- Underscore route: [GET /catalog/my_listings/](get-catalog-my-listings-underscore.md).

## Back to index

- [Catalog API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
