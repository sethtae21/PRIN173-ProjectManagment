---
id: api-post-auth-check-registration
title: POST /auth/check-registration/
category: api
status: verified
source_of_truth: [backend/accounts/urls.py, backend/accounts/views/auth_views.py, backend/accounts/serializers/auth_serializers.py]
related: []
updated: 2026-11-20
source_sha: 8725ef0334dbf121e134006aeb1b71be813cf347
source_branch: main
---

## Endpoint

`POST /auth/check-registration/`. The route has no path parameters.

## Auth

Public (`AllowAny`).

## Request

JSON `email` and `mobile` are required; `store_name` is optional.

## Response

`200`: `{"available": true}` when validation succeeds.

## Errors

`400`: serializer field errors, including already-used email/mobile/store name or invalid mobile format.

## Side Effects

Read-only availability checks against active accounts.

## Source

- Handler `RegistrationContactCheckView.post`, [`auth_views.py`](../../../../backend/accounts/views/auth_views.py#L78) L78–83.
- Route `path('auth/check-registration/', ...)`, [`accounts/urls.py`](../../../../backend/accounts/urls.py#L25) L25.
- Validation contract: [`auth_serializers.py`](../../../../backend/accounts/serializers/auth_serializers.py#L40) L40–83.

## Tests

- [`test_contact_serializer_rejects_duplicates_and_bad_values`](../../../../backend/accounts/tests.py#L476).

## Related

- [Accounts API routes](README.md).

## Back to index

- [Accounts API routes](README.md)
- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
