---
id: script-command-measure-api-performance
title: API Latency Measurement
category: script
status: verified
source_of_truth: [backend/accounts/management/commands/measure_api_performance.py]
related: [docs-kb-scripts-commands-index, docs-kb-scripts-index]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## What It Runs

Creates a temporary shopper and catalog item, then measures local API responses for catalog list/filter, recommendations, cart read/add, checkout, and orders list. It reports per-endpoint p50/p95/max latency and deletes the temporary user in a `finally` block ([`Command.handle()`](../../../../backend/accounts/management/commands/measure_api_performance.py#L21)).

## Prerequisites

Use a disposable development/test database with the project API routes and catalog available. The command creates database fixtures and makes repeated checkout requests ([fixture and request flow](../../../../backend/accounts/management/commands/measure_api_performance.py#L21)).

## Command (PowerShell)

```powershell
Set-Location .\backend
python .\manage.py measure_api_performance
python .\manage.py measure_api_performance --samples 40 --max-p95-ms 700
```

## Inputs/Env Vars

- `--samples`: requests per measured endpoint; default `30`, minimum `20`.
- `--max-p95-ms`: latency threshold in milliseconds; default `500`.
- Uses Django settings/database; no command-specific environment variables are read ([arguments and validation](../../../../backend/accounts/management/commands/measure_api_performance.py#L14)).

## Outputs & Reports

Prints JSON containing the target, sample count, endpoint latency summaries, pass flag, and any over-target p95 values ([report construction](../../../../backend/accounts/management/commands/measure_api_performance.py#L110)).

## Exit Codes

Completes with status `0` when all requests return expected statuses and each p95 is within the target. Django `CommandError` fails the command for fewer than 20 samples, unexpected HTTP status, or a target breach ([validation and failure paths](../../../../backend/accounts/management/commands/measure_api_performance.py#L21)).

## Source

- [`backend/accounts/management/commands/measure_api_performance.py` lines 14–131](../../../../backend/accounts/management/commands/measure_api_performance.py#L14): command arguments, fixture lifecycle, measurements, and report.

## Related

- No sibling script dependency is documented.

## Back to index

- [Django Management Command Catalog](README.md)
- [Runnable Script Catalog](../README.md)
- [Knowledge-base home](../../README.md)
