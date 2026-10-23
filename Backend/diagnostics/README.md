# Backend/diagnostics — out-of-process diagnostic probes

Black-box checks that talk to a **running** FitFusion server over HTTP using
only the Python standard library (no Django imports, no `requests`). They can
run in a clean venv from any directory. Traceability: WBS 1.4.1 / 1.4.2 test
artifacts; RT-01 (Auth & RBAC).

Folder contract (do not blur these lines):

| Location                            | Purpose                                              |
| ----------------------------------- | ---------------------------------------------------- |
| `Backend/diagnostics/` (this folder)| Black-box HTTP probes against a running server       |
| `Backend/scripts/`                  | Operational tooling (backup_atlas.ps1, staging proxy)|
| `*/management/commands/`            | In-process Django tasks (db_ping, measure_*)         |

## Scripts

| File                          | What it proves                                                        | Exit codes        |
| ----------------------------- | --------------------------------------------------------------------- | ----------------- |
| `verify_session_identity.py`  | Which user each JWT resolves to (login, /profile/, RBAC, refresh); isolates the dein↔karosu "swapped profile" bug to frontend vs backend | 0 pass / 1 fail / 2 server down |

## Run (VS Code terminal)

```powershell
cd <repo>\Backend
.\.venv\Scripts\Activate.ps1

# backend must be listening first
python manage.py runserver 127.0.0.1:8000   # separate terminal

# then, in this terminal (passwords prompted hidden if not passed):
python diagnostics\verify_session_identity.py
python diagnostics\verify_session_identity.py --pass-a "<dein pwd>" --pass-b "<karosu pwd>"