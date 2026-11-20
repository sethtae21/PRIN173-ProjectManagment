---
id: api-post-presets
title: POST /presets/
category: api
status: verified
source_of_truth: [backend/accounts/urls.py, backend/fitfusion/urls.py, backend/accounts/views/preset_views.py, backend/accounts/serializers/preset_serializers.py, backend/outfits/models.py]
related: [api-get-presets]
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`POST /presets/`. No path parameters.

## Auth

Authenticated (`IsAuthenticated`).

## Request

JSON avatar-preset fields: `name`, `gender`, `height`, `weight`, and optional model fields such as `skin_tone`, `undertone`, `shoulder`, `waist`, `hip`, `cup_size`, `thigh`, `style_focus`, `body_build_cm`, and `is_default`. Camel-case aliases are normalized by the serializer. The server assigns `user`.

## Response

`201`: serialized created preset, including a string `id` and read-only `user` identifier.

## Errors

`400`: serializer field/choice validation failure, height outside 120–220, weight outside 30–200, body build outside 86–112, unsupported cup size, or cup size supplied for a non-female avatar. `401` or `403`: unauthenticated request.

## Side Effects

Creates an avatar preset owned by the authenticated user.

## Source

- Routed action `AvatarPresetViewSet.create` is inherited from `ModelViewSet`; local class at [`preset_views.py`](../../../../backend/accounts/views/preset_views.py#L15) L15 and owner assignment in `perform_create` at L32–33.
- Router registration `router.register(r'presets', ...)`, [`accounts/urls.py`](../../../../backend/accounts/urls.py#L20) L20; router URL inclusion at L54 and root account URL mount in [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L12) L12.
- Input normalization and validators: [`preset_serializers.py`](../../../../backend/accounts/serializers/preset_serializers.py#L42) L42–92; model fields/defaults: [`models.py`](../../../../backend/outfits/models.py#L5) L5–39.

## Tests

- [`test_create_preset`](../../../../backend/accounts/tests.py#L55).
- [`test_male_with_cup_size_rejected`](../../../../backend/accounts/tests.py#L80).
- [`test_preset_serializer_aliases_and_range_validation`](../../../../backend/accounts/tests.py#L539).

## Related

- Sibling: [GET](get-presets.md).
- Detail methods: [GET](get-presets-id.md), [PUT](put-presets-id.md), [PATCH](patch-presets-id.md), [DELETE](delete-presets-id.md).

## Back to index

- [Accounts API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
