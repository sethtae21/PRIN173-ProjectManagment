---
id: docs-kb-api-recommendations-index
title: Recommendations API Routes
category: index
status: draft
source_of_truth: [backend/recommendations/urls.py]
related: [docs-kb-apis-index]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

# Recommendations API Routes

Sibling methods for each route will be adjacent.

| Method | Route | API item | Summary | Source (code link) | Tests (link) | Status |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/recommendations/` | [List recommendations](get-recommendations.md) | Return ranked catalog recommendations | [recommendations/urls.py](../../../../backend/recommendations/urls.py#L7) | [recommendation tests](../../../../backend/recommendations/tests_weights.py#L351) | verified |
| GET | `/api/recommendations/{item_id}/match-reasons/` | [Read match reasons](get-recommendations-item-id-match-reasons.md) | Explain one item's score and rule breakdown | [recommendations/urls.py](../../../../backend/recommendations/urls.py#L9) | none found | verified |

## Back to index

- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
