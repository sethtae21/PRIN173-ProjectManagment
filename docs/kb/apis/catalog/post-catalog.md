---
id: api-post-catalog
title: POST /catalog/
category: api
status: draft
source_of_truth: [backend/catalog/urls.py, backend/catalog/views/core.py, backend/catalog/serializers.py, backend/catalog/models.py]
related: [api-get-catalog]
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`POST /catalog/`. No path parameters.

## Auth

Seller-only (`IsSeller`).

## Request

The router exposes the inherited `ModelViewSet.create` action with `CatalogItemSerializer` fields. `seller`, `store_name`, `status`, and batch fields are read-only in the serializer.

## Response

The inherited create action uses DRF's standard create response shape. A successful creation was not verified: the local viewset does not override `perform_create`, while `CatalogItem.seller` is required and serializer-read-only.

## Errors

`400`: serializer validation. Authentication/role failures follow DRF permission behavior. The exact response for missing server-side seller assignment is unverified.

## Side Effects

No local create override or owner assignment was found; do not rely on this route until its runtime behavior is verified.

## Source

- Routed handler `CatalogViewSet.create` is inherited from `ModelViewSet`; local class and serializer binding are at [`core.py`](../../../../backend/catalog/views/core.py#L717) L717–720.
- Router registration `router.register(r'catalog', ...)`, [`catalog/urls.py`](../../../../backend/catalog/urls.py#L7) L7; router inclusion L23 and root mount [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L13) L13.
- Read-only serializer fields: [`serializers.py`](../../../../backend/catalog/serializers.py#L8) L8–21; required `seller` field: [`models.py`](../../../../backend/catalog/models.py#L45) L45–71.

## Tests

none found for `POST /catalog/`.

## Related

- Sibling: [GET](get-catalog.md).

## Back to index

- [Catalog API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
