---
id: docs-kb-apis-index
title: API Catalog
category: index
status: draft
source_of_truth: [backend/accounts/urls.py, backend/catalog/urls.py, backend/outfits/urls.py, backend/commerce/urls.py, backend/ratings/urls.py, backend/recommendations/urls.py, backend/fitfusion/urls.py]
related: [docs-kb-home]
updated: 2026-11-21
source_sha: 6a6bbff50666363b3eba5586f6fb75526a9d9d5c
source_branch: docs/kb-wip
---

# API Catalog

One file per implemented method and route. Sibling methods for a route will be adjacent. Unsupported route methods will be listed explicitly with their observed response (for example, `405 — unsupported`) so absence is not ambiguous.

| API item | Summary | Source (code link) | Tests (link) | Status |
| --- | --- | --- | --- | --- |
| [Accounts API](accounts/README.md) | 24 implemented methods documented | [accounts/urls.py](../../../backend/accounts/urls.py#L20) | [accounts tests](../../../backend/accounts/tests.py#L55) | draft |
| [Catalog API](catalog/README.md) | 17 catalog methods documented | [catalog/urls.py](../../../backend/catalog/urls.py#L7) | [catalog tests](../../../backend/catalog/tests.py#L364) | draft |
| [Outfits API](outfits/README.md) | Outfits routes; P2 batch pending | [outfits/urls.py](../../../backend/outfits/urls.py#L6) | none found | draft |
| [Commerce API](commerce/README.md) | 13 commerce methods documented | [commerce/urls.py](../../../backend/commerce/urls.py#L10) | [commerce tests](../../../backend/commerce/tests.py#L59) | draft |
| [Ratings API](ratings/README.md) | 9 ratings methods documented | [ratings/urls.py](../../../backend/ratings/urls.py#L15) | [ratings tests](../../../backend/ratings/tests.py#L50) | draft |
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
