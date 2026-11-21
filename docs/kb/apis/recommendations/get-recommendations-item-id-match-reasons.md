---
id: api-get-recommendations-item-id-match-reasons
title: GET /api/recommendations/{item_id}/match-reasons/
category: api
status: verified
source_of_truth: [backend/fitfusion/urls.py, backend/recommendations/urls.py, backend/recommendations/views.py]
related: [api-get-recommendations]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Endpoint

`GET /api/recommendations/{item_id}/match-reasons/`. `item_id` is a string path parameter.

## Auth

Public (`AllowAny`).

## Request

Optional query parameters use the same recommendation profile fields as the list endpoint: `undertone`, `height_cm`, `body_shape`, `styles`, and `limit` (the handler validates this shared serializer).

## Response

`200`: item identifier and metadata, total and maximum scores, weights, normalized avatar profile, and per-rule match reasons.

## Errors

`400`: query parameter validation fails. `404`: the item is not in the active, explainable catalog queryset.

## Side Effects

Read-only; calculates a match breakdown for the requested item.

## Source

- String path converter, route, and `/api/` mount: [`recommendations/urls.py`](../../../../backend/recommendations/urls.py#L9) L9–12; [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L23) L23.
- Public permission, shared query validation, active-item lookup, and response: [`views.py`](../../../../backend/recommendations/views.py#L193) L193–228.
- Query parameter names, choices, defaults, and bounds: [`views.py`](../../../../backend/recommendations/views.py#L62) L62–89.

## Tests

none found for `GET /api/recommendations/{item_id}/match-reasons/`.

## Related

- Sibling list endpoint: [GET recommendations](get-recommendations.md).

## Back to index

- [Recommendations API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
