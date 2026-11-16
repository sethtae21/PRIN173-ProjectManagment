**Verification evidence**
- Requirement: SRS Sections 5.2 to 5.3; acceptance per WBS Dictionary 1.2.2.
- Method: python manage.py spectacular --file ..\docs\evidence\KAN-41\api-schema.yml
- Result: BLOCKED - schema command exited 0, but reported 25 warnings and 63 errors.
- Tests proving this ticket: N/A (manual or artifact evidence; not a backend test).
- Artifact: `docs/evidence/KAN-41/api-schema.yml; docs/evidence/KAN-41/spectacular.log`
- Commit: `389a0de`  Verified: `2026-11-16`
- Limitations: Command exited 0, but the schema summary reports 25 warnings and 63 errors; operations are omitted.
