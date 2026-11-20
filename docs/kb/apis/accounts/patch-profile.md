---
id: api-patch-profile
title: PATCH /profile/
category: api
status: verified
source_of_truth: [backend/accounts/urls.py, backend/accounts/views/__init__.py, backend/accounts/views/core.py, backend/accounts/serializers/user_serializer.py]
related: [api-get-profile, api-put-profile, api-delete-profile]
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`PATCH /profile/` (legacy profile path). No path parameters.

## Auth

Authenticated (`IsAuthenticated`).

## Request

JSON containing one or more writable `UserSerializer` fields.

## Response

`200`: success/message and the updated serialized user.

## Errors

`400`: serializer validation errors. Authentication failures follow configured JWT behavior.

## Side Effects

Partially updates the caller's writable profile fields.

## Source

- Handler `ProfileView.update`, [`core.py`](../../../../backend/accounts/views/core.py#L42) L42–52, called by inherited `partial_update` with `partial=True`.
- Route `path('profile/', ProfileView.as_view(), ...)`, [`accounts/urls.py`](../../../../backend/accounts/urls.py#L44) L44; the import resolves through [`views/__init__.py`](../../../../backend/accounts/views/__init__.py#L12).
- Serializer: [`user_serializer.py`](../../../../backend/accounts/serializers/user_serializer.py#L9) L9–29.

## Tests

- [`test_update_profile`](../../../../backend/accounts/tests.py#L129).
- [`test_update_profile_ignores_legacy_body_fields`](../../../../backend/accounts/tests.py#L141).

## Related

- Siblings: [GET](get-profile.md), [PUT](put-profile.md), [DELETE](delete-profile.md).

## Back to index

- [Accounts API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
