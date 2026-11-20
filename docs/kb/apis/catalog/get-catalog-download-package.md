---
id: api-get-catalog-download-package
title: GET /catalog/download-package/
category: api
status: verified
source_of_truth: [backend/catalog/urls.py, backend/catalog/views/core.py]
related: []
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`GET /catalog/download-package/`. No path parameters.

## Auth

Public (`AllowAny`).

## Request

No request body.

## Response

`200`: ZIP attachment containing `catalog_products.csv` and `seller_image_guidelines.txt`.

## Errors

No route-specific error response was found in the handler.

## Side Effects

Builds the ZIP in memory; no persistent state is changed.

## Source

- Handler `CatalogViewSet.download_package`, [`core.py`](../../../../backend/catalog/views/core.py#L808) L808–822.
- Router action is registered by `router.register(r'catalog', ...)`, [`catalog/urls.py`](../../../../backend/catalog/urls.py#L7) L7; router inclusion L23 and root mount [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L13) L13.

## Tests

- [`test_download_package_contains_template_and_image_guidelines`](../../../../backend/catalog/tests.py#L393).

## Related

- [Catalog API routes](README.md).

## Back to index

- [Catalog API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
