---
id: script-diagnostics-verify-auth
title: Authentication Smoke Verification
category: script
status: verified
source_of_truth: [backend/verify_auth.py]
related: [docs-kb-scripts-diagnostics-index, docs-kb-scripts-index]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## What It Runs

Runs a hard-coded registration/login/RBAC/account-deletion smoke flow against `http://127.0.0.1:8000`, while also querying and modifying Django user/cart models directly. Unlike `verifiy_session_identity.py`, this is not a black-box HTTP-only probe: it imports Django and `requests`, creates fixture accounts, and deletes matching prior fixture rows at startup ([setup and checks](../../../../backend/verify_auth.py#L1)).

## Prerequisites

- Run the Django backend at the hard-coded `BASE` URL.
- Use the backend Python environment with Django, project dependencies, and `requests` installed.
- The configured database must be a disposable development/test database. The script creates and deletes user records; its final cleanup deletes the shopper fixture but does not delete the seller fixture it creates ([fixture lifecycle](../../../../backend/verify_auth.py#L1)).

## Command (PowerShell)

From the repository root:

```powershell
Set-Location .\backend
python .\verify_auth.py
```

## Inputs/Env Vars

No CLI arguments or environment-variable overrides are implemented. The base URL, fixture account identifiers, and credentials are constants in the script ([top-level configuration](../../../../backend/verify_auth.py#L1)).

## Outputs & Reports

Prints `PASS`/`FAIL` lines and a final summary for registration, seller validation, duplicate email, password validation, login, seller endpoint RBAC, guest persistence, and account deletion ([`check()` and checks](../../../../backend/verify_auth.py#L16)).

## Exit Codes

The script does not set a failure exit code when a check prints `FAIL`; absent an uncaught exception, it reaches the end of the file and exits normally. Therefore, its printed summary—not the process status—is the check result ([top-level flow](../../../../backend/verify_auth.py#L16)).

## Source

- [`backend/verify_auth.py` lines 1–88](../../../../backend/verify_auth.py#L1): top-level smoke flow, `check()`, and `post()`.
- [`backend/diagnostics/README.md` lines 1–33](../../../../backend/diagnostics/README.md#L1): bucket contract. This script is included in the requested diagnostics inventory, with the caveat that it uses Django/ORM access and mutates fixture data rather than meeting the README's black-box-only description.

## Related

- [Session Identity Diagnostic](verify-session-identity.md)

## Back to index

- [Diagnostics catalog](README.md)
- [Runnable Script Catalog](../README.md)
- [Knowledge-base home](../../README.md)
