---
id: service-archived-user-pseudonymization
title: Archived-User Pseudonymization
category: service
status: verified
source_of_truth: [backend/accounts/pseudonymization.py, backend/accounts/models/archived_user.py, backend/accounts/management/commands/pseudonymize_archived_users.py]
related: [docs-kb-services-index, service-archive-retention-lifecycle]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Purpose

`accounts.pseudonymization` creates deterministic, field-specific pseudonyms for archived-user profile data and provides an idempotent backfill for existing cold rows ([pseudonym helpers](../../../../backend/accounts/pseudonymization.py#L76), [backfill](../../../../backend/accounts/pseudonymization.py#L141)).

## Interface/Contract

- `pseudonym_for(closed_account_id, field=None)` returns the first 32 hexadecimal characters of an HMAC-SHA256 digest. The account-level form preserves the existing email derivation; field-specific forms use distinct account/field input ([implementation](../../../../backend/accounts/pseudonymization.py#L88)).
- `pseudonymous_profile_fields` constructs the cold profile: pseudonymous email/name and contact/address/store tokens, retained valid role, `status='archive'`, empty password, inactive flags, and cleared behavioral timestamps ([implementation](../../../../backend/accounts/pseudonymization.py#L115)).
- `ensure_pseudonymized(archived, apply=True)` updates only differing fields and returns their names. `sanitize_existing_archives(apply=True)` returns `scanned`, `pseudonymized`, and `already_clean` counts ([helpers](../../../../backend/accounts/pseudonymization.py#L141)).
- The `pseudonymize_archived_users` command applies the backfill by default; `--dry-run` reports changes without saving ([command](../../../../backend/accounts/management/commands/pseudonymize_archived_users.py#L25)).

## Inputs

The closed account identifier, optional role, archived-user row(s), and the configured `ARCHIVE_PSEUDONYM_KEY` or fallback `SECRET_KEY`. The command accepts the `--dry-run` flag ([key selection](../../../../backend/accounts/pseudonymization.py#L76), [command options](../../../../backend/accounts/management/commands/pseudonymize_archived_users.py#L33)).

## Outputs

Deterministic pseudonymous field values and backfill statistics. Re-running the helper leaves already-clean rows unchanged ([profile and backfill helpers](../../../../backend/accounts/pseudonymization.py#L115)).

## Failure Modes

If neither key setting is available, `_key()` raises `ImproperlyConfigured`. A field without a configured token prefix raises `ValueError`. Database errors are not swallowed by the backfill helper or command ([key and token helpers](../../../../backend/accounts/pseudonymization.py#L76)).

## Security & Privacy Notes

The HMAC key is pseudonymization key material; production configuration should use a dedicated stable `ARCHIVE_PSEUDONYM_KEY`, because rotating `SECRET_KEY` changes tokens for future writes. The cold profile does not copy the password hash, clears login/join timestamps, and replaces direct identifiers with non-null tokens. Role is retained only for shopper/seller reporting ([key selection and profile fields](../../../../backend/accounts/pseudonymization.py#L76), [cold model](../../../../backend/accounts/models/archived_user.py#L1)).

## Source

- [`backend/accounts/pseudonymization.py` lines 55–176](../../../../backend/accounts/pseudonymization.py#L55)
- [`backend/accounts/models/archived_user.py` lines 1–128](../../../../backend/accounts/models/archived_user.py#L1)
- [`backend/accounts/management/commands/pseudonymize_archived_users.py` lines 25–48](../../../../backend/accounts/management/commands/pseudonymize_archived_users.py#L25)

## Tests

- [`backend/accounts/tests_archive_retention.py` lines 291–330](../../../../backend/accounts/tests_archive_retention.py#L291) covers token shape, field/account separation, key rotation, and stable email derivation.
- [`backend/accounts/tests_archive_retention.py` lines 332–464](../../../../backend/accounts/tests_archive_retention.py#L332) covers cold-copy privacy and idempotency; [lines 540–580](../../../../backend/accounts/tests_archive_retention.py#L540) cover repeatable backfill and dry-run behavior.

## Related

- [Archived-User Retention Lifecycle](archive-retention-lifecycle.md)
- [Prune archived users command](../../scripts/commands/prune-archived-users.md)
- [Pseudonymize archived users command](../../scripts/commands/pseudonymize-archived-users.md)

## Back to index

- [Service and Contract Catalog](README.md)
- [Backend Logic Catalog](../README.md)
- [Knowledge-base home](../../README.md)
