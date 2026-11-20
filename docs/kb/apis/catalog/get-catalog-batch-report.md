---
id: api-get-catalog-batch-report
title: GET /catalog/batch-report/
category: api
status: verified
source_of_truth: [backend/catalog/urls.py, backend/catalog/views/core.py, backend/catalog/serializers.py]
related: []
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`GET /catalog/batch-report/`. No path parameters; query parameter `batch_id` is required.

## Auth

Seller-only (`IsSeller`); lookup is restricted to the requesting seller's batch.

## Request

No body. Query string: `batch_id=<batch identifier>`.

## Response

`200`: serialized batch details, counts, rejection report, and processing timing fields.

## Errors

`400`: missing `batch_id`. `404`: no matching seller-owned batch. `401`/`403`: unauthenticated or non-seller.

## Side Effects

Read-only.

## Source

- Handler `CatalogViewSet.batch_report`, [`core.py`](../../../../backend/catalog/views/core.py#L954) L954–966.
- Router action via `router.register(r'catalog', ...)`, [`catalog/urls.py`](../../../../backend/catalog/urls.py#L7) L7; router inclusion L23 and root mount [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L13) L13.
- Output fields: [`serializers.py`](../../../../backend/catalog/serializers.py#L43) L43–57.

## Tests

- [`test_upload_reports_missing_fields_and_undersized_images`](../../../../backend/catalog/tests.py#L431).
- [`test_upload_reports_csv_filename_mismatch`](../../../../backend/catalog/tests.py#L451).

## Related

- [Catalog API routes](README.md).

## Back to index

- [Catalog API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
