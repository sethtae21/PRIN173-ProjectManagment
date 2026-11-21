---
id: script-command-db-ping
title: MongoDB Target Ping
category: script
status: verified
source_of_truth: [backend/accounts/management/commands/db_ping.py]
related: [docs-kb-scripts-commands-index, docs-kb-scripts-index, service-health-target-resolver]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## What It Runs

Resolves the configured MongoDB target, applies the localhost guard, then pings it using the command's longer `PING_TIMEOUTS` profile. The health resolver and credential-redaction contract is documented in [MongoDB Health Target Resolver](../../backend-logic/services/health-target-resolver.md) ([`Command.handle()`](../../../../backend/accounts/management/commands/db_ping.py#L27)).

## Prerequisites

Run inside the configured Django backend environment with network access to the selected MongoDB target. A local target is refused unless `--allow-local` is supplied ([command options](../../../../backend/accounts/management/commands/db_ping.py#L19)).

## Command (PowerShell)

```powershell
Set-Location .\backend
python .\manage.py db_ping
python .\manage.py db_ping --json
python .\manage.py db_ping --allow-local
```

## Inputs/Env Vars

Uses Django MongoDB settings through `accounts.health_utils`; accepts `--json` and `--allow-local`. The default behavior refuses localhost targets ([arguments](../../../../backend/accounts/management/commands/db_ping.py#L22)).

## Outputs & Reports

Human output reports sanitized cluster/database/TLS details and ping latency/version or failure stage/error/hint. JSON output omits the raw URI ([output handling](../../../../backend/accounts/management/commands/db_ping.py#L43)).

## Exit Codes

Exits `0` when the ping succeeds and `1` for target-resolution or ping failure ([exit paths](../../../../backend/accounts/management/commands/db_ping.py#L34)).

## Source

- [`backend/accounts/management/commands/db_ping.py` lines 19–62](../../../../backend/accounts/management/commands/db_ping.py#L19): `Command`, arguments, resolution, output, and exit handling.
- [MongoDB Health Target Resolver](../../backend-logic/services/health-target-resolver.md): shared target and ping behavior.

## Related

- [MongoDB Health Target Resolver](../../backend-logic/services/health-target-resolver.md)

## Back to index

- [Django Management Command Catalog](README.md)
- [Runnable Script Catalog](../README.md)
- [Knowledge-base home](../../README.md)
