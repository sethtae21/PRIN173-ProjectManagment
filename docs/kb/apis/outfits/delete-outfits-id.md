---
id: api-delete-outfits-id
title: DELETE /outfits/{pk}/
category: api
status: verified
source_of_truth: [backend/outfits/urls.py, backend/outfits/views.py, backend/outfits/models.py]
related: [api-get-outfits-id, api-put-outfits-id, api-patch-outfits-id]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Endpoint

`DELETE /outfits/{pk}/`. `pk` identifies the outfit.

## Auth

Authenticated user (`IsAuthenticated`); the outfit must belong to the caller.

## Request

No request body.

## Response

`204`: outfit deleted.

## Errors

`404`: the outfit is missing or not owned by the caller. Authentication failures follow the REST framework permission response.

## Side Effects

Deletes the caller's outfit; the model's many-to-many item associations are deleted with it.

## Source

- `OutfitViewSet` uses the caller-scoped queryset: [`views.py`](../../../../backend/outfits/views.py#L15) L15–21.
- Router registration and root mount: [`urls.py`](../../../../backend/outfits/urls.py#L6) L6; [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L14) L14.
- Outfit item relation: [`models.py`](../../../../backend/outfits/models.py#L48) L48–76.

## Tests

- [`test_delete_204_then_gone`](../../../../backend/outfits/tests.py#L130) checks `204` and confirms the deleted outfit is no longer retrievable.

## Related

- Sibling methods: [GET](get-outfits-id.md), [PUT](put-outfits-id.md), [PATCH](patch-outfits-id.md).

## Back to index

- [Outfits API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
