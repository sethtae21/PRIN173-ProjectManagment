---
id: api-get-catalog-my-listings-item-id
title: GET /catalog/my-listings/{item_id}/
category: api
status: verified
source_of_truth: [backend/catalog/urls.py, backend/catalog/views/core.py, backend/catalog/serializers.py]
related: [api-put-catalog-my-listings-item-id, api-patch-catalog-my-listings-item-id, api-delete-catalog-my-listings-item-id]
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`GET /catalog/my-listings/{item_id}/`. `item_id` is the seller listing identifier.

## Auth

Seller-only (`IsSeller`) and restricted to the authenticated seller's item.

## Request

No request body.

## Response

`200`: serialized seller-owned catalog item.

## Errors

`404`: item is missing or belongs to another seller. `401`/`403`: unauthenticated or non-seller.

## Side Effects

Read-only.

## Source

- Handler `CatalogViewSet.my_listing_manage`, [`core.py`](../../../../backend/catalog/views/core.py#L987) L987–1128; GET dispatch and seller-scoped lookup at L987–1001.
- Router action registration and path parameter are defined in [`core.py`](../../../../backend/catalog/views/core.py#L980) L980–986; router registration in [`catalog/urls.py`](../../../../backend/catalog/urls.py#L7) L7 and root mount [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L13) L13.

## Tests

- [`test_seller_can_list_and_manage_own_items`](../../../../backend/catalog/tests.py#L497).
- [`test_seller_cannot_manage_other_sellers_items`](../../../../backend/catalog/tests.py#L529).

## Related

- Siblings: [PUT](put-catalog-my-listings-item-id.md), [PATCH](patch-catalog-my-listings-item-id.md), [DELETE](delete-catalog-my-listings-item-id.md).

## Back to index

- [Catalog API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
