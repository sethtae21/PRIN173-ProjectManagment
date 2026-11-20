---
id: api-put-presets-id
title: PUT /presets/{pk}/
category: api
status: verified
source_of_truth: [backend/accounts/urls.py, backend/fitfusion/urls.py, backend/accounts/views/preset_views.py, backend/accounts/serializers/preset_serializers.py]
related: [api-get-presets-id, api-patch-presets-id, api-delete-presets-id]
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`PUT /presets/{pk}/`. `pk` is the preset identifier captured by the DRF router.

## Auth

Authenticated (`IsAuthenticated`).

## Request

JSON containing the writable avatar-preset fields. `user` and `id` are read-only; `user` is not accepted as an ownership transfer.

## Response

`200`: serialized updated preset.

## Errors

`400`: serializer validation failure. `404`: preset does not exist or is not owned by the caller. `401` or `403`: unauthenticated request.

## Side Effects

Updates a caller-owned preset.

## Source

- Routed action `AvatarPresetViewSet.update` is inherited from `ModelViewSet`; local class at [`preset_views.py`](../../../../backend/accounts/views/preset_views.py#L15) L15 and owner-scoped `get_queryset` at L28–30.
- Router registration `router.register(r'presets', ...)`, [`accounts/urls.py`](../../../../backend/accounts/urls.py#L20) L20; root URL mount at [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L12) L12.
- Serializer contract and validation: [`preset_serializers.py`](../../../../backend/accounts/serializers/preset_serializers.py#L5) L5–92.

## Tests

- Owner-scoped detail lookup is exercised by [`test_other_user_cannot_update_or_delete`](../../../../backend/accounts/tests.py#L72); no successful PUT-specific test was located.

## Related

- Siblings: [GET](get-presets-id.md), [PATCH](patch-presets-id.md), [DELETE](delete-presets-id.md).
- Collection methods: [GET](get-presets.md), [POST](post-presets.md).

## Back to index

- [Accounts API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
