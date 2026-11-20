---
id: api-post-checkout
title: POST /checkout/
category: api
status: verified
source_of_truth: [backend/commerce/urls.py, backend/commerce/views.py, backend/commerce/serializers.py]
related: []
updated: 2026-11-21
source_sha: 6a6bbff50666363b3eba5586f6fb75526a9d9d5c
source_branch: docs/kb-wip
---

## Endpoint

`POST /checkout/`. The route has no path parameters.

## Auth

Authenticated user (`IsAuthenticated`).

## Request

JSON requires `shipping_address` and `payment_method`. Optional fields are recipient name, email, contact number, and selected `items` with catalog identifiers and optional size/color.

## Response

`201`: serialized order with purchase-time item snapshots.

## Errors

`400`: invalid details, empty cart, duplicate or unselected products, or unavailable seller/item. `402`: payment declined.

## Side Effects

On approved payment, creates an order and order-item snapshots, removes the checked-out cart entries, and records the checkout-completed UAT event. Cash on delivery creates a `pending` order; other accepted methods follow the mock payment result. The total is the sum of item prices and quantities.

## Source

- Route and root mount: [`commerce/urls.py`](../../../../backend/commerce/urls.py#L14) L14–15; [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L15) L15.
- Authentication, request handling, cart checks, payment, order creation, cart cleanup, and response: [`views.py`](../../../../backend/commerce/views.py#L203) L203–364.
- Checkout request and order response serializers: [`serializers.py`](../../../../backend/commerce/serializers.py#L177) L177–205.

## Tests

- [`test_checkout_approval_snapshots_and_clears_cart`](../../../../backend/commerce/tests.py#L162) covers approved payment and order snapshots.
- [`test_checkout_persists_selected_items_and_leaves_unselected_cart_items`](../../../../backend/commerce/tests.py#L192) covers selected-item checkout.
- [`test_checkout_decline_keeps_cart_and_creates_no_order`](../../../../backend/commerce/tests.py#L234) covers declined payment.
- [`test_checkout_rejects_empty_cart`](../../../../backend/commerce/tests.py#L247) covers an empty cart.

## Related

- [Commerce API routes](README.md).

## Back to index

- [Commerce API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
