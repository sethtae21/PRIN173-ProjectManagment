---
id: api-post-catalog-upload
title: POST /catalog/upload/
category: api
status: verified
source_of_truth: [backend/catalog/urls.py, backend/catalog/views/core.py, backend/catalog/serializers.py]
related: []
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`POST /catalog/upload/`. No path parameters.

## Auth

Seller-only (`IsSeller`).

## Request

Multipart form data: required `csv_file` ending in `.csv` and `images` file list. Each item requires front and rear images; batch size and file-size limits are enforced by the handler/settings.

## Response

`202 Accepted`: `batch_id`, `status: processing`, message, and `total_items`.

## Errors

`400`: missing or non-CSV file, oversized image, missing CSV headers/images, empty CSV, or batch-limit violations. `401`/`403`: unauthenticated or non-seller.

## Side Effects

Creates an upload batch and item records, writes image files to GridFS, then submits asynchronous processing.

## Source

- Handler `CatalogViewSet.upload`, [`core.py`](../../../../backend/catalog/views/core.py#L824) L824–952.
- Router action via `router.register(r'catalog', ...)`, [`catalog/urls.py`](../../../../backend/catalog/urls.py#L7) L7; router inclusion L23 and root mount [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L13) L13.
- Request file contract: [`serializers.py`](../../../../backend/catalog/serializers.py#L59) L59–72.

## Tests

- [`test_guest_cannot_upload`](../../../../backend/catalog/tests.py#L364).
- [`test_rejects_oversized_image`](../../../../backend/catalog/tests.py#L376).
- [`test_upload_recognizes_header_after_template_instruction_rows`](../../../../backend/catalog/tests.py#L416).
- [`test_ut15_upload_endpoint_rejects_spreadsheet_and_creates_no_batch`](../../../../backend/catalog/tests_ut_cases.py#L151).

## Related

- [Catalog API routes](README.md).

## Back to index

- [Catalog API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
