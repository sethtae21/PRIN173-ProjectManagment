---
id: service-archive-retention-lifecycle
title: Archived-User Retention Lifecycle
category: service
status: verified
source_of_truth: [backend/accounts/archive.py, backend/accounts/models/archived_user.py, backend/accounts/management/commands/prune_archived_users.py]
related: [docs-kb-services-index, service-archived-user-pseudonymization]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## Purpose

The retention sweep moves eligible archived accounts out of the live user collection into a pseudonymous `ArchivedUser` tombstone, sanitizes related records, and deletes the live account ([retention helper](../../../../backend/accounts/archive.py#L150)).

## Interface/Contract

- `ARCHIVE_GRACE_DAYS` defaults to 90. `archive_due_date` computes `archived_at + days`; rows with no `archived_at` are treated as immediately due ([date and eligibility helpers](../../../../backend/accounts/archive.py#L68)).
- `_eligibility_queryset` selects only `status='archive'` rows; the cutoff is strict (`archived_at < now - days`). `force=True` bypasses the time window ([query](../../../../backend/accounts/archive.py#L89)).
- `prune_expired_archived_users(days=90, force=False)` returns the number of users processed. The `prune_archived_users` command exposes `--days`, `--force`, and `--preview`; `--sanitize-existing` can backfill existing tombstones ([helper](../../../../backend/accounts/archive.py#L150), [command](../../../../backend/accounts/management/commands/prune_archived_users.py#L37)).
- Processing writes the cold tombstone first, detaches cart items referencing the deleted seller's listings, removes personal fields and the user link from orders, then deletes the live account ([processing sequence](../../../../backend/accounts/archive.py#L150)).

## Inputs

Archived user rows, their `archived_at` timestamps, the optional grace-period override, and the `--force`, `--preview`, or `--sanitize-existing` command flags ([eligibility helper](../../../../backend/accounts/archive.py#L89), [command options](../../../../backend/accounts/management/commands/prune_archived_users.py#L46)).

## Outputs

The helper returns a processed-user count. Preview mode reports schedule/due-date information without moving users. The cold row retains pseudonymous profile fields and audit/provenance fields; seller cart snapshots and order business records are retained with the specified personal links/fields removed ([helper](../../../../backend/accounts/archive.py#L107), [cold model](../../../../backend/accounts/models/archived_user.py#L38)).

## Failure Modes

Each user is handled independently. An exception while processing a row is logged and skipped so later candidates continue; there is no encompassing transaction across the tombstone, cart, order, and deletion steps. Because the tombstone is created first and keyed idempotently by `closed_account_id`, a retry can reuse it if a prior sweep stopped before deleting the live row ([sweep](../../../../backend/accounts/archive.py#L150), [idempotent cold copy](../../../../backend/accounts/models/archived_user.py#L95)).

## Security & Privacy Notes

The cold tombstone is written through `ArchivedUser.from_user` before deleting the live row and uses the pseudonymization contract documented in [Archived-User Pseudonymization](archived-user-pseudonymization.md). Orders retain business details but have the account link and recipient/contact/address fields cleared. `cold_moved_at` stores the scheduled grace-window date, not the actual relocation instant; this is a documented audit limitation ([retention sequence](../../../../backend/accounts/archive.py#L150), [timestamp semantics](../../../../backend/accounts/models/archived_user.py#L1)).

## Source

- [`backend/accounts/archive.py` lines 68–212](../../../../backend/accounts/archive.py#L68)
- [`backend/accounts/models/archived_user.py` lines 95–128](../../../../backend/accounts/models/archived_user.py#L95)
- [`backend/accounts/management/commands/prune_archived_users.py` lines 37–112](../../../../backend/accounts/management/commands/prune_archived_users.py#L37)

## Tests

- [`backend/accounts/tests_archive_retention.py` lines 189–289](../../../../backend/accounts/tests_archive_retention.py#L189) covers grace-window eligibility, forced relocation, legacy null timestamps, and read-only previews.
- [`backend/accounts/tests_archive_retention.py` lines 465–538](../../../../backend/accounts/tests_archive_retention.py#L465) and [lines 661–686](../../../../backend/accounts/tests_archive_retention.py#L661) cover erasure and per-row sweep resilience.

## Related

- [Archived-User Pseudonymization](archived-user-pseudonymization.md)
- [Prune archived users command](../../scripts/commands/prune-archived-users.md)
- [Pseudonymize archived users command](../../scripts/commands/pseudonymize-archived-users.md)

## Back to index

- [Service and Contract Catalog](README.md)
- [Backend Logic Catalog](../README.md)
- [Knowledge-base home](../../README.md)
