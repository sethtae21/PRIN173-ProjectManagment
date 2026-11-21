---
id: script-command-backup-gridfs-orphans
title: Backup or Restore GridFS Orphans
category: script
status: verified
source_of_truth: [backend/catalog/management/commands/backup_gridfs_orphans.py]
related: [docs-kb-scripts-commands-index, docs-kb-scripts-index, script-command-sweep-orphan-gridfs]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## What It Runs

Backs up the exact orphan `fs.files` and matching `fs.chunks` documents identified by the shared `sweep_orphan_gridfs` logic, or restores a prior backup. Data is stored as length-prefixed BSON frames to preserve BSON types ([`Command.handle()` and frame helpers](../../../../backend/catalog/management/commands/backup_gridfs_orphans.py#L25)).

## Prerequisites

The configured Django/GridFS storage connection must be available. Backup mode needs filesystem write permission; restore mode needs a readable BSON backup file and MongoDB insert access ([command setup](../../../../backend/catalog/management/commands/backup_gridfs_orphans.py#L146)).

## Command (PowerShell)

```powershell
Set-Location .\backend
python .\manage.py backup_gridfs_orphans
python .\manage.py backup_gridfs_orphans --out '.\backups\orphans.bson'
python .\manage.py backup_gridfs_orphans --restore '.\backups\orphans.bson'
```

## Inputs/Env Vars

- `--out`: output path; default is `backend\backups\gridfs-orphans-<timestamp>.bson`.
- `--restore`: read and reinsert documents from a prior BSON file.
- Uses the backend GridFS/MongoDB settings; no command-specific environment variables are read ([arguments and default path](../../../../backend/catalog/management/commands/backup_gridfs_orphans.py#L85)).

## Outputs & Reports

Backup mode reports orphan file/chunk counts, logical bytes, and on-disk bytes. Restore mode reports restored counts and treats duplicate-key documents as already restored ([backup and restore reporting](../../../../backend/catalog/management/commands/backup_gridfs_orphans.py#L99)).

## Exit Codes

Missing restore files explicitly raise `SystemExit(1)`. Normal completion returns successfully. Non-duplicate `BulkWriteError` entries are logged and reported, but the current handler does not raise a nonzero exit solely for those entries ([restore handling](../../../../backend/catalog/management/commands/backup_gridfs_orphans.py#L99)).

## Source

- [`backend/catalog/management/commands/backup_gridfs_orphans.py` lines 25–190](../../../../backend/catalog/management/commands/backup_gridfs_orphans.py#L25): frame encoding, restore behavior, arguments, and backup flow.
- [`backend/catalog/management/commands/sweep_orphan_gridfs.py` lines 31–80](../../../../backend/catalog/management/commands/sweep_orphan_gridfs.py#L31): shared orphan detection.

## Related

- [Sweep orphan GridFS](sweep-orphan-gridfs.md)

## Back to index

- [Django Management Command Catalog](README.md)
- [Runnable Script Catalog](../README.md)
- [Knowledge-base home](../../README.md)
