---
id: api-post-outfits
title: POST /outfits/
category: api
status: verified
source_of_truth: [backend/outfits/urls.py, backend/outfits/views.py, backend/outfits/serializers.py]
related: [api-get-outfits]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Endpoint

`POST /outfits/`. The route has no path parameters.

## Auth

Authenticated user (`IsAuthenticated`).

## Request

JSON `name`; optional `items` list of catalog-item identifiers, `occasion`, `description`, `avatar_preset`, `avatar_view`, and nested `avatar` snapshot data.

## Response

`201`: the created serialized outfit, including its identifier and item identifiers.

## Errors

`400`: serializer validation fails, including an attempt to add a non-active catalog item. Authentication failures follow the REST framework permission response.

## Side Effects

Creates an outfit owned by the authenticated caller; ownership is assigned server-side.

## Source

- Router registration and root mount: [`urls.py`](../../../../backend/outfits/urls.py#L6) L6; [`fitfusion/urls.py`](../../../../backend/fitfusion/urls.py#L14) L14.
- Authentication and server-side owner binding: [`views.py`](../../../../backend/outfits/views.py#L15) L15–25.
- Writable fields and inactive-item validation: [`serializers.py`](../../../../backend/outfits/serializers.py#L149) L149–187, L292–300.

## Tests

- [`test_create_returns_id_list_and_binds_user`](../../../../backend/outfits/tests.py#L50) checks successful creation, item identifiers, and server-side ownership.
- [`test_cannot_add_inactive_item_on_create`](../../../../backend/outfits/tests.py#L99) checks invalid item rejection.

## Related

- Sibling method: [GET](get-outfits.md).

## Back to index

- [Outfits API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
