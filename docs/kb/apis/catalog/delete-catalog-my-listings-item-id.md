---
id: api-delete-catalog-my-listings-item-id
title: DELETE /catalog/my-listings/{item_id}/
category: api
status: verified
source_of_truth: [backend/catalog/urls.py, backend/catalog/views/core.py, backend/catalog/models.py]
related: [api-get-catalog-my-listings-item-id, api-put-catalog-my-listings-item-id, api-patch-catalog-my-listings-item-id]
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`DELETE /catalog/my-listings/{item_id}/`. `item_id` is the seller listing identifier.

## Auth

Seller-only (`IsSeller`) and restricted to the authenticated seller's item.

## Request

No request body.

## Response

`204 No Content` when deletion succeeds.

## Errors

`404`: item is missing or not seller-owned. `503`: image storage is unavailable when the item has image references; deletion is refused. `401`/`403`: unauthenticated or non-seller.

## Side Effects

Deletes the seller-owned item. GridFS cleanup is handled by the model post-delete signal.

## Source

- Handler `CatalogViewSet.my_listing_manage`, [`core.py`](../../../../backend/catalog/views/core.py#L987) L987–1128; DELETE dispatch and storage availability guard at L1002–1030.
- Router action path registration at [`core.py`](../../../../backend/catalog/views/core.py#L980) L980–986; router registration in [`catalog/urls.py`](../../../../backend/catalog/urls.py#L7) L7 and root mount [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L13) L13.
- Cleanup signal: [`models.py`](../../../../backend/catalog/models.py#L97) L97–121.

## Tests

- [`test_seller_can_list_and_manage_own_items`](../../../../backend/catalog/tests.py#L497).
- [`test_delete_refused_when_gridfs_unreachable_leaves_listing_intact`](../../../../backend/catalog/tests.py#L860).

## Related

- Siblings: [GET](get-catalog-my-listings-item-id.md), [PUT](put-catalog-my-listings-item-id.md), [PATCH](patch-catalog-my-listings-item-id.md).

## Back to index

- [Catalog API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
