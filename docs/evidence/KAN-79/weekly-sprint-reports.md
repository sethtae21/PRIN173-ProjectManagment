# FitFusion AI — Weekly Sprint Reports

**Course:** Project Management — PRIN 173  
**Report prepared:** 2026-11-18  
**Sources:** `git log --all --oneline --since="2026-08-01"`, `docs/evidence/EVIDENCE_INDEX.md`, and Project Charter v1.1 §7.1.

## Date and evidence interpretation

The Charter identifies Week 14 as the week of the November 21, 2026 final defense. The ranges below use Monday–Sunday weeks, anchoring Week 14 to November 16–22 and counting backward. The evidence index's `Date` values are evidence-record dates, not confirmed Jira completion dates. The pre-existing PASS rows were dated November 17, 2026; this report is generated and indexed on November 18. The report lists PASS evidence by its index date and does not claim that the Jira issues were completed on those dates. No per-ticket completion dates for Weeks 2–13 were found in the cited sources.

“Key commits” are representative non-session commits from the requested Git history, not a complete commit inventory. Milestone rows report Charter §7.1 targets; a target is not described as reached unless the sources verify it.

## Week 2 — August 24–30, 2026

- **Tickets:** No ticket completion dates for this week are recorded in the evidence index.
- **Key commits:**
  - `52a1642` — Setup Database (2026-08-30)
- **Milestone:** M1 Initiation is targeted for Week 2. The Charter records the Idea Doc v1.1 baseline, but the available Git and evidence records do not verify all M1 acceptance/sign-off criteria.

## Week 3 — August 31–September 6, 2026

- **Tickets:** No ticket completion dates for this week are recorded in the evidence index.
- **Key commits:**
  - `129e648` — implement Part 3 & 4 batch upload, GridFS, CRUD, and upgrade to Django 6.0.0 (2026-09-05)
  - `e396b33` — rewrite requirements.txt in UTF-8 with bounded versions (2026-09-06)
  - `b380dd0` — Remove sensitive files from tracking and update .gitignore (2026-09-02)
- **Milestone:** No separate Charter §7.1 milestone target.

## Week 4 — September 7–13, 2026

- **Tickets:** No ticket completion dates for this week are recorded in the evidence index.
- **Key commits:**
  - `8bb64cc` — Registration, login, ZIP download, and database writes (2026-09-08)
  - `70bcca6` — ERD in docs folder (2026-09-12)
- **Milestone:** M2 Requirements & Architecture Baseline is targeted for Week 4. The ERD and API work are represented in Git, but the Charter also requires a Figma prototype and asset-pipeline guide; completion of all M2 criteria is not verified here.

## Week 5 — September 14–20, 2026

- **Tickets:** No ticket completion dates for this week are recorded in the evidence index.
- **Key commits:**
  - `7f3eb37` — migrate backend to MongoDB Atlas, implement Seller CSV upload pipeline with rembg, and scaffold remaining domain models (2026-09-18)
- **Milestone:** No separate Charter §7.1 milestone target.

## Week 6 — September 21–27, 2026

- **Tickets:** No ticket completion dates for this week are recorded in the evidence index.
- **Key commits:**
  - `aecde51` — feat(commerce): implement mock e-commerce backend & cart CRUD (KAN-118) (2026-09-27)
  - `202865a` — weekly sprint templates added (2026-09-27)
  - `e62d9f5` — fix(tests): resolve ValueError in account deletion cascade test (2026-09-27)
- **Milestone:** No separate Charter §7.1 milestone target.

## Week 7 — September 28–October 4, 2026

- **Tickets:** No ticket completion dates for this week are recorded in the evidence index.
- **Key commits:**
  - `5ef20a3` — KAN-111: Restrict recommendations to ACTIVE catalog items only (2026-09-28)
  - `768b7c0` — close backend checklist (validation, routes, tests, timing proof, backup) (2026-09-30)
  - `b4f90b3` — backend completion audit and validation against the approved baseline and Jira backlog (2026-10-01)
- **Milestone:** No separate Charter §7.1 milestone target.

## Week 8 — October 5–11, 2026

- **Tickets:** No ticket completion dates for this week are recorded in the evidence index.
- **Key commits:**
  - `222ca2d` — Seller Dashboard / Product Listing (2026-10-11)
  - `71c0ece` — Seller signup page (2026-10-10)
  - `b5e895e` — sidebar (2026-10-11)
- **Milestone:** M3 Core Implementation & Prototype is targeted for Week 8. The commits show implementation activity, but the Charter's full milestone criteria are not verified as complete by the available records.

## Week 9 — October 12–18, 2026

- **Tickets:** No ticket completion dates for this week are recorded in the evidence index.
- **Key commits:**
  - `ec55c75` — minimal revisions on ui (2026-10-15)
  - `0e01774` — minimal revisions on the ui (2026-10-15)
  - `800411f` — minimal revisions on the design (2026-10-15)
- **Milestone:** No separate Charter §7.1 milestone target.

## Week 10 — October 19–25, 2026

- **Tickets:** No ticket completion dates for this week are recorded in the evidence index.
- **Key commits:**
  - `00bc8f1` — fix(auth): resolve SWAP SUSPECT cross-user token drift (2026-10-25)
  - `7f33027` — fix(seller): resolve listings redirect, template download, and color swatch bugs (2026-10-25)
  - `43d5819` — shopper fixes across catalog, cart, checkout, and order placement (2026-10-25)
- **Milestone:** No separate Charter §7.1 milestone target.

## Week 11 — October 26–November 1, 2026

- **Tickets:** No ticket completion dates for this week are recorded in the evidence index.
- **Key commits:**
  - `65ae7b2` — feat(outfits): persist saved outfits to the backend with avatar snapshot (2026-10-31)
  - `8158bf6` — feat(cart): integrate outfit-to-cart with real previews and live badge (2026-10-31)
  - `f38b77d` — Sync selected items with cart API (2026-10-31)
  - `80a4073` — fix(fitting-studio): exclude female-only cuts from the male avatar (2026-10-31)
- **Milestone:** M4 Implementation Baseline & Validation is targeted for Week 11. Although implementation and test commits exist, the evidence index still records deployment/UAT work as deferred or in progress; full M4 completion is not verified.

## Week 12 — November 2–8, 2026

- **Tickets:** No ticket completion dates for this week are recorded in the evidence index.
- **Key commits:**
  - `eaa490c` — Fix per-tab sessions and auth history (2026-11-07)
  - `f419c27` — Add account archiving and cold-storage pruning (2026-11-07)
  - `143db67` — updated documents (2026-11-07)
- **Milestone:** No separate Charter §7.1 milestone target.

## Week 13 — November 9–15, 2026

- **Tickets:** No ticket completion dates for this week are recorded in the evidence index.
- **Key commits:**
  - `848fd43` — Organize project papers and refresh ERD (2026-11-14)
  - `b932411` — docs: replace ERD png with live-schema version (2026-11-13)
  - `35c06e5` — KAN-119: GridFS orphan-image cleanup on replace, re-upload and delete (2026-11-13)
  - `04187f9` — Skip rematting and stale rejection snapshots (2026-11-13)
- **Milestone:** No separate Charter §7.1 milestone target.

## Week 14 — November 16–22, 2026

- **Tickets:** The following pre-existing tickets have PASS results and evidence-index date 2026-11-17. KAN-79's report artifact was generated and indexed 2026-11-18. These are evidence dates; Jira completion dates are not available in the cited source.
  - KAN-40: 1.2.1 Database Schema Design
  - KAN-41: 1.2.2 REST API Architecture & Specification
  - KAN-45: 1.3.1 Authentication & RBAC Module
  - KAN-46: 1.3.2 Avatar Creation & Management Module
  - KAN-47: 1.3.3 Seller Catalog Management
  - KAN-49: 1.3.5 Rule-Based Recommendation Engine
  - KAN-50: KAN-49 Knowledge table and scoring service
  - KAN-52: KAN-45 Registration, login, JWT, role assignment
  - KAN-53: KAN-45 Password policy and server-side RBAC
  - KAN-54: KAN-45 Guest access and ephemerality
  - KAN-56: KAN-45 Account view, update, and delete endpoints and screens
  - KAN-58: KAN-46 Preset CRUD endpoints
  - KAN-60: KAN-47 Environment standardization with Django 6.0.8, MongoDB backend, TLS fix, bounded requirements
  - KAN-62: KAN-47 CSV template and instruction ZIP
  - KAN-63: KAN-47 Upload endpoint with batch tracking and background processing
  - KAN-64: KAN-47 Validation rules a to e and batch report
  - KAN-65: KAN-47 GridFS storage and temp-file cleanup
  - KAN-76: KAN-71 Repository hygiene: .gitignore, bounded requirements, untracked .env and bytecode
  - KAN-101: KAN-49 In-app rating endpoints & persistence rules (FR-7.5)
  - KAN-103: KAN-49 Weights basis memo + deterministic regression & ±1 sensitivity tests (FR-7.2 validation)
  - KAN-104: Shopper catalog read API with store filter (SRS FR-3.3)
  - KAN-111: KAN-49 Restrict recommendations to ACTIVE catalog items (close views.py TODO)
  - KAN-117: KAN-49 Harden /api/recommendations/ input validation (limit bounds, enum fields, numerics)
  - KAN-118: 1.3.6 Mock E-Commerce Module (backend)
  - KAN-79: KAN-77 Weekly sprint reports
- **Key commits:**
  - `b93f510` — Configure Vite on port 8443 with optional TLS (2026-11-17)
  - `41d22f0` — Redirect new avatar creation to fitting studio (2026-11-17)
  - `cc2acc7` — Align catalog and recommendation APIs (2026-11-17)
  - `23c73e7` — Add Jira evidence upload script (2026-11-18)
- **Milestone:** M5 Final Defense & Delivery is scheduled for November 21, 2026. As of this report date (November 18), the target date is still in the future; UAT sign-off and final handover are not confirmed.
