---
id: api-delete-catalog-id
title: DELETE /catalog/{pk}/
category: api
status: verified
source_of_truth: [backend/catalog/urls.py, backend/catalog/views/core.py, backend/catalog/models.py]
related: [api-get-catalog-id, api-put-catalog-id, api-patch-catalog-id]
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`DELETE /catalog/{pk}/`. `pk` is the catalog item's router-captured identifier.

## Auth

Seller-only (`IsSeller`).

## Request

No request body.

## Response

The inherited `ModelViewSet.destroy` action returns `204 No Content` on success.

## Errors

`404`: no active item matches `pk`. Authentication/role failures follow DRF permission behavior.

## Side Effects

Deletes an active item selected by the viewset's active-only queryset. No seller filter is present in that queryset. Model deletion cleanup is connected to the post-delete signal.

## Source

- Routed handler `CatalogViewSet.destroy` is inherited from `ModelViewSet`; viewset class/queryset at [`core.py`](../../../../backend/catalog/views/core.py#L717) L717–720 and L737–739.
- Router registration `router.register(r'catalog', ...)`, [`catalog/urls.py`](../../../../backend/catalog/urls.py#L7) L7; router inclusion L23 and root mount [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L13) L13.
- Image cleanup signal: [`models.py`](../../../../backend/catalog/models.py#L97) L97–121.

## Tests

none found for the router detail `DELETE /catalog/{pk}/` route.

## Related

- Siblings: [GET](get-catalog-id.md), [PUT](put-catalog-id.md), [PATCH](patch-catalog-id.md).

## Back to index

- [Catalog API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
