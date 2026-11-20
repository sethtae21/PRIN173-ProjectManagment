---
id: api-get-presets
title: GET /presets/
category: api
status: verified
source_of_truth: [backend/accounts/urls.py, backend/fitfusion/urls.py, backend/accounts/views/preset_views.py, backend/accounts/serializers/preset_serializers.py, backend/outfits/models.py]
related: [api-post-presets]
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`GET /presets/`. No path parameters.

## Auth

Authenticated (`IsAuthenticated`).

## Request

No request body.

## Response

`200`: serialized collection of the caller's avatar presets. Each record includes its string `id` and read-only `user` identifier.

## Errors

`401` or `403`: unauthenticated request, depending on authentication configuration.

## Side Effects

Read-only. The queryset is filtered to the authenticated user.

## Source

- Routed action `AvatarPresetViewSet.list` is inherited from `ModelViewSet`; local view class at [`preset_views.py`](../../../../backend/accounts/views/preset_views.py#L15) L15 and owner-scoped `get_queryset` at L28–30.
- Router registration `router.register(r'presets', ...)`, [`accounts/urls.py`](../../../../backend/accounts/urls.py#L20) L20; router URL inclusion at L54 and root account URL mount in [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L12) L12.
- Serializer and ownership fields: [`preset_serializers.py`](../../../../backend/accounts/serializers/preset_serializers.py#L5) L5–20.

## Tests

- [`test_list_returns_only_own_presets`](../../../../backend/accounts/tests.py#L65).
- [`test_guest_rejected`](../../../../backend/accounts/tests.py#L60).

## Related

- Sibling: [POST](post-presets.md).
- Detail methods: [GET](get-presets-id.md), [PUT](put-presets-id.md), [PATCH](patch-presets-id.md), [DELETE](delete-presets-id.md).

## Back to index

- [Accounts API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
