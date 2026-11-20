---
id: api-post-auth-change-password
title: POST /auth/change-password/
category: api
status: verified
source_of_truth: [backend/accounts/urls.py, backend/accounts/views/auth_views.py, backend/accounts/serializers/user_serializer.py]
related: []
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`POST /auth/change-password/`. The route has no path parameters.

## Auth

Authenticated (`IsAuthenticated`).

## Request

JSON `old_password`, `new_password`, and `new_password_confirm`.

## Response

`200`: success and a message asking the user to log in with the new password.

## Errors

`400`: current password is incorrect, the confirmation differs, or the new password fails the configured strength rules.

## Side Effects

Updates the authenticated user's password hash.

## Source

- Handler `PasswordChangeView.post`, [`auth_views.py`](../../../../backend/accounts/views/auth_views.py#L242) L242–255.
- Route `path('auth/change-password/', ...)`, [`accounts/urls.py`](../../../../backend/accounts/urls.py#L34) L34.
- Request validation and save: [`user_serializer.py`](../../../../backend/accounts/serializers/user_serializer.py#L32) L32–53.

## Tests

- [`test_password_change_wrong_current_rejected`](../../../../backend/accounts/tests.py#L153).
- [`test_password_change_success_and_login`](../../../../backend/accounts/tests.py#L167).

## Related

- [Accounts API routes](README.md).

## Back to index

- [Accounts API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
