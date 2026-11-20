---
id: api-post-orders-id-cancel
title: POST /orders/{pk}/cancel/
category: api
status: draft
source_of_truth: [backend/commerce/urls.py, backend/commerce/views.py]
related: []
updated: 2026-11-21
source_sha: 6a6bbff50666363b3eba5586f6fb75526a9d9d5c
source_branch: docs/kb-wip
---

## Endpoint

`POST /orders/{pk}/cancel/`. `pk` identifies the order.

## Auth

Authenticated user (`IsAuthenticated`).

## Request

No request body.

## Response

`200`: serialized order after cancellation, or the unchanged serialized order when it is already cancelled.

## Errors

`400`: the order is in a status that cannot be cancelled. `404`: the order is not in the caller's order queryset.

## Side Effects

Changes a cancellable order's status to `cancelled`; repeated cancellation of an already-cancelled order is an idempotent no-op. No direct route test for cancellation was located.

## Source

- The router-generated detail action is documented on `OrderViewSet`; its handler scopes lookup to the caller, checks cancellable statuses, and saves the cancelled status: [`views.py`](../../../../backend/commerce/views.py#L367) L367–418.
- Router registration and root mount: [`commerce/urls.py`](../../../../backend/commerce/urls.py#L11) L11, L15; [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L15) L15.

## Tests

none found for `POST /orders/{pk}/cancel/` in the repository's Commerce tests: [`tests.py`](../../../../backend/commerce/tests.py#L1).

TODO: Add a route-level test for successful cancellation, disallowed statuses, and repeated cancellation.

## Related

- [Order detail](get-orders-id.md).

## Back to index

- [Commerce API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
