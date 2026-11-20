---
id: api-get-orders-id
title: GET /orders/{pk}/
category: api
status: verified
source_of_truth: [backend/commerce/urls.py, backend/commerce/views.py, backend/commerce/serializers.py]
related: []
updated: 2026-11-21
source_sha: 6a6bbff50666363b3eba5586f6fb75526a9d9d5c
source_branch: docs/kb-wip
---

## Endpoint

`GET /orders/{pk}/`. `pk` identifies the order.

## Auth

Authenticated user (`IsAuthenticated`).

## Request

No request body.

## Response

`200`: the caller's serialized order, including its item snapshots.

## Errors

`404`: the order is not in the authenticated user's queryset. Authentication failures follow the REST framework permission response.

## Side Effects

Read-only; lookup is restricted to the authenticated user's orders.

## Source

- `OrderViewSet` requires authentication and scopes its queryset to the caller: [`views.py`](../../../../backend/commerce/views.py#L367) L367–389.
- The serialized order includes its item snapshots: [`serializers.py`](../../../../backend/commerce/serializers.py#L177) L177–194.
- Router registration and root mount: [`commerce/urls.py`](../../../../backend/commerce/urls.py#L11) L11, L15; [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L15) L15.

## Tests

- [`test_checkout_completes_when_fit_accuracy_popup_is_skipped`](../../../../backend/commerce/tests.py#L273) retrieves the caller's order successfully.
- [`test_user_cannot_read_another_users_order`](../../../../backend/commerce/tests.py#L256) verifies another user's order returns `404`.

## Related

- [Cancel order](post-orders-id-cancel.md).

## Back to index

- [Commerce API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
