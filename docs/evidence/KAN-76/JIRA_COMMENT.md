**Verification evidence**
- Requirement: not stated in ticket
- Method: .gitignore; backend/requirements.txt
- Result: PASS - artifact present at .gitignore, backend/requirements.txt.
- Tests proving this ticket: N/A (manual or artifact evidence; no ticket-specific backend test executed).
- Artifact: .gitignore ; backend/requirements.txt
- Commit: `cbb6eab` (working tree dirty)  Verified: 2026-11-17
- Limitations: Configuration files were verified; backend/.env was not attached because it may contain local credentials. This does not prove deployment or repository operations at runtime.
