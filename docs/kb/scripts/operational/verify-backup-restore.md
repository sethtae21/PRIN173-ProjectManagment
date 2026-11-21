---
id: script-operational-verify-backup-restore
title: Backup and Restore Verification
category: script
status: verified
source_of_truth: [backend/scripts/verify_backup_restore.ps1]
related: [docs-kb-scripts-operational-index, docs-kb-scripts-index, script-operational-backup-atlas]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## What It Runs

Runs `backup_atlas.ps1`, restores only the `fitfusion.django_migrations` namespace into a unique temporary database, checks that the restored collection has at least one document, then drops the temporary database and removes its temporary files ([backup/restore/verification flow](../../../../backend/scripts/verify_backup_restore.ps1#L1)).

## Prerequisites

- Windows PowerShell, backend virtual-environment Python, MongoDB Database Tools (`mongodump` and `mongorestore`), and a MongoDB identity allowed to dump the source and create/drop the temporary database.
- The source database must contain at least one `django_migrations` document for the verification to pass.

## Command (PowerShell)

From the repository root:

```powershell
& .\backend\scripts\verify_backup_restore.ps1
```

## Inputs/Env Vars

Reads `MONGODB_URI` from the process or `backend\.env`. It temporarily sets `DEBUG=True` and supplies a temporary `DJANGO_SECRET_KEY` only when absent, then restores the original process values. It creates a database named with the `ffrv_` prefix and a random suffix ([environment handling and cleanup](../../../../backend/scripts/verify_backup_restore.ps1#L19)).

## Outputs & Reports

Prints the restored collection/document count and `Atlas backup and restore verification passed.` on success. A timestamped compressed backup is created in a temporary directory, and the restore database is dropped in cleanup ([verification and `finally` block](../../../../backend/scripts/verify_backup_restore.ps1#L43)).

## Exit Codes

The script does not set explicit `exit` statements. It returns normally after success and throws on missing tools/configuration, failed backup/restore, or an empty restored collection; exact process status for a terminating PowerShell error depends on the invoking host ([failure checks](../../../../backend/scripts/verify_backup_restore.ps1#L1)).

## Source

- [`backend/scripts/verify_backup_restore.ps1` lines 1–112](../../../../backend/scripts/verify_backup_restore.ps1#L1): tool resolution, environment setup, temporary restore, validation, and cleanup.
- [`backend/scripts/backup_atlas.ps1` lines 1–55](../../../../backend/scripts/backup_atlas.ps1#L1): invoked backup implementation.
- [`backend/diagnostics/README.md` lines 1–33](../../../../backend/diagnostics/README.md#L1): operational bucket description.

## Related

- [Atlas Database Backup](backup-atlas.md)

## Back to index

- [Operational Script Catalog](README.md)
- [Runnable Script Catalog](../README.md)
- [Knowledge-base home](../../README.md)
