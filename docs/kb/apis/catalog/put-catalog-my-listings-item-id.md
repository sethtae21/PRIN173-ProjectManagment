---
id: api-put-catalog-my-listings-item-id
title: PUT /catalog/my-listings/{item_id}/
category: api
status: verified
source_of_truth: [backend/catalog/urls.py, backend/catalog/views/core.py, backend/catalog/serializers.py]
related: [api-get-catalog-my-listings-item-id, api-patch-catalog-my-listings-item-id, api-delete-catalog-my-listings-item-id]
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`PUT /catalog/my-listings/{item_id}/`. `item_id` is the seller listing identifier.

## Auth

Seller-only (`IsSeller`) and restricted to the authenticated seller's item.

## Request

JSON or multipart form data with writable catalog fields and optional `front_image`/`rear_image` replacements.

## Response

`200`: serialized updated listing; image cleanup failures may add `image_cleanup_warning`.

## Errors

`400`: serializer or image validation failure. `404`: item is missing or not seller-owned. `503`: storage is unavailable for image deletion (DELETE sibling only). `401`/`403`: unauthenticated or non-seller.

## Side Effects

Updates the seller-owned item. Relevant edits or image replacements may set status to processing and submit background validation.

## Source

- Handler `CatalogViewSet.my_listing_manage`, [`core.py`](../../../../backend/catalog/views/core.py#L987) L987–1128; PUT/PATCH dispatch and update path at L1002–1128.
- Router action path registration at [`core.py`](../../../../backend/catalog/views/core.py#L980) L980–986; router registration in [`catalog/urls.py`](../../../../backend/catalog/urls.py#L7) L7 and root mount [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L13) L13.
- Writable fields and size validation: [`serializers.py`](../../../../backend/catalog/serializers.py#L8) L8–41.

## Tests

none found for a successful PUT; the shared update path's PATCH behavior is covered by [`test_seller_can_list_and_manage_own_items`](../../../../backend/catalog/tests.py#L497).

## Related

- Siblings: [GET](get-catalog-my-listings-item-id.md), [PATCH](patch-catalog-my-listings-item-id.md), [DELETE](delete-catalog-my-listings-item-id.md).

## Back to index

- [Catalog API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
