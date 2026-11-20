---
id: api-get-auth-user-profile
title: GET /auth/user/profile/
category: api
status: verified
source_of_truth: [backend/accounts/urls.py, backend/accounts/views/__init__.py, backend/accounts/views/core.py, backend/accounts/serializers/user_serializer.py]
related: [api-put-auth-user-profile, api-patch-auth-user-profile, api-delete-auth-user-profile]
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`GET /auth/user/profile/`. No path parameters.

## Auth

Authenticated (`IsAuthenticated`).

## Request

No request body.

## Response

`200`: `{"success": true, "user": <UserSerializer>}`. The serializer exposes the account identity, contact, and address fields; email, role, status, active state, and join date are read-only.

## Errors

Authentication failures follow the configured JWT authentication behavior.

## Side Effects

Read-only; returns the caller's account.

## Source

- Handler `ProfileView.retrieve`, [`core.py`](../../../../backend/accounts/views/core.py#L36) L36–40; `ProfileView` is `RetrieveUpdateDestroyAPIView` at L28.
- Route `path('auth/user/profile/', ProfileView.as_view(), ...)`, [`accounts/urls.py`](../../../../backend/accounts/urls.py#L41) L41. [`views/__init__.py`](../../../../backend/accounts/views/__init__.py#L12) re-exports `ProfileView` from `core.py`.
- Response fields: [`user_serializer.py`](../../../../backend/accounts/serializers/user_serializer.py#L9) L9–29.

## Tests

- [`test_view_profile`](../../../../backend/accounts/tests.py#L114).

## Related

- Siblings: [PUT](put-auth-user-profile.md), [PATCH](patch-auth-user-profile.md), [DELETE](delete-auth-user-profile.md).

## Back to index

- [Accounts API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
