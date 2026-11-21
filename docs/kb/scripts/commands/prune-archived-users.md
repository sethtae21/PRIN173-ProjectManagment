---
id: script-command-prune-archived-users
title: Prune Archived Users
category: script
status: verified
source_of_truth: [backend/accounts/management/commands/prune_archived_users.py]
related: [docs-kb-scripts-commands-index, docs-kb-scripts-index, service-archive-retention-lifecycle]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## What It Runs

Runs the archived-user retention sweep, optionally previewing due dates, forcing immediate relocation, changing the grace window, or sanitizing existing cold rows. The lifecycle and pseudonymized deletion behavior are documented in [Archived-User Retention Lifecycle](../../backend-logic/services/archive-retention-lifecycle.md) ([`Command.handle()`](../../../../backend/accounts/management/commands/prune_archived_users.py#L72)).

## Prerequisites

Use the configured Django database and a valid pseudonymization key for any relocation or cold-row sanitization. `--force` and non-preview operation can delete live archived-user rows after creating the cold record ([command and options](../../../../backend/accounts/management/commands/prune_archived_users.py#L37)).

## Command (PowerShell)

```powershell
Set-Location .\backend
python .\manage.py prune_archived_users --preview
python .\manage.py prune_archived_users
python .\manage.py prune_archived_users --days 30 --force
```

For the pseudonymization backfill:

```powershell
python .\manage.py prune_archived_users --sanitize-existing --preview
```

## Inputs/Env Vars

- `--days`: grace period in days; defaults to `90`.
- `--force`: ignore the grace period.
- `--preview`: list schedule without moving users; with `--sanitize-existing`, also makes that sanitization a dry run.
- `--sanitize-existing`: backfill existing cold rows.
- Database and pseudonymization key are provided through Django settings ([arguments and handler](../../../../backend/accounts/management/commands/prune_archived_users.py#L46)).

## Outputs & Reports

Preview prints archived timestamps, computed due dates, and eligibility. Apply mode reports the number of users relocated; sanitize mode reports scanned, pseudonymized, and already-clean counts ([handler](../../../../backend/accounts/management/commands/prune_archived_users.py#L72)).

## Exit Codes

No explicit exit code is set for successful runs. Preview/apply paths return normally; uncaught database or pseudonymization errors fail the management command ([`handle()`](../../../../backend/accounts/management/commands/prune_archived_users.py#L72)).

## Source

- [`backend/accounts/management/commands/prune_archived_users.py` lines 37–122](../../../../backend/accounts/management/commands/prune_archived_users.py#L37): command options, preview, sanitation, and sweep dispatch.
- [Archived-User Retention Lifecycle](../../backend-logic/services/archive-retention-lifecycle.md): retention implementation contract.

## Related

- [Archived-User Retention Lifecycle](../../backend-logic/services/archive-retention-lifecycle.md)
- [Archived-User Pseudonymization](../../backend-logic/services/archived-user-pseudonymization.md)

## Back to index

- [Django Management Command Catalog](README.md)
- [Runnable Script Catalog](../README.md)
- [Knowledge-base home](../../README.md)
