---
id: api-patch-outfits-id
title: PATCH /outfits/{pk}/
category: api
status: verified
source_of_truth: [backend/outfits/urls.py, backend/outfits/views.py, backend/outfits/serializers.py]
related: [api-get-outfits-id, api-put-outfits-id, api-delete-outfits-id]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Endpoint

`PATCH /outfits/{pk}/`. `pk` identifies the outfit.

## Auth

Authenticated user (`IsAuthenticated`); the outfit must belong to the caller.

## Request

Partial JSON outfit representation. Writable fields include `name`, `items`, `occasion`, `description`, and avatar data.

## Response

`200`: the updated serialized outfit.

## Errors

`400`: serializer validation fails, including an attempt to add an inactive item. `404`: the outfit is missing or not owned by the caller.

## Side Effects

Updates the caller's outfit. Existing inactive catalog items are grandfathered on edits, while newly added items must be active.

## Source

- `OutfitViewSet` inherits `ModelViewSet` and restricts its queryset to the caller: [`views.py`](../../../../backend/outfits/views.py#L15) L15–21.
- Partial serializer validation and update behavior: [`serializers.py`](../../../../backend/outfits/serializers.py#L149) L149–187, L283–300.
- Router registration and root mount: [`urls.py`](../../../../backend/outfits/urls.py#L6) L6; [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L14) L14.

## Tests

- [`test_update_name_and_items`](../../../../backend/outfits/tests.py#L85) checks a successful partial update.
- [`test_inactive_existing_item_does_not_lock_out_edit`](../../../../backend/outfits/tests.py#L107) checks grandfathered items and rejection of newly added inactive items.

## Related

- Sibling methods: [GET](get-outfits-id.md), [PUT](put-outfits-id.md), [DELETE](delete-outfits-id.md).

## Back to index

- [Outfits API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
