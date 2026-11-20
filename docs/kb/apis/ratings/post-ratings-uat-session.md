---
id: api-post-ratings-uat-session
title: POST /ratings/uat/session/
category: api
status: verified
source_of_truth: [backend/ratings/urls.py, backend/ratings/views.py, backend/ratings/models.py]
related: []
updated: 2026-11-21
source_sha: 6a6bbff50666363b3eba5586f6fb75526a9d9d5c
source_branch: docs/kb-wip
---

## Endpoint

`POST /ratings/uat/session/`. The route has no path parameters.

## Auth

Authenticated shopper. The requested role must be valid and match the caller's role.

## Request

JSON may include `role` (defaults to the caller's role) and `product_id` (defaults to an empty string).

## Response

`201`: `session_id`, `status`, `role`, and `product_id` for the newly created active session.

## Errors

`400`: invalid role. `403`: non-shopper caller or role mismatch.

## Side Effects

Creates an active UAT session for the caller.

## Source

- Route and prefix mount: [`urls.py`](../../../../backend/ratings/urls.py#L19) L19; [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L18) L18.
- Shopper and role checks, session creation, and response: [`views.py`](../../../../backend/ratings/views.py#L257) L257–291.
- UAT session fields: [`models.py`](../../../../backend/ratings/models.py#L75) L75–95.

## Tests

- [`test_uat_session_shopper_allowed`](../../../../backend/ratings/tests.py#L320) checks successful shopper creation.
- [`test_uat_session_seller_rejected`](../../../../backend/ratings/tests.py#L325) checks seller rejection.
- [`test_guest_cannot_create_uat_session`](../../../../backend/ratings/tests.py#L413) checks guest denial.

## Related

- [Ratings API routes](README.md).

## Back to index

- [Ratings API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
