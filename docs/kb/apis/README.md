---
id: docs-kb-apis-index
title: API Catalog
category: index
status: draft
source_of_truth: [backend/accounts/urls.py, backend/catalog/urls.py, backend/outfits/urls.py, backend/commerce/urls.py, backend/ratings/urls.py, backend/recommendations/urls.py, backend/fitfusion/urls.py]
related: [docs-kb-home]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

# API Catalog

One file per implemented method and route. Sibling methods for a route will be adjacent. Unsupported route methods will be listed explicitly with their observed response (for example, `405 — unsupported`) so absence is not ambiguous.

| API item | Summary | Source (code link) | Tests (link) | Status |
| --- | --- | --- | --- | --- |
| [Accounts API](accounts/README.md) | 24 implemented methods documented | [accounts/urls.py](../../../backend/accounts/urls.py#L20) | [accounts tests](../../../backend/accounts/tests.py#L55) | draft |
| [Catalog API](catalog/README.md) | 17 catalog methods documented | [catalog/urls.py](../../../backend/catalog/urls.py#L7) | [catalog tests](../../../backend/catalog/tests.py#L364) | draft |
| [Outfits API](outfits/README.md) | 6 outfit methods documented | [outfits/urls.py](../../../backend/outfits/urls.py#L6) | [outfits tests](../../../backend/outfits/tests.py#L50) | draft |
| [Commerce API](commerce/README.md) | 13 commerce methods documented | [commerce/urls.py](../../../backend/commerce/urls.py#L10) | [commerce tests](../../../backend/commerce/tests.py#L59) | draft |
| [Ratings API](ratings/README.md) | 9 ratings methods documented | [ratings/urls.py](../../../backend/ratings/urls.py#L15) | [ratings tests](../../../backend/ratings/tests.py#L50) | draft |
| [Recommendations API](recommendations/README.md) | 2 recommendation methods documented | [recommendations/urls.py](../../../backend/recommendations/urls.py#L7) | [recommendation tests](../../../backend/recommendations/tests_weights.py#L351) | draft |
| [Schema and API docs](meta/README.md) | 2 schema and API documentation methods documented | [fitfusion/urls.py](../../../backend/fitfusion/urls.py#L21) | none found | draft |

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
