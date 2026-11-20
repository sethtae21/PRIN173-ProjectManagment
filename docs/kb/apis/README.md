---
id: docs-kb-apis-index
title: API Catalog
category: index
status: draft
source_of_truth: [backend/accounts/urls.py, backend/catalog/urls.py, backend/outfits/urls.py, backend/commerce/urls.py, backend/ratings/urls.py, backend/recommendations/urls.py, backend/fitfusion/urls.py]
related: [docs-kb-home]
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

# API Catalog

One file per implemented method and route. Sibling methods for a route will be adjacent. Unsupported route methods will be listed explicitly with their observed response (for example, `405 — unsupported`) so absence is not ambiguous.

| API item | Summary | Source (code link) | Tests (link) | Status |
| --- | --- | --- | --- | --- |
| [Accounts API](accounts/README.md) | 24 implemented methods documented | [accounts/urls.py](../../../backend/accounts/urls.py#L20) | [accounts tests](../../../backend/accounts/tests.py#L55) | draft |
| [Catalog API](catalog/README.md) | 17 catalog methods documented | [catalog/urls.py](../../../backend/catalog/urls.py#L7) | [catalog tests](../../../backend/catalog/tests.py#L364) | draft |
| [Outfits API](outfits/README.md) | Outfits routes; P2 batch pending | [outfits/urls.py](../../../backend/outfits/urls.py#L6) | none found | draft |
| [Commerce API](commerce/README.md) | Commerce routes; P2 batch pending | [commerce/urls.py](../../../backend/commerce/urls.py#L10) | none found | draft |
| [Ratings API](ratings/README.md) | Ratings routes; P2 batch pending | [ratings/urls.py](../../../backend/ratings/urls.py#L14) | none found | draft |
| [Recommendations API](recommendations/README.md) | Recommendation routes; P2 batch pending | [recommendations/urls.py](../../../backend/recommendations/urls.py#L6) | none found | draft |
| [Schema and API docs](meta/README.md) | OpenAPI schema and Swagger UI endpoints; P2 meta batch pending | [fitfusion/urls.py](../../../backend/fitfusion/urls.py#L21) | none found | draft |

## Route Groups

- [Accounts](accounts/README.md)
- [Catalog](catalog/README.md)
- [Outfits](outfits/README.md)
- [Commerce](commerce/README.md)
- [Ratings](ratings/README.md)
- [Recommendations](recommendations/README.md)
- [Schema and API docs](meta/README.md)

## Back to index

- [Knowledge-base home](../README.md)
