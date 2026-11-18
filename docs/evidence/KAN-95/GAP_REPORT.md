**Why this is not Done**
- Ticket: KAN-95 — KAN-92 Weekly manual DB backups per NFR 4.3 with Seth
- Current Jira status: In Progress
- Blocking reason: Weekly manual Atlas database backup runs and restore-test log not evidenced
- Missing: dated Atlas dumps stored in two locations, restore-test results, backup log countersigned by Seth
- Evidence checked: docs/evidence/KAN-95/ does not exist; backend/scripts/backup_atlas.ps1 referenced in Jira description
- To close this ticket: Run backup_atlas.ps1, store dumps off-machine, verify restore against a scratch database, log the run
- Owner: CARLOS JEFFERSON S. YAP
