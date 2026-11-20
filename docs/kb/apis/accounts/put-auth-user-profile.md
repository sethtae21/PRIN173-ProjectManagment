---
id: api-put-auth-user-profile
title: PUT /auth/user/profile/
category: api
status: verified
source_of_truth: [backend/accounts/urls.py, backend/accounts/views/__init__.py, backend/accounts/views/core.py, backend/accounts/serializers/user_serializer.py]
related: [api-get-auth-user-profile, api-patch-auth-user-profile, api-delete-auth-user-profile]
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`PUT /auth/user/profile/`. No path parameters.

## Auth

Authenticated (`IsAuthenticated`).

## Request

JSON with writable `UserSerializer` fields. `email`, `role`, `status`, `is_active`, and `date_joined` are read-only.

## Response

`200`: success/message and the updated serialized user.

## Errors

`400`: serializer validation errors. Authentication failures follow configured JWT behavior.

## Side Effects

Updates the authenticated user's writable profile fields.

## Source

- Handler `ProfileView.update`, [`core.py`](../../../../backend/accounts/views/core.py#L42) L42–52. The base `RetrieveUpdateDestroyAPIView` maps PUT to `update`.
- Route `path('auth/user/profile/', ProfileView.as_view(), ...)`, [`accounts/urls.py`](../../../../backend/accounts/urls.py#L41) L41; the view is re-exported by [`views/__init__.py`](../../../../backend/accounts/views/__init__.py#L12).
- Writable/read-only fields: [`user_serializer.py`](../../../../backend/accounts/serializers/user_serializer.py#L9) L9–29.

## Tests

- [`test_update_profile`](../../../../backend/accounts/tests.py#L129).

## Related

- Siblings: [GET](get-auth-user-profile.md), [PATCH](patch-auth-user-profile.md), [DELETE](delete-auth-user-profile.md).

## Back to index

- [Accounts API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
