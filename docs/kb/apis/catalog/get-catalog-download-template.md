---
id: api-get-catalog-download-template
title: GET /catalog/download-template/
category: api
status: verified
source_of_truth: [backend/catalog/urls.py, backend/catalog/views/core.py]
related: []
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`GET /catalog/download-template/`. No path parameters.

## Auth

Public (`AllowAny`).

## Request

No request body.

## Response

`200`: CSV attachment named `catalog_products.csv`, including upload instructions, header, and example row.

## Errors

No route-specific error response was found in the handler.

## Side Effects

Generates the template in memory; no persistent state is changed.

## Source

- Handler `CatalogViewSet.download_template`, [`core.py`](../../../../backend/catalog/views/core.py#L801) L801–806.
- Explicit route `path('catalog/download-template/', ...)`, [`catalog/urls.py`](../../../../backend/catalog/urls.py#L14) L14; root mount [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L13) L13.

## Tests

- [`test_download_template_contains_header_and_single_example_row`](../../../../backend/catalog/tests.py#L407).
- [`test_download_package_contains_template_and_image_guidelines`](../../../../backend/catalog/tests.py#L393).

## Related

- [Catalog API routes](README.md).

## Back to index

- [Catalog API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
