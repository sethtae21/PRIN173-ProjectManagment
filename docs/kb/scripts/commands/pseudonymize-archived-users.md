---
id: script-command-pseudonymize-archived-users
title: Pseudonymize Archived Users
category: script
status: verified
source_of_truth: [backend/accounts/management/commands/pseudonymize_archived_users.py]
related: [docs-kb-scripts-commands-index, docs-kb-scripts-index, service-archived-user-pseudonymization]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## What It Runs

Backfills existing `accounts_archiveduser` rows through `sanitize_existing_archives`. Default mode writes pseudonymous fields; `--dry-run` computes counts without saving. The token contract is documented in [Archived-User Pseudonymization](../../backend-logic/services/archived-user-pseudonymization.md) ([`Command.handle()`](../../../../backend/accounts/management/commands/pseudonymize_archived_users.py#L40)).

## Prerequisites

The configured Django database and an `ARCHIVE_PSEUDONYM_KEY` or fallback Django `SECRET_KEY` must be available ([command and key contract](../../../../backend/accounts/management/commands/pseudonymize_archived_users.py#L25)).

## Command (PowerShell)

```powershell
Set-Location .\backend
python .\manage.py pseudonymize_archived_users --dry-run
python .\manage.py pseudonymize_archived_users
```

## Inputs/Env Vars

Accepts `--dry-run`; uses the archive pseudonymization key from Django settings and the configured database. The dedicated key setting is `ARCHIVE_PSEUDONYM_KEY`, falling back to `SECRET_KEY` ([command](../../../../backend/accounts/management/commands/pseudonymize_archived_users.py#L33), [key selection](../../../../backend/accounts/pseudonymization.py#L76)).

## Outputs & Reports

Prints `scanned`, `pseudonymized`, and `already_clean` row counts. Dry-run prefixes the output with `[dry-run]` ([handler](../../../../backend/accounts/management/commands/pseudonymize_archived_users.py#L40)).

## Exit Codes

No explicit exit code is set. Successful runs return normally; missing key configuration or database errors propagate and fail the command ([handler](../../../../backend/accounts/management/commands/pseudonymize_archived_users.py#L40)).

## Source

- [`backend/accounts/management/commands/pseudonymize_archived_users.py` lines 25–48](../../../../backend/accounts/management/commands/pseudonymize_archived_users.py#L25): `Command`, `--dry-run`, and output.
- [Archived-User Pseudonymization](../../backend-logic/services/archived-user-pseudonymization.md): field and key behavior.

## Related

- [Archived-User Pseudonymization](../../backend-logic/services/archived-user-pseudonymization.md)
- [Archived-User Retention Lifecycle](../../backend-logic/services/archive-retention-lifecycle.md)

## Back to index

- [Django Management Command Catalog](README.md)
- [Runnable Script Catalog](../README.md)
- [Knowledge-base home](../../README.md)
