---
id: service-jwt-token-blacklist
title: JWT Refresh-Token Blacklist
category: service
status: verified
source_of_truth: [backend/accounts/utils/__init__.py, backend/accounts/views/auth_views.py]
related: [docs-kb-services-index]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Purpose

The raw-PyMongo helpers in `accounts.utils` revoke refresh tokens by storing their JWT IDs (`jti`) in the `token_blacklist` collection. The refresh, logout, and account-deactivation flows call these helpers; access tokens are not blacklisted by this service ([helper implementation](../../../../backend/accounts/utils/__init__.py#L20), [auth call sites](../../../../backend/accounts/views/auth_views.py#L185)).

## Interface/Contract

- `get_token_blacklist_collection()` lazily connects through `settings.MONGODB_URI`, selects the default database's `token_blacklist` collection, and creates a TTL index on `expires_at` ([implementation](../../../../backend/accounts/utils/__init__.py#L20)).
- `blacklist_refresh_token(token)` upserts the token's `jti` and UTC expiration timestamp ([implementation](../../../../backend/accounts/utils/__init__.py#L33)).
- `is_token_blacklisted(token)` returns whether a row with that `jti` exists ([implementation](../../../../backend/accounts/utils/__init__.py#L51)).
- `CustomTokenRefreshView` checks the consumed refresh token and blacklists it after successful rotation; `LogoutView` blacklists the submitted refresh token ([call sites](../../../../backend/accounts/views/auth_views.py#L187)).

## Inputs

A SimpleJWT refresh-token object providing `token['jti']` and `token['exp']`. MongoDB connection configuration comes from `settings.MONGODB_URI` ([token helper](../../../../backend/accounts/utils/__init__.py#L20), [blacklist operation](../../../../backend/accounts/utils/__init__.py#L33)).

## Outputs

`blacklist_refresh_token` returns no value. `is_token_blacklisted` returns a boolean. MongoDB expires blacklist rows after `expires_at` through the collection's TTL index ([helpers](../../../../backend/accounts/utils/__init__.py#L20)).

## Failure Modes

Collection initialization catches any exception and returns `None`. In that state, blacklist writes become no-ops and blacklist checks return `False`, so the service fails open when initialization fails. Exceptions from `update_one` or `find_one` after successful initialization are not caught by these helpers and propagate to callers ([implementation](../../../../backend/accounts/utils/__init__.py#L20)).

## Security & Privacy Notes

The collection stores the refresh token's `jti` and expiry, not the serialized token. The initialization catch does not log or propagate the connection/index error; because it disables both revocation writes and checks, an unavailable blacklist store weakens revocation enforcement ([implementation](../../../../backend/accounts/utils/__init__.py#L20)).

## Source

- [`backend/accounts/utils/__init__.py` lines 20–60](../../../../backend/accounts/utils/__init__.py#L20)
- [`backend/accounts/views/auth_views.py` lines 185–238](../../../../backend/accounts/views/auth_views.py#L185)

## Tests

- [`backend/accounts/tests.py` lines 643–675](../../../../backend/accounts/tests.py#L643) covers token rotation, logout, and deactivation while mocking blacklist helpers; it does not exercise the raw PyMongo collection.

## Related

- No sibling service dependency is documented.

## Back to index

- [Service and Contract Catalog](README.md)
- [Backend Logic Catalog](../README.md)
- [Knowledge-base home](../../README.md)
