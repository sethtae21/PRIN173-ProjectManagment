---
id: api-patch-catalog-id
title: PATCH /catalog/{pk}/
category: api
status: verified
source_of_truth: [backend/catalog/urls.py, backend/catalog/views/core.py, backend/catalog/serializers.py]
related: [api-get-catalog-id, api-put-catalog-id, api-delete-catalog-id]
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`PATCH /catalog/{pk}/`. `pk` is the catalog item's router-captured identifier.

## Auth

Seller-only (`IsSeller`).

## Request

JSON with one or more writable `CatalogItemSerializer` fields. `seller`, `store_name`, `status`, `rejection_reasons`, timestamps, and `batch` are read-only.

## Response

The inherited `ModelViewSet.partial_update` action returns the serialized updated item on success.

## Errors

`400`: serializer validation failure. `404`: no active item matches `pk`. Authentication/role failures follow DRF permission behavior.

## Side Effects

Partially updates an active item selected by the viewset's active-only queryset. No seller filter is present in that queryset.

## Source

- Routed handler `CatalogViewSet.partial_update` is inherited from `ModelViewSet`; viewset class/queryset at [`core.py`](../../../../backend/catalog/views/core.py#L717) L717–720 and L737–739.
- Router registration `router.register(r'catalog', ...)`, [`catalog/urls.py`](../../../../backend/catalog/urls.py#L7) L7; router inclusion L23 and root mount [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L13) L13.
- Serializer write/read-only contract and size validator: [`serializers.py`](../../../../backend/catalog/serializers.py#L8) L8–41.

## Tests

none found for the router detail `PATCH /catalog/{pk}/` route.

## Related

- Siblings: [GET](get-catalog-id.md), [PUT](put-catalog-id.md), [DELETE](delete-catalog-id.md).

## Back to index

- [Catalog API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
