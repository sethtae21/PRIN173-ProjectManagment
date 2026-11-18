**Why this is not Done**
- Ticket: KAN-87 (MANUAL) — 1.4.3 User Acceptance Testing
- Current Jira status: In Progress
- Blocking reason: Live UAT was not executed. Only infrastructure and a blank checklist exist; the signed acceptance form, survey results, and consolidated NFR evidence log were not found.
- Missing: Completed walkthroughs for at least 5 Guest, 5 Registered User, and 2 Seller sessions, survey/rating exports, signed UAT acceptance form, and KAN-90 NFR log linkage.
- Evidence checked: `docs/evidence/KAN-87/UAT_WALKTHROUGH_CHECKLIST.md` is unfilled. `backend/ratings/tests.py` UAT RBAC tests are "ok" in `docs/evidence/_runs/20261117T100832Z-ratings.meta.json` but prove controls, not sessions. `backend/fitfusion_uat_results.csv` shows most KPIs Not Run; `backend/mongodb_export/uat_response.json` and `uat_session.json` are empty (`[]`).
- To close this ticket: Human action: run the role-based UAT cohort on seeded local staging, administer surveys, capture ratings/exports, obtain signatures, and file the evidence.
- Owner: Unassigned
