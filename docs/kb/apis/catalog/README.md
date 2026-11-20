---
id: docs-kb-api-catalog-index
title: Catalog API Routes
category: index
status: draft
source_of_truth: [backend/catalog/urls.py]
related: [docs-kb-apis-index]
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

# Catalog API Routes

Sibling methods for each route will be adjacent.

| Method | Route | API item | Summary | Source (code link) | Tests (link) | Status |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/catalog/` | [List active catalog items](get-catalog.md) | Public active-item list with filtering and price sort | [catalog/urls.py](../../../../backend/catalog/urls.py#L7) | [catalog tests](../../../../backend/catalog/tests.py#L539) | verified |
| POST | `/catalog/` | [Create catalog item](post-catalog.md) | Router exposes inherited create; seller assignment is unverified | [catalog/urls.py](../../../../backend/catalog/urls.py#L7) | none found | draft |
| GET | `/catalog/{pk}/` | [Read catalog item](get-catalog-id.md) | Read one active item | [catalog/urls.py](../../../../backend/catalog/urls.py#L7) | none found | verified |
| PUT | `/catalog/{pk}/` | [Replace catalog item](put-catalog-id.md) | Inherited update of an active item | [catalog/urls.py](../../../../backend/catalog/urls.py#L7) | none found | verified |
| PATCH | `/catalog/{pk}/` | [Partially update catalog item](patch-catalog-id.md) | Inherited partial update of an active item | [catalog/urls.py](../../../../backend/catalog/urls.py#L7) | none found | verified |
| DELETE | `/catalog/{pk}/` | [Delete catalog item](delete-catalog-id.md) | Inherited deletion of an active item | [catalog/urls.py](../../../../backend/catalog/urls.py#L7) | none found | verified |
| GET | `/catalog/batch-report/` | [Read catalog batch report](get-catalog-batch-report.md) | Seller-owned batch details and processing report | [catalog/urls.py](../../../../backend/catalog/urls.py#L7) | [catalog tests](../../../../backend/catalog/tests.py#L431) | verified |
| GET | `/catalog/download-package/` | [Download seller package](get-catalog-download-package.md) | Download CSV template and image guidelines in a ZIP | [catalog/urls.py](../../../../backend/catalog/urls.py#L7) | [catalog tests](../../../../backend/catalog/tests.py#L393) | verified |
| GET | `/catalog/download-template/` | [Download CSV template](get-catalog-download-template.md) | Download CSV upload instructions, header, and example | [catalog/urls.py](../../../../backend/catalog/urls.py#L14) | [catalog tests](../../../../backend/catalog/tests.py#L407) | verified |
| POST | `/catalog/upload/` | [Upload catalog batch](post-catalog-upload.md) | Accept CSV and images for asynchronous processing | [catalog/urls.py](../../../../backend/catalog/urls.py#L7) | [catalog tests](../../../../backend/catalog/tests.py#L364) | verified |
| GET | `/catalog/my_listings/` | [List seller listings (underscore)](get-catalog-my-listings-underscore.md) | List the caller's listings; router-generated underscore path | [catalog/urls.py](../../../../backend/catalog/urls.py#L7) | none found | verified |
| GET | `/catalog/my-listings/` | [List seller listings (hyphen alias)](get-catalog-my-listings-alias.md) | Explicit compatibility alias for seller listing list | [catalog/urls.py](../../../../backend/catalog/urls.py#L22) | none found | verified |
| GET | `/catalog/my-listings/{item_id}/` | [Read seller listing](get-catalog-my-listings-item-id.md) | Read one caller-owned listing | [catalog/urls.py](../../../../backend/catalog/urls.py#L7) | [catalog tests](../../../../backend/catalog/tests.py#L497) | verified |
| PUT | `/catalog/my-listings/{item_id}/` | [Replace seller listing](put-catalog-my-listings-item-id.md) | Replace caller-owned listing fields | [catalog/urls.py](../../../../backend/catalog/urls.py#L7) | none found | verified |
| PATCH | `/catalog/my-listings/{item_id}/` | [Partially update seller listing](patch-catalog-my-listings-item-id.md) | Partially update listing, optionally replacing images | [catalog/urls.py](../../../../backend/catalog/urls.py#L7) | [catalog tests](../../../../backend/catalog/tests.py#L497) | verified |
| DELETE | `/catalog/my-listings/{item_id}/` | [Delete seller listing](delete-catalog-my-listings-item-id.md) | Delete listing and clean up its GridFS assets | [catalog/urls.py](../../../../backend/catalog/urls.py#L7) | [catalog tests](../../../../backend/catalog/tests.py#L497) | verified |
| GET | `/media/<path:name>` | [Serve GridFS media](get-media-name.md) | Stream a public file from GridFS | [catalog/urls.py](../../../../backend/catalog/urls.py#L13) | none found | verified |

## Back to index

- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
