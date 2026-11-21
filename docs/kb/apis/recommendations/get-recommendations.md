---
id: api-get-recommendations
title: GET /api/recommendations/
category: api
status: verified
source_of_truth: [backend/fitfusion/urls.py, backend/recommendations/urls.py, backend/recommendations/views.py]
related: [api-get-recommendations-item-id-match-reasons]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Endpoint

`GET /api/recommendations/`. The route has no path parameters.

## Auth

Public (`AllowAny`).

## Request

Optional query parameters: `undertone` (`warm`, `cool`, or `neutral`), `height_cm` (50–250), `body_shape` (`top-heavy`, `bottom-heavy`, or `balanced`), comma-separated `styles`, and `limit` (1–50).

## Response

`200`: weights version and values, normalized avatar profile, and ranked recommendations with score breakdowns and catalog metadata.

## Errors

`400`: query parameter validation fails.

## Side Effects

Read-only; recommendations are built from active catalog items, excluding the timing-fixture store.

## Source

- Recommendation path and `/api/` mount: [`recommendations/urls.py`](../../../../backend/recommendations/urls.py#L7) L7; [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L23) L23.
- Public permission, request validation, response construction, and active-item selection: [`views.py`](../../../../backend/recommendations/views.py#L55) L55–58, L154–190.
- Query parameter names, choices, defaults, and bounds: [`views.py`](../../../../backend/recommendations/views.py#L62) L62–89.

## Tests

- [`test_response_shape`](../../../../backend/recommendations/tests_weights.py#L351) checks the endpoint's response shape.
- [`TestRecommendationQueryValidation`](../../../../backend/recommendations/tests_weights.py#L361) covers invalid query parameters.

## Related

- Sibling detail explanation endpoint: [GET match reasons](get-recommendations-item-id-match-reasons.md).

## Back to index

- [Recommendations API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
