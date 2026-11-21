---
id: api-get-outfits
title: GET /outfits/
category: api
status: verified
source_of_truth: [backend/outfits/urls.py, backend/outfits/views.py, backend/outfits/serializers.py]
related: [api-post-outfits]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Endpoint

`GET /outfits/`. The route has no path parameters.

## Auth

Authenticated user (`IsAuthenticated`).

## Request

No request body.

## Response

`200`: the caller's saved outfits, serialized with outfit, item, and avatar snapshot fields.

## Errors

Authentication failures follow the REST framework permission response.

## Side Effects

Read-only; the queryset includes only outfits owned by the caller and is ordered newest first.

## Source

- Router registration and root mount: [`urls.py`](../../../../backend/outfits/urls.py#L6) L6; [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L14) L14.
- Authentication and owner-scoped, ordered queryset: [`views.py`](../../../../backend/outfits/views.py#L15) L15–21.
- Serialized outfit fields: [`serializers.py`](../../../../backend/outfits/serializers.py#L149) L149–187.

## Tests

- [`test_list_is_owner_only_and_foreign_retrieve_404`](../../../../backend/outfits/tests.py#L69) checks the authenticated user's list.

## Related

- Sibling method: [POST](post-outfits.md).

## Back to index

- [Outfits API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
