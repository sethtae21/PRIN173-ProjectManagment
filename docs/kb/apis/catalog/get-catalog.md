---
id: api-get-catalog
title: GET /catalog/
category: api
status: verified
source_of_truth: [backend/catalog/urls.py, backend/catalog/views/core.py, backend/catalog/serializers.py]
related: [api-post-catalog]
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`GET /catalog/`. No path parameters.

## Auth

Public (`AllowAny`).

## Request

Optional query parameters: `category`, `color`, `size`, `store`, `style`, `min_price`, `max_price`, and `sort` (`price_asc` or `price_desc`).

## Response

`200`: serialized active catalog items; each item includes computed `size_cm`.

## Errors

`400`: invalid `sort`, non-decimal/negative price bound, or `min_price > max_price`.

## Side Effects

Read-only; filters active listings. Style matches case-insensitively against JSON tag entries.

## Source

- Handler `CatalogViewSet.list`, [`core.py`](../../../../backend/catalog/views/core.py#L797) L797–799; queryset/filter logic L737–795.
- Router `router.register(r'catalog', ...)`, [`catalog/urls.py`](../../../../backend/catalog/urls.py#L7) L7; router inclusion L23 and root mount [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L13) L13.
- Serializer: [`serializers.py`](../../../../backend/catalog/serializers.py#L8) L8–41.

## Tests

- [`test_public_catalog_style_filter_matches_json_array_tags`](../../../../backend/catalog/tests.py#L539).
- [`test_public_catalog_sort_price_asc_and_desc`](../../../../backend/catalog/tests.py#L982).
- [`test_public_catalog_price_range_filter`](../../../../backend/catalog/tests.py#L997).

## Related

- Sibling: [POST](post-catalog.md).

## Back to index

- [Catalog API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
