---
id: script-command-measure-gridfs-stability
title: Measure GridFS Stability
category: script
status: verified
source_of_truth: [backend/catalog/management/commands/measure_gridfs_stability.py]
related: [docs-kb-scripts-commands-index, docs-kb-scripts-index, script-command-sweep-orphan-gridfs]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## What It Runs

Measures logical GridFS file/chunk counts and catalog-image bytes before and after creating a probe listing, replacing its front image for N cycles, and deleting the listing. It passes only if all logical counters return to baseline; it does not use MongoDB `storageSize` ([`snapshot()` and command](../../../../backend/catalog/management/commands/measure_gridfs_stability.py#L39)).

## Prerequisites

Use a disposable, quiescent development/test database with live GridFS and the image-processing worker available. Concurrent uploads can change the baseline. By default, cleanup deletes the fixed `gridfs_stability@fitfusion.test` user and any remaining probe listing; `--keep-data` disables that cleanup ([warning and cleanup](../../../../backend/catalog/management/commands/measure_gridfs_stability.py#L1)).

## Command (PowerShell)

```powershell
Set-Location .\backend
python .\manage.py measure_gridfs_stability
python .\manage.py measure_gridfs_stability --cycles 5
python .\manage.py measure_gridfs_stability --keep-data
```

## Inputs/Env Vars

- `--cycles`: replacement-cycle count; defaults to `3` and is clamped to at least `1`.
- `--keep-data`: disables fixture cleanup.
- Uses Django database and GridFS settings; no command-specific environment variables are read ([arguments and handler](../../../../backend/catalog/management/commands/measure_gridfs_stability.py#L79)).

## Outputs & Reports

Prints baseline/final counters, deltas, per-cycle worker status, and a `PASS`/`FAIL` verdict ([report and verdict](../../../../backend/catalog/management/commands/measure_gridfs_stability.py#L120)).

## Exit Codes

Exits `0` when all counters return to baseline and `1` for request/worker failures or nonzero final deltas ([verdict exits](../../../../backend/catalog/management/commands/measure_gridfs_stability.py#L218)).

## Source

- [`backend/catalog/management/commands/measure_gridfs_stability.py` lines 39–232](../../../../backend/catalog/management/commands/measure_gridfs_stability.py#L39): `snapshot()`, command arguments, fixture lifecycle, and pass/fail behavior.

## Related

- [Sweep orphan GridFS](sweep-orphan-gridfs.md)

## Back to index

- [Django Management Command Catalog](README.md)
- [Runnable Script Catalog](../README.md)
- [Knowledge-base home](../../README.md)
