---
id: api-post-auth-login
title: POST /auth/login/
category: api
status: verified
source_of_truth: [backend/accounts/urls.py, backend/accounts/views/auth_views.py, backend/accounts/serializers/auth_serializers.py]
related: []
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`POST /auth/login/`. The route has no path parameters.

## Auth

Public (`AllowAny`); credentials are supplied in the request body.

## Request

JSON `email` and `password`.

## Response

`200`: success/message, serialized `user`, and generated `tokens`.

## Errors

`400`: invalid credentials, deactivated or archived account, or serializer validation failure.

## Side Effects

Runs a best-effort archive-retention sweep before authenticating; sweep failure is logged and does not block login. Successful login issues access and refresh tokens.

## Source

- Handler `LoginView.post`, [`auth_views.py`](../../../../backend/accounts/views/auth_views.py#L110) L110–131.
- Route `path('auth/login/', ...)`, [`accounts/urls.py`](../../../../backend/accounts/urls.py#L27) L27.
- Credential validation: [`auth_serializers.py`](../../../../backend/accounts/serializers/auth_serializers.py#L181) L181–210.

## Tests

- [`test_login_serializer_rejects_missing_deactivated_and_archived`](../../../../backend/accounts/tests.py#L521).
- [`test_token_refresh_blacklist_rotation_and_logout_and_deactivate`](../../../../backend/accounts/tests.py#L643).

## Related

- [Accounts API routes](README.md).

## Back to index

- [Accounts API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
