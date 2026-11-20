---
id: api-patch-auth-user-profile
title: PATCH /auth/user/profile/
category: api
status: verified
source_of_truth: [backend/accounts/urls.py, backend/accounts/views/__init__.py, backend/accounts/views/core.py, backend/accounts/serializers/user_serializer.py]
related: [api-get-auth-user-profile, api-put-auth-user-profile, api-delete-auth-user-profile]
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`PATCH /auth/user/profile/`. No path parameters.

## Auth

Authenticated (`IsAuthenticated`).

## Request

JSON containing one or more writable `UserSerializer` fields. Read-only fields are ignored by serializer update behavior.

## Response

`200`: success/message and the updated serialized user.

## Errors

`400`: serializer validation errors. Authentication failures follow configured JWT behavior.

## Side Effects

Partially updates the authenticated user's writable profile fields.

## Source

- Handler `ProfileView.update`, [`core.py`](../../../../backend/accounts/views/core.py#L42) L42–52, called by inherited `partial_update` with `partial=True`.
- Route `path('auth/user/profile/', ProfileView.as_view(), ...)`, [`accounts/urls.py`](../../../../backend/accounts/urls.py#L41) L41; the view is re-exported by [`views/__init__.py`](../../../../backend/accounts/views/__init__.py#L12).
- Field contract: [`user_serializer.py`](../../../../backend/accounts/serializers/user_serializer.py#L9) L9–29.

## Tests

- [`test_update_profile`](../../../../backend/accounts/tests.py#L129).
- [`test_update_profile_ignores_legacy_body_fields`](../../../../backend/accounts/tests.py#L141).

## Related

- Siblings: [GET](get-auth-user-profile.md), [PUT](put-auth-user-profile.md), [DELETE](delete-auth-user-profile.md).

## Back to index

- [Accounts API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
