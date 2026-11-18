**Why this is not Done**
- Ticket: KAN-90 (ARTIFACT) — KAN-87 NFR evidence log
- Current Jira status: To Do
- Blocking reason: The centralized `NFR_Evidence_Log.md` artifact was not found. The summary says Criteria 1, 2, 3, 6, 8, while the description requires Criteria 1-5, 7, 8; the broader description is treated as blocking.
- Missing: One auditable log with measured API timings (Criterion 1), canvas render times (2), initial load time (3), 10-item upload timing (4), upload accuracy (5), TLS/hash/RBAC/guest-data evidence (7), and mock checkout rate (8), each with PASS status, timestamp, and attached proof.
- Evidence checked: Searched `docs/` and found no `NFR_Evidence_Log` file. `docs/evidence/KAN-90/GAP_REPORT.md` records the same gap. The summary/description criterion mismatch is present in `Jira (10).html`.
- To close this ticket: Human action: create `docs/evidence/KAN-90/NFR_Evidence_Log.md`, attach all measured screenshots/exports, resolve the criterion-scope mismatch, and obtain PM review.
- Owner: KAROL DEIN A. TAMO
