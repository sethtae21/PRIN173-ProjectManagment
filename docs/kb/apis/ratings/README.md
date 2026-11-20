---
id: docs-kb-api-ratings-index
title: Ratings API Routes
category: index
status: draft
source_of_truth: [backend/ratings/urls.py]
related: [docs-kb-apis-index]
updated: 2026-11-21
source_sha: 6a6bbff50666363b3eba5586f6fb75526a9d9d5c
source_branch: docs/kb-wip
---

# Ratings API Routes

Sibling methods for each route will be adjacent. Any method not implemented by a handler will appear as an explicit unsupported row rather than being omitted.

| Method | Route | API item | Summary | Source (code link) | Tests (link) | Status |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/ratings/` | [Submit rating](post-ratings.md) | Create or update the caller's star rating | [ratings/urls.py](../../../../backend/ratings/urls.py#L15) | [ratings tests](../../../../backend/ratings/tests.py#L50) | verified |
| GET | `/ratings/summary/` | [Read rating summary](get-ratings-summary.md) | Aggregate star counts and approval score | [ratings/urls.py](../../../../backend/ratings/urls.py#L16) | [ratings tests](../../../../backend/ratings/tests.py#L186) | verified |
| POST | `/ratings/guest-session/clear/` | [Clear guest rating session](post-ratings-guest-session-clear.md) | Remove legacy guest cache/session state | [ratings/urls.py](../../../../backend/ratings/urls.py#L17) | [ratings tests](../../../../backend/ratings/tests.py#L243) | verified |
| GET | `/ratings/mine/` | [List my ratings](get-ratings-mine.md) | Return the authenticated caller's ratings | [ratings/urls.py](../../../../backend/ratings/urls.py#L18) | [ratings tests](../../../../backend/ratings/tests.py#L280) | verified |
| GET | `/ratings/{pk}/` | 405 — unsupported | No `get` handler is declared on `RatingDetailView` | [ratings/views.py](../../../../backend/ratings/views.py#L211) | none found | verified |
| PATCH | `/ratings/{pk}/` | [Update rating](patch-ratings-id.md) | Update owned rating; successful update test not located | [ratings/urls.py](../../../../backend/ratings/urls.py#L22) | none found | draft |
| DELETE | `/ratings/{pk}/` | [Delete rating](delete-ratings-id.md) | Delete an owned shopper rating | [ratings/urls.py](../../../../backend/ratings/urls.py#L22) | [ratings tests](../../../../backend/ratings/tests.py#L251) | verified |
| PUT | `/ratings/{pk}/` | 405 — unsupported | No `put` handler is declared on `RatingDetailView` | [ratings/views.py](../../../../backend/ratings/views.py#L211) | none found | verified |
| POST | `/ratings/uat/session/` | [Create UAT session](post-ratings-uat-session.md) | Start an active shopper test session | [ratings/urls.py](../../../../backend/ratings/urls.py#L19) | [ratings tests](../../../../backend/ratings/tests.py#L320) | verified |
| POST | `/ratings/uat/response/` | [Submit UAT response](post-ratings-uat-response.md) | Create or update an answer in an owned session | [ratings/urls.py](../../../../backend/ratings/urls.py#L20) | none found | draft |
| GET | `/ratings/uat/export/` | [Export UAT results](get-ratings-uat-export.md) | Download staff-only UAT KPI CSV | [ratings/urls.py](../../../../backend/ratings/urls.py#L21) | none found | draft |

## Back to index

- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
