---
id: api-get-catalog-id
title: GET /catalog/{pk}/
category: api
status: verified
source_of_truth: [backend/catalog/urls.py, backend/catalog/views/core.py, backend/catalog/serializers.py]
related: [api-put-catalog-id, api-patch-catalog-id, api-delete-catalog-id]
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`GET /catalog/{pk}/`. `pk` is the catalog item's router-captured identifier.

## Auth

Public (`AllowAny`).

## Request

No request body.

## Response

`200`: serialized active catalog item, including computed `size_cm`.

## Errors

`404`: item does not exist or is not active.

## Side Effects

Read-only; the viewset's base queryset contains active items only.

## Source

- Routed handler `CatalogViewSet.retrieve` is inherited from `ModelViewSet`; class/queryset at [`core.py`](../../../../backend/catalog/views/core.py#L717) L717–720 and L737–739.
- Router registration `router.register(r'catalog', ...)`, [`catalog/urls.py`](../../../../backend/catalog/urls.py#L7) L7; router inclusion L23 and root mount [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L13) L13.
- Serializer: [`serializers.py`](../../../../backend/catalog/serializers.py#L8) L8–41.

## Tests

none found for the router detail `GET /catalog/{pk}/` route.

## Related

- Siblings: [PUT](put-catalog-id.md), [PATCH](patch-catalog-id.md), [DELETE](delete-catalog-id.md).

## Back to index

- [Catalog API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
