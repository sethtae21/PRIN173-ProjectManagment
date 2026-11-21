---
id: script-command-sweep-orphan-gridfs
title: Sweep Orphan GridFS Objects
category: script
status: verified
source_of_truth: [backend/catalog/management/commands/sweep_orphan_gridfs.py]
related: [docs-kb-scripts-commands-index, docs-kb-scripts-index, script-command-backup-gridfs-orphans]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## What It Runs

Finds GridFS objects under `catalog/front/`, `catalog/rear/`, and legacy `catalog/side/` prefixes whose stored identifiers/filenames are not referenced by a current `CatalogItem`. Default mode is dry-run; `--delete` removes matching chunks and file records ([detection and command](../../../../backend/catalog/management/commands/sweep_orphan_gridfs.py#L31)).

## Prerequisites

Use the configured Django/GridFS database. Run only when no upload/edit is in flight; the script warns that a newly written object may not yet be referenced by a committed row ([operational warning](../../../../backend/catalog/management/commands/sweep_orphan_gridfs.py#L1)).

## Command (PowerShell)

```powershell
Set-Location .\backend
python .\manage.py sweep_orphan_gridfs
python .\manage.py sweep_orphan_gridfs --delete
```

## Inputs/Env Vars

Accepts `--delete`; absent that flag, no database writes occur. Uses the configured GridFS storage and Django database; no command-specific environment variables are read ([arguments and handler](../../../../backend/catalog/management/commands/sweep_orphan_gridfs.py#L83)).

## Outputs & Reports

Prints referenced names, candidate and orphan counts, filenames/byte totals, and either the dry-run message or deletion totals. Per-file delete exceptions are logged and reported while the sweep continues ([handler](../../../../backend/catalog/management/commands/sweep_orphan_gridfs.py#L98)).

## Exit Codes

No explicit process exit code is set. Normal and dry-run completion return normally; per-file deletion failures are reported but caught, so they do not alone force a nonzero command exit ([delete loop](../../../../backend/catalog/management/commands/sweep_orphan_gridfs.py#L140)).

## Source

- [`backend/catalog/management/commands/sweep_orphan_gridfs.py` lines 31–175](../../../../backend/catalog/management/commands/sweep_orphan_gridfs.py#L31): shared detector, command options, dry-run, and delete loop.

## Related

- [Backup or Restore GridFS Orphans](backup-gridfs-orphans.md)
- [Measure GridFS Stability](measure-gridfs-stability.md)

## Back to index

- [Django Management Command Catalog](README.md)
- [Runnable Script Catalog](../README.md)
- [Knowledge-base home](../../README.md)
