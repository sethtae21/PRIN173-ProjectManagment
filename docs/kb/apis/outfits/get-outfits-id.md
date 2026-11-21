---
id: api-get-outfits-id
title: GET /outfits/{pk}/
category: api
status: verified
source_of_truth: [backend/outfits/urls.py, backend/outfits/views.py, backend/outfits/serializers.py]
related: [api-put-outfits-id, api-patch-outfits-id, api-delete-outfits-id]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Endpoint

`GET /outfits/{pk}/`. `pk` identifies the outfit.

## Auth

Authenticated user (`IsAuthenticated`).

## Request

No request body.

## Response

`200`: the caller's serialized outfit, including saved item identifiers and avatar snapshot fields.

## Errors

`404`: the outfit is missing or is not owned by the caller. Authentication failures follow the REST framework permission response.

## Side Effects

Read-only; lookup uses the caller-scoped queryset.

## Source

- Detail route registration: [`urls.py`](../../../../backend/outfits/urls.py#L6) L6; root mount: [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L14) L14.
- Owner-scoped queryset and serializer binding: [`views.py`](../../../../backend/outfits/views.py#L15) L15–21.
- Serialized outfit fields: [`serializers.py`](../../../../backend/outfits/serializers.py#L149) L149–187.

## Tests

- [`test_list_is_owner_only_and_foreign_retrieve_404`](../../../../backend/outfits/tests.py#L69) checks that a foreign outfit returns `404`.
- [`test_persists_across_sessions_server_side`](../../../../backend/outfits/tests.py#L139) checks successful retrieval.

## Related

- Sibling methods: [PUT](put-outfits-id.md), [PATCH](patch-outfits-id.md), [DELETE](delete-outfits-id.md).

## Back to index

- [Outfits API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
