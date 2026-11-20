---
id: api-delete-presets-id
title: DELETE /presets/{pk}/
category: api
status: verified
source_of_truth: [backend/accounts/urls.py, backend/fitfusion/urls.py, backend/accounts/views/preset_views.py]
related: [api-get-presets-id, api-put-presets-id, api-patch-presets-id]
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`DELETE /presets/{pk}/`. `pk` is the preset identifier captured by the DRF router.

## Auth

Authenticated (`IsAuthenticated`).

## Request

No request body.

## Response

`204 No Content` when deletion succeeds.

## Errors

`404`: preset does not exist or is not owned by the caller under the owner-filtered queryset. The local `destroy` guard also returns `403` if a non-owner object reaches it. `401` or `403`: unauthenticated request.

## Side Effects

Deletes the caller-owned preset.

## Source

- Handler `AvatarPresetViewSet.destroy`, [`preset_views.py`](../../../../backend/accounts/views/preset_views.py#L36) L36–46; owner-scoped lookup at L28–30.
- Router registration `router.register(r'presets', ...)`, [`accounts/urls.py`](../../../../backend/accounts/urls.py#L20) L20; root URL mount at [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L12) L12.

## Tests

- [`test_other_user_cannot_update_or_delete`](../../../../backend/accounts/tests.py#L72).
- [`test_preset_destroy_rejects_non_owner_branch`](../../../../backend/accounts/tests.py#L574).

## Related

- Siblings: [GET](get-presets-id.md), [PUT](put-presets-id.md), [PATCH](patch-presets-id.md).
- Collection methods: [GET](get-presets.md), [POST](post-presets.md).

## Back to index

- [Accounts API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
