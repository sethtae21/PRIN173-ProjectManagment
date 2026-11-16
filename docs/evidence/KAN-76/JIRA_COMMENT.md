**Verification evidence**
- Requirement: not stated in ticket
- Method: Configuration artifact and ignore-rule inspection at `.gitignore`, `backend/requirements.txt`, and `backend/.env`.
- Result: Artifacts present at .gitignore and backend/requirements.txt; backend/.env is ignored and not tracked.
- Tests proving this ticket: N/A (manual or artifact evidence; not a backend test).
- Artifact: `.gitignore; backend/requirements.txt; backend/.env (ignored, not tracked)`
- Commit: `389a0de`  Verified: `2026-11-16`
- Limitations: Verified tracked config paths and ignore rules; no environment-variable values are included.
