---
id: script-operational-backup-atlas
title: Atlas Database Backup
category: script
status: verified
source_of_truth: [backend/scripts/backup_atlas.ps1]
related: [docs-kb-scripts-operational-index, docs-kb-scripts-index]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## What It Runs

Locates MongoDB Database Tools `mongodump`, then creates a gzip-compressed archive for the selected database ([parameter, tool lookup, and backup flow](../../../../backend/scripts/backup_atlas.ps1#L1)).

## Prerequisites

- Windows PowerShell.
- MongoDB Database Tools with `mongodump` available on `PATH` or in the per-user MongoDB Database Tools directory.
- A MongoDB URI with permission to dump the selected database.

## Command (PowerShell)

From the repository root:

```powershell
& .\backend\scripts\backup_atlas.ps1
& .\backend\scripts\backup_atlas.ps1 -Database 'fitfusion' -BackupDirectory '.\backend\backups'
```

## Inputs/Env Vars

- `MONGODB_URI`: current process environment variable, or read from `backend\.env` when not set.
- `-Database`: database name; defaults to `fitfusion`.
- `-BackupDirectory`: output folder; defaults to `backend\backups`.
- `LOCALAPPDATA`: used to search the standard per-user tools directory if `mongodump` is not on `PATH` ([parameter and lookup logic](../../../../backend/scripts/backup_atlas.ps1#L1)).

## Outputs & Reports

Writes `<Database>-yyyyMMdd-HHmmss.archive.gz` in the selected directory and prints its path and byte size. Empty or failed dumps are removed ([archive creation and validation](../../../../backend/scripts/backup_atlas.ps1#L35)).

## Exit Codes

The script does not define explicit `exit` statements. It returns normally on success and throws on missing configuration/tools or a failed/empty dump; the invoking PowerShell host determines the process status for terminating errors ([error paths](../../../../backend/scripts/backup_atlas.ps1#L12)).

## Source

- [`backend/scripts/backup_atlas.ps1` lines 1–55](../../../../backend/scripts/backup_atlas.ps1#L1): parameters, `MONGODB_URI` resolution, `mongodump` invocation, and archive validation.
- [`backend/diagnostics/README.md` lines 1–33](../../../../backend/diagnostics/README.md#L1): operational bucket description.

## Related

- [Backup/restore verification](verify-backup-restore.md)

## Back to index

- [Operational Script Catalog](README.md)
- [Runnable Script Catalog](../README.md)
- [Knowledge-base home](../../README.md)
