---
id: api-put-profile
title: PUT /profile/
category: api
status: verified
source_of_truth: [backend/accounts/urls.py, backend/accounts/views/__init__.py, backend/accounts/views/core.py, backend/accounts/serializers/user_serializer.py]
related: [api-get-profile, api-patch-profile, api-delete-profile]
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`PUT /profile/` (legacy profile path). No path parameters.

## Auth

Authenticated (`IsAuthenticated`).

## Request

JSON with writable `UserSerializer` fields; email, role, status, active state, and join date are read-only.

## Response

`200`: success/message and the updated serialized user.

## Errors

`400`: serializer validation errors. Authentication failures follow configured JWT behavior.

## Side Effects

Updates the caller's writable profile fields.

## Source

- Handler `ProfileView.update`, [`core.py`](../../../../backend/accounts/views/core.py#L42) L42–52. The base `RetrieveUpdateDestroyAPIView` maps PUT to `update`.
- Route `path('profile/', ProfileView.as_view(), ...)`, [`accounts/urls.py`](../../../../backend/accounts/urls.py#L44) L44; the import resolves through [`views/__init__.py`](../../../../backend/accounts/views/__init__.py#L12).
- Serializer: [`user_serializer.py`](../../../../backend/accounts/serializers/user_serializer.py#L9) L9–29.

## Tests

- [`test_update_profile`](../../../../backend/accounts/tests.py#L129).
- [`test_legacy_profile_view_crud`](../../../../backend/accounts/tests.py#L616).

## Related

- Siblings: [GET](get-profile.md), [PATCH](patch-profile.md), [DELETE](delete-profile.md).

## Back to index

- [Accounts API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
