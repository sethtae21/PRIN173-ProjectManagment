---
id: api-put-outfits-id
title: PUT /outfits/{pk}/
category: api
status: draft
source_of_truth: [backend/outfits/urls.py, backend/outfits/views.py, backend/outfits/serializers.py]
related: [api-get-outfits-id, api-patch-outfits-id, api-delete-outfits-id]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Endpoint

`PUT /outfits/{pk}/`. `pk` identifies the outfit.

## Auth

Authenticated user (`IsAuthenticated`); the outfit must belong to the caller.

## Request

JSON outfit representation, including required `name`; other writable serializer fields include `items`, `occasion`, `description`, and avatar data.

## Response

`200`: the updated serialized outfit.

## Errors

`400`: serializer validation fails, including an attempt to add a non-active catalog item. `404`: the outfit is missing or not owned by the caller.

## Side Effects

Replaces the outfit's writable representation through the inherited `ModelViewSet` update action. A successful `PUT` case has not been located in tests.

## Source

- `OutfitViewSet` inherits `ModelViewSet`, uses the owner-scoped queryset, and binds ownership on create: [`views.py`](../../../../backend/outfits/views.py#L15) L15–25.
- Serializer writable fields and update/validation behavior: [`serializers.py`](../../../../backend/outfits/serializers.py#L149) L149–187, L283–300.
- Router registration and root mount: [`urls.py`](../../../../backend/outfits/urls.py#L6) L6; [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L14) L14.

## Tests

none found for a successful `PUT /outfits/{pk}/`; the update test exercises `PATCH` in [`test_update_name_and_items`](../../../../backend/outfits/tests.py#L85).

TODO: Verify full replacement behavior with a successful route-level `PUT` test.

## Related

- Sibling methods: [GET](get-outfits-id.md), [PATCH](patch-outfits-id.md), [DELETE](delete-outfits-id.md).

## Back to index

- [Outfits API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
