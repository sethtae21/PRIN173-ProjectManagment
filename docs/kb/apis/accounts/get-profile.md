---
id: api-get-profile
title: GET /profile/
category: api
status: verified
source_of_truth: [backend/accounts/urls.py, backend/accounts/views/__init__.py, backend/accounts/views/core.py, backend/accounts/serializers/user_serializer.py]
related: [api-put-profile, api-patch-profile, api-delete-profile]
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`GET /profile/` (legacy profile path). No path parameters.

## Auth

Authenticated (`IsAuthenticated`).

## Request

No request body.

## Response

`200`: `{"success": true, "user": <UserSerializer>}`.

## Errors

Authentication failures follow configured JWT authentication behavior.

## Side Effects

Read-only; returns the caller's account.

## Source

- Handler `ProfileView.retrieve`, [`core.py`](../../../../backend/accounts/views/core.py#L36) L36–40; class base `RetrieveUpdateDestroyAPIView` at L28.
- Route `path('profile/', ProfileView.as_view(), ...)`, [`accounts/urls.py`](../../../../backend/accounts/urls.py#L44) L44; [`views/__init__.py`](../../../../backend/accounts/views/__init__.py#L12) re-exports the `core.py` class.
- Serializer: [`user_serializer.py`](../../../../backend/accounts/serializers/user_serializer.py#L9) L9–29.

## Tests

- [`test_view_profile`](../../../../backend/accounts/tests.py#L114).
- [`test_legacy_profile_view_crud`](../../../../backend/accounts/tests.py#L616).

## Related

- Siblings: [PUT](put-profile.md), [PATCH](patch-profile.md), [DELETE](delete-profile.md).

## Back to index

- [Accounts API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
