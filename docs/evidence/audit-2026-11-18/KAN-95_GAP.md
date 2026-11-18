**Why this is not Done**
- Ticket: KAN-95 (MANUAL) — KAN-92 Weekly manual DB backups per NFR 4.3 with Seth
- Current Jira status: To Do
- Blocking reason: Scripts exist, but there is no evidence of four consecutive weekly runs, a restore drill, or a countersigned backup log. A script is not a performed backup routine.
- Missing: At least four consecutive dated dumps plus pre-milestone dumps, each stored locally and off-machine; a backup log with date, operator, dump size, record counts and restore-test result countersigned by Seth; one passing restore drill against a scratch database with matching counts; and a repo check confirming no dump files are tracked.
- Evidence checked: `backend/scripts/backup_atlas.ps1` and `backend/scripts/verify_backup_restore.ps1` exist and are non-empty. `git ls-files` shows only those scripts and `backend/catalog/management/commands/backup_gridfs_orphans.py`; no dated dump or backup log was found in the repo. `docs/evidence/KAN-95/GAP_REPORT.md` records the gap.
- To close this ticket: Human action: run the backup script weekly/pre-milestone, copy each dump off-machine, perform and record the restore drill, countersign the log, and verify no dumps are tracked.
- Owner: CARLOS JEFFERSON S. YAP
