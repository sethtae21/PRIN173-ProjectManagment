---
id: script-diagnostics-verify-session-identity
title: Session Identity Diagnostic
category: script
status: verified
source_of_truth: [backend/diagnostics/verifiy_session_identity.py]
related: [docs-kb-scripts-diagnostics-index, docs-kb-scripts-index]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## What It Runs

Runs HTTP checks for two account identities: login response identity, `/profile/`, role-based `/catalog/my_listings/`, distinct JWT identities, continued validity of the first token after the second login, and refresh-token identity. It makes no Django imports and uses Python's standard-library HTTP client ([`main()` and checks](../../../../backend/diagnostics/verifiy_session_identity.py#L59)).

## Prerequisites

- Run the Django server and have valid seller/shopper accounts for the two configured emails.
- Use a Python interpreter that can run the script; the script itself uses only the standard library.
- The default target is `http://127.0.0.1:8000`; `--base` can select another server ([arguments and probe flow](../../../../backend/diagnostics/verifiy_session_identity.py#L146)).

## Command (PowerShell)

From the repository root:

```powershell
Set-Location .\backend
python .\diagnostics\verifiy_session_identity.py
```

By default, passwords are requested using hidden prompts. Optional arguments include `--base`, `--email-a`, `--email-b`, `--pass-a`, and `--pass-b`; avoid passing passwords on a shared command line ([argument parsing](../../../../backend/diagnostics/verifiy_session_identity.py#L146)).

## Inputs/Env Vars

CLI values: base URL, two account emails, and their passwords. No environment variables are read by this script ([`main()`](../../../../backend/diagnostics/verifiy_session_identity.py#L146)).

## Outputs & Reports

Prints per-check `PASS`/`FAIL` lines, a summary, and a verdict when all checks pass. The HTTP calls perform login and refresh flows using the supplied accounts ([HTTP helper and summary](../../../../backend/diagnostics/verifiy_session_identity.py#L76)).

## Exit Codes

- `0`: all identity checks pass.
- `1`: one or more identity checks fail.
- `2`: the backend cannot be reached.

These are returned by `_summary()` and the reachability branch in `http_json()` ([exit paths](../../../../backend/diagnostics/verifiy_session_identity.py#L76)).

## Source

- [`backend/diagnostics/verifiy_session_identity.py` lines 59–252](../../../../backend/diagnostics/verifiy_session_identity.py#L59): `check`, `http_json`, `_summary`, and `main`. The on-disk filename is misspelled `verifiy_session_identity.py`; it is not renamed.
- [`backend/diagnostics/README.md` lines 1–33](../../../../backend/diagnostics/README.md#L1): diagnostic bucket description and documented run command.

## Related

- [Authentication Smoke Verification](verify-auth.md)

## Back to index

- [Diagnostics catalog](README.md)
- [Runnable Script Catalog](../README.md)
- [Knowledge-base home](../../README.md)
