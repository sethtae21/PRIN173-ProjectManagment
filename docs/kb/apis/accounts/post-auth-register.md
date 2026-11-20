---
id: api-post-auth-register
title: POST /auth/register/
category: api
status: verified
source_of_truth: [backend/accounts/urls.py, backend/accounts/views/auth_views.py, backend/accounts/serializers/auth_serializers.py]
related: []
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`POST /auth/register/`. The route has no path parameters.

## Auth

Public (`AllowAny`).

## Request

JSON requires `email`, `full_name`, `password`, `password_confirm`, and `mobile`; `role` defaults to `shopper`, and seller registration requires `store_name`. Address fields are optional.

## Response

`201`: success/message, serialized `user`, and generated `tokens` (`access`, `refresh`, `expires_at`).

## Errors

`400`: invalid/missing fields, duplicate active contact, weak password, password mismatch, invalid role, or missing seller store name.

## Side Effects

Creates an active shopper or seller and issues user-bound JWTs.

## Source

- Handler `RegisterView.create`, [`auth_views.py`](../../../../backend/accounts/views/auth_views.py#L90) L90–102; `RegisterView` begins at L85.
- Route `path('auth/register/', ...)`, [`accounts/urls.py`](../../../../backend/accounts/urls.py#L26) L26.
- Request validation and creation: [`auth_serializers.py`](../../../../backend/accounts/serializers/auth_serializers.py#L86) L86–167.

## Tests

- [`test_registration_assigns_role_and_issues_user_bound_jwt`](../../../../backend/accounts/tests.py#L257).
- [`test_registration_serializer_rejects_name_mismatch_and_seller_without_store`](../../../../backend/accounts/tests.py#L502).

## Related

- [Accounts API routes](README.md).

## Back to index

- [Accounts API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
