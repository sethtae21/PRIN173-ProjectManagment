---
id: api-get-orders
title: GET /orders/
category: api
status: verified
source_of_truth: [backend/commerce/urls.py, backend/commerce/views.py, backend/commerce/serializers.py]
related: []
updated: 2026-11-21
source_sha: 6a6bbff50666363b3eba5586f6fb75526a9d9d5c
source_branch: docs/kb-wip
---

## Endpoint

`GET /orders/`. The route has no path parameters.

## Auth

Authenticated user (`IsAuthenticated`).

## Request

No request body.

## Response

`200`: serialized order history for the caller.

## Errors

Authentication failures follow the REST framework permission response.

## Side Effects

Read-only; the queryset is restricted to the authenticated user's orders.

## Source

- `OrderViewSet` is read-only apart from its explicit cancel action, requires authentication, and scopes its queryset to the caller: [`views.py`](../../../../backend/commerce/views.py#L367) L367–389.
- Order response fields: [`serializers.py`](../../../../backend/commerce/serializers.py#L177) L177–194.
- Router registration and root mount: [`commerce/urls.py`](../../../../backend/commerce/urls.py#L11) L11, L15; [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L15) L15.

## Tests

- [`test_user_cannot_read_another_users_order`](../../../../backend/commerce/tests.py#L256) confirms the caller's list excludes another user's order.
- [`test_checkout_completes_when_fit_accuracy_popup_is_skipped`](../../../../backend/commerce/tests.py#L273) checks the caller's populated order history.

## Related

- [Commerce API routes](README.md).

## Back to index

- [Commerce API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
