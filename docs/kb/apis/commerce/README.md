---
id: docs-kb-api-commerce-index
title: Commerce API Routes
category: index
status: draft
source_of_truth: [backend/commerce/urls.py]
related: [docs-kb-apis-index]
updated: 2026-11-21
source_sha: 6a6bbff50666363b3eba5586f6fb75526a9d9d5c
source_branch: docs/kb-wip
---

# Commerce API Routes

Sibling methods for each route will be adjacent.

| Method | Route | API item | Summary | Source (code link) | Tests (link) | Status |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/cart/` | [Read cart](get-cart.md) | Return or create the caller's cart | [commerce/urls.py](../../../../backend/commerce/urls.py#L10) | [commerce tests](../../../../backend/commerce/tests.py#L59) | verified |
| POST | `/cart/add_item/` | [Add cart item](post-cart-add-item.md) | Add an item or increase its quantity | [commerce/urls.py](../../../../backend/commerce/urls.py#L10) | [commerce tests](../../../../backend/commerce/tests.py#L59) | verified |
| DELETE | `/cart/clear/` | [Clear cart](delete-cart-clear.md) | Remove all items from the caller's cart | [commerce/urls.py](../../../../backend/commerce/urls.py#L10) | [commerce tests](../../../../backend/commerce/tests.py#L59) | verified |
| POST | `/cart/clear/` | [Clear cart (POST)](post-cart-clear.md) | Remove all items; successful POST test not located | [commerce/urls.py](../../../../backend/commerce/urls.py#L10) | none found | draft |
| DELETE | `/cart/remove_item/` | [Remove cart item (DELETE)](delete-cart-remove-item.md) | Remove one item; successful DELETE test not located | [commerce/urls.py](../../../../backend/commerce/urls.py#L10) | none found | draft |
| POST | `/cart/remove_item/` | [Remove cart item](post-cart-remove-item.md) | Remove one item from the caller's cart | [commerce/urls.py](../../../../backend/commerce/urls.py#L10) | [commerce tests](../../../../backend/commerce/tests.py#L59) | verified |
| POST | `/cart/remove_selected/` | [Remove selected cart items](post-cart-remove-selected.md) | Remove selected items from the caller's cart | [commerce/urls.py](../../../../backend/commerce/urls.py#L10) | [commerce tests](../../../../backend/commerce/tests.py#L133) | verified |
| PATCH | `/cart/update_quantity/` | [Update cart quantity](patch-cart-update-quantity.md) | Replace one item's cart quantity | [commerce/urls.py](../../../../backend/commerce/urls.py#L10) | [commerce tests](../../../../backend/commerce/tests.py#L59) | verified |
| PUT | `/cart/update_quantity/` | [Update cart quantity (PUT)](put-cart-update-quantity.md) | Replace quantity; successful PUT test not located | [commerce/urls.py](../../../../backend/commerce/urls.py#L10) | none found | draft |
| POST | `/checkout/` | [Checkout](post-checkout.md) | Create an order after approved payment | [commerce/urls.py](../../../../backend/commerce/urls.py#L14) | [commerce tests](../../../../backend/commerce/tests.py#L162) | verified |
| GET | `/orders/` | [List orders](get-orders.md) | Return the caller's order history | [commerce/urls.py](../../../../backend/commerce/urls.py#L11) | [commerce tests](../../../../backend/commerce/tests.py#L256) | verified |
| GET | `/orders/{pk}/` | [Read order](get-orders-id.md) | Return one caller-owned order | [commerce/urls.py](../../../../backend/commerce/urls.py#L11) | [commerce tests](../../../../backend/commerce/tests.py#L273) | verified |
| POST | `/orders/{pk}/cancel/` | [Cancel order](post-orders-id-cancel.md) | Cancel a cancellable caller-owned order | [commerce/urls.py](../../../../backend/commerce/urls.py#L11) | none found | draft |

## Back to index

- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)

## Back to index

- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
