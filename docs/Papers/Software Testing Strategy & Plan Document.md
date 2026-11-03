# **Software Testing & Quality Assurance Plan**

| Project Name | FitFusion AI – Virtual Try-On & Outfit Simulation System |
| :---- | :---- |
| **Document Version** | 1.0 |
| **Date** | 2026-10-23 |
| **Prepared By** | Seth Martin D. Duclayan (Project Manager / Scrum Master), with Karol Dein A. Tamo (Frontend Lead / QA Coordinator) \- Group 1 |
| **Target Audience** | Development Team (Backend/Frontend), QA/UAT Execution Team, Project Stakeholders, Panel of Evaluators, Course Adviser |
| **Reference Documents** | SRS v1.1 (2026-09-21); Project Scope Baseline v1.1; Project Charter v1.1; Use Case Specifications UC-01–UC-19; Jira board KAN (Epic 1.4 – Quality Assurance & Testing, KAN-81); WBS 1.4.1–1.4.3 |

## **1\. Executive Summary & Strategy**

### **1.1 Objective**

This document defines the software testing strategy and execution plan for the FitFusion AI Semester 1 MVP. The goal is to ensure high reliability, performance, security, and alignment with the baselined business requirements (SRS v1.1 FR-1.1–FR-7.5 and Scope Baseline v1.1 Acceptance Criteria 1–11) using a **Shift-Left Testing** approach and **Defensive Software Engineering** practices. All testing activity is tracked in Jira under Epic 1.4 (KAN-81): Unit & Integration Testing (KAN-82 / WBS 1.4.1), Validation Algorithm Testing (KAN-83 / WBS 1.4.2, with KAN-84 happy-path performance run, KAN-85 edge-case rejection suite, KAN-86 palette-tag verification), and User Acceptance Testing (KAN-87 / WBS 1.4.3, with KAN-88 walkthroughs, KAN-89 survey/KPI logging, KAN-90 NFR evidence log).

### **1.2 Quality Goals**

* Achieve **\>80% code coverage** for core business logic (recommendation scoring, CSV/image validation algorithm, cart–checkout–order scoping, preset validation) via Unit Testing (KAN-82).  
* Achieve a **100% pass rate** on the defined validation-algorithm test cases (Scope Criterion 4/5 suite; KAN-83/KAN-85).  
* Detect and resolve **100% of Critical/Blocker (P1/P2) defects** prior to the local staging demonstration and the Week 14 final defense (November 21, 2026).  
* Meet all performance NFRs: 95% of catalog/filtering/recommendation/commerce API requests \<500 ms; canvas overlay, view-angle, and proportion-deformation renders \<1 s; initial load \<3 s; 10-item CSV pipeline \<60 s (Criteria 1–4).  
* Meet UAT gates: first-time Guest try-on ≤2 minutes (Criterion 6); ≥80% fit/style confidence improvement and fit-visualization "rating" ≥4/5 (Criterion 9); ≥80% recommendation approval (Criterion 10); ≥80% purchase-decision confidence improvement with lower return-intent (Criterion 11); ≥70% cart-to-mock-checkout completion (Criterion 8).  
* Pass 100% of the Security & Privacy checklist — TLS 1.2+, Argon2id/PBKDF2 hashing, server-side RBAC, ephemeral guests, no user photo upload,RA 10173-compliant account deletion via deactivation and restricted archival (Criterion 7/ RT-09).  
* Maintain a predictable **Cost of Quality (CoQ)** by shifting defect detection left: weights  regression \+ ±1 sensitivity tests run at commit time (KAN-103), and API input-hardening tests (KAN-117) precede integration testing.

## **2\. Test Execution Levels & Framework**

            /\\  
           /  \\   Acceptance / UAT  (Business requirements, Criteria 6 & 9–11,  
          /----\\              Charter OBJ-01/02/05/06/07/09; Week 12 gate)  
         /       \\  
        /--------\\  End-to-End (E2E)  (React \+ Django \+ Atlas workflows on local  
       /            \\                   staging; Criteria 1–5, 7, 8\)  
      /------------\\  
     /                 \\  Unit Testing  (Scoring, validation rules a–e, serializers,  
    /----------------\\               RBAC scoping, mock gateway; every commit/PR)

| Level | Coverage | Primary Owner | Execution Frequency | Jira / WBS |
| :---- | :---- | :---- | :---- | :---- |
| Unit | Django models, serializers, views, scoring.py, knowledge table, Pillow/rembg validation rules, defensive input guards | Developers (Carlos – backend, Dein – frontend logic) | Every code commit and pull request (Django test runner \+ React unit tests) | KAN-82 / WBS 1.4.1; KAN-103; KAN-117 |
| End-to-End (E2E) | Complete workflows spanning React frontend, Django REST API, MongoDB Atlas, and GridFS storage on the local staging host | Seth with Dein and Carlos | End of every sprint; mandatory gates before M3 (Week 8), M4 (Week 11), M5 (Week 14\) | KAN-83, KAN-84, KAN-85, KAN-86 / WBS 1.4.2 |
| Acceptance / UAT | Role-based walkthroughs (Guest, Registered User, Seller), UAT survey instrument, in-app like/dislike ratings (FR-7.5) | PM (Seth) \+ Frontend/QA Coord. (Dein); end-user representatives from other sections | Week 12 phase gate prior to defense sign-off | KAN-87, KAN-88, KAN-89, KAN-90 / WBS 1.4.3 |

## **3\. Unit Testing Standard**

### **3.1 Scope & Purpose**

* **Scope:** Individual functions and isolated components: weighted scoring function and knowledge-table lookups (FR-7.1–7.2); validation rules (a) required fields, (b) ≥800×800 px and ≤5 MB, (c) alpha-channel validity, (d) CSV-to-upload filename mapping, (e) image–text color alignment (FR-4.7); color\_palette\_tags derivation (FR-3.2/4.2); preset serializer guards (height 120–220 cm, weight 30–200 kg, female-only cup size — FR-2.3/2.7); cart/order owner scoping and Guest rejection (FR-6.1, FR-1.8); mock payment gateway approve/decline (FR-6.5); GridFS orphan-cleanup hooks (FR-4.5/4.6, KAN-119); recommendation endpoint input hardening (KAN-117).  
* **Primary Owner:** Software Developers / Engineering Team (Carlos for backend modules; Dein for client-side validation logic).  
* **Execution Frequency:** Automatically triggered on every code commit and pull request; results reviewed during weekly sprint planning (KAN-77).

### 

### **3.2 Key Guidelines & Rules**

1. **Isolation:** Unit tests execute without calling the live Atlas cluster or external network — use seeded test collections/fakes for MongoDB and in-memory image fixtures for Pillow/rembg paths (Mocks/Stubs).  
2. **Defensive Validation:** Every function handling input must test edge cases (null inputs, invalid types, boundary limits such as 119/120/220/221 cm and 87/88/112/113 cm, unexpected exceptions).  
3. **Execution Speed:** Full unit suite must execute in under 2 minutes so it remains a per-commit gate.  
4. **Determinism:** Scoring and validation tests use fixed tag combinations and fixed image fixtures so results are reproducible for panel audit (Charter §6.1.11 explainability).

### **3.3 Unit Test Case** 

| Test ID | Target Module / Function | Input / Condition | Expected Outcome | Type | Status |
| :---- | :---- | :---- | :---- | :---- | :---- |
| UT-01 | recommendations/scoring.score\_item | Fixed tags: color match \+ height contrast \+ shading \+ style match | Total score 7; deterministic ranking order | Happy Path / Regression | Pass (KAN-103) |
| UT-02 | recommendations/scoring (weights) | Perturb each weight by ±1 | Top-1 ranking does not invert for canonical avatar profiles | Sensitivity | Pass (KAN-103) |
| UT-03 | recommendations/views (input hardening) | limit=-5; undertone="warmmm"; height\_cm="abc" | HTTP 400 with allowed enums/ranges; valid inputs still 200 | Edge / Defensive | Pass (KAN-117) |
| UT-04 | catalog/validation rule (b) | Image 700×700 px; separate file 6 MB | Reject with "below 800×800" / "exceeds 5 MB" reasons | Edge / Defensive | Pass (KAN-64) |
| UT-05 | catalog/validation rule (c) | Opaque PNG (no alpha channel) | Reject with invalid-alpha reason | Edge / Defensive | Pass (KAN-64) |
| UT-06 | catalog/validation rule (d) | CSV filename with no matching uploaded file | Reject with filename-mapping reason | Edge / Defensive | Pass (KAN-64) |
| UT-07 | catalog/validation rule (e) | Declared color "red" with blue-dominant image | Reject with image–text color mismatch reason | Edge / Defensive | Pass (KAN-64) |
| UT-08 | catalog palette derivation | color\_family \= "red" on publish | color\_palette\_tags populated from knowledge table | Happy Path | In Progress (KAN-86) |
| UT-09 | accounts/preset serializer | height=250 cm; Body Build=200 cm | 400 with descriptive range errors; avatar not updated | Edge / Defensive | Pass (KAN-58) |
| UT-10 | accounts/preset serializer | cup\_size supplied with gender=male | 400 field error (cup size female-only, FR-2.7) | Defensive Check | Pass (KAN-58) |
| UT-11 | commerce views (RBAC) | Guest POST /cart; User B GET User A order | 401/403 for Guest; 403/404 cross-user; owner-only reads | Security / RBAC | Pass (KAN-118) |
| UT-12 | commerce mock gateway | Simulated decline response | Checkout error shown; no order record; cart intact | Edge / Defensive | Pass (KAN-118) |
| UT-13 | catalog storage cleanup | Replace listing image; delete listing | Old GridFS ObjectIds absent from fs.files/fs.chunks | Regression | Planned (KAN-119) |
| UT-14 | accounts preset serializer \+ canvas guardrails | Size equipped (e.g., S); attempt height/weight beyond the size-compatible band | Control stops at the limit and shows the allowed-range message; backend still enforces global 120–220 cm / 30–200 kg (FR-2.3) | Edge/Defensive | Planned |

## **4\. End-to-End (E2E) Testing Standard**

### **4.1 Scope & Purpose**

* **Scope:** Complete application workflows spanning the React frontend, Django REST backend, MongoDB Atlas, and GridFS storage — authentication/RBAC, avatar creation and presets, try-on canvas, catalog browsing and per-seller Store pages, recommendations and ratings, cart/checkout/order history, and the full Seller CSV pipeline.  
* **Primary Owner:** QA Engineers (Dein as QA Coord/Lead; Dein executes frontend flows; Carlos executes pipeline and API flows; Seth consulted as PM).  
* **Execution Frequency:** Sprint-end regression passes plus mandatory pre-release gates at M3, M4, and M5 on the local staging host.

### **4.2 Key Guidelines & Rules**

1. **Environment:** Run in the dedicated local staging environment (localhost/LAN URL, TLS via local CA per SRS §5.3) mirroring the demonstration configuration; loopback HTTP only for local development, never for evidence runs.  
2. **Data Isolation:** Use the approved seeding scripts (KAN-40) and a reset routine per run so tests never fail on dirty database state; Guest sessions verified as non-persistent at the storage layer.  
3. **Evidence:** Record timings, screenshots, and report exports into the NFR evidence log (KAN-90) for Criteria 1–5, 7, 8\.

### 

### 

### 

### 

### 

### **4.3 E2E Test Case** 

| Case ID | Scenario / Feature | Prerequisites | Execution Steps | Expected Result | Pass/Fail Criteria |
| :---- | :---- | :---- | :---- | :---- | :---- |
| E2E-01 | Guest first try-on (UC-01, UC-03, UC-04) | Staging seeded; no account | 1\. Continue as Guest. 2\. Create avatar (gender, height/weight, skin tone, undertone, proportions). 3\. Equip a Top. 4\. Toggle Front/Rear. | Canvas layers PNG over avatar; instant updates; session-only data | Completed ≤2 min (Criterion 6); zero guest writes to persistent DB |
| E2E-02 | Registration, login, preset persistence (UC-07, UC-08, UC-09) | Clean test user | 1\. Register (role User). 2\. Save avatar preset. 3\. Logout → login. 4\. Open preset list/edit. | Password policy enforced; JWT session; preset reloads (FR-2.5) | HTTP 200 on reload; preset fields identical post-login |
| E2E-03 | Seller upload happy path (UC-15, UC-16, UC-17, UC-18) | Seller account; 10-item CSV \+ 20 images | 1\. Download template. 2\. Upload CSV \+ Front/Rear images. 3\. Receive batch ticket. 4\. Open validation report. | 202 Accepted; rembg PNGs generated; report lists accepted/rejected with reasons | Pipeline \<60 s (Criterion 4); ≥80% published without correction (Criterion 5\) |
| E2E-04 | Rejection → fix → republish loop (UC-16, UC-17, UC-19) | Item declared "red" with blue image | 1\. Upload. 2\. Read rejection reason. 3\. Edit listing, replace image. 4\. Re-validate. | Rejected item never published; after fix, status Active; old PNG purged | Report reason matches rule (e); GridFS old ObjectId absent (KAN-119) |
| E2E-05 | Cart → mock checkout → order history (UC-11, UC-12, UC-13, UC-14) | Registered user; active catalog | 1\. Add 2 items. 2\. Update quantity. 3\. Checkout: address \+ payment. 4\. Mock approval. 5\. Open order history/detail. | Order record with items, store names, address, timestamp; cart cleared | Order fields complete (FR-6.6); ≥70% cart completion across runs (Criterion 8\) |
| E2E-06 | RBAC negative paths (UC-08, UC-11) | Guest session; non-seller user | 1\. Guest opens cart/checkout. 2\. Non-seller opens Seller upload. | Guest prompted to register; non-seller denied | 401/403 returned server-side; no client-side bypass (Criterion 7\) |
| E2E-07 | Recommendations, match reasons, ratings (UC-05, UC-06) | Avatar with warm undertone | 1\. Open Recommendation Panel. 2\. View match reasons. 3\. Guest clicks like. 4\. Registered user clicks like. | Ranked items with visible scores/rules; Guest gets sign-up prompt; registered rating persists | Reasons shown per FR-7.3/7.4; guest rating not persisted (FR-1.9) |
| E2E-08 | Canvas performance (UC-03, UC-04) | Mid-range laptop; staged catalog | 1\. Switch item. 2\. Toggle view. 3\. Change proportion.4. Equip a Dress/One-Piece → Top and Bottom slots replaced with confirmation (FR-5.2 v1.1). | Each overlay/deformation renders fluidly | Each render ≤1 s (Criterion 2; KAN-84 run) |
| E2E-09 | API performance sweep | Staging under normal load | 1\. Script calls to catalog, filtering, recommendation, commerce endpoints. 2\. Compute 95th percentile. | Responses within threshold | 95% \<500 ms (Criterion 1\) |
| E2E-10 | Account deletion (deactivation \+ archival)/ RA 10173 (SRS FR-1.4; RT-09 / RSK-08 checklist) | User with presets, outfits, orders | 1\. Request account deletion. 2\. Confirm.3. Query active collections for user data; verify the archived record is access-restricted and pseudonymized. | Account deactivated (login and all role access blocked); personal data removed from active collections and retained only in the restricted archive per the retention policy | Post-delete queries on active collections return nothing; the archive is readable only through the restricted retention path and holds no directly identifying fields (FR-1.4; Criterion 7 checklist) |
| E2E-11 | Saved outfit CRUD (UC-10) | Registered user with equipped items | 1\. Save outfit. 2\. List. 3\. Load. 4\. Edit. 5\. Delete. 6\. Load outfit containing a deleted catalog item. | Outfit persists across sessions; missing item warned and skipped | CRUD round-trip passes; warning shown per UC-10 extension |
| E2E-12 | Catalog browsing, filters, per-seller Store page (UC-02) | Seeded catalog with ≥2 Sellers; Guest session | 1\. Open Catalog Browser. 2\. Apply category filter, then size filter, then price filter/sort. 3\. Open an item detail. 4\. Click the store name to open the Store page. 5\. Confirm only that Seller's active items are listed. | Filtered subsets match seeded data per FR-3.3; Store page lists only that Seller's active items; read-only for Guests | Filter results exact; Store page count \== Seller's active item count (KAN-104/105) |

## **5\. User Acceptance Testing (UAT) Standard**

### **5.1 Scope & Purpose**

* **Scope:** High-level validation of business objectives, user satisfaction, functional requirements, and usability with end-user representatives for all three roles: Guest, Registered User, Seller. Captures pre/post confidence, return intent, and in-app like/dislike ratings per FR-7.5 to evidence Criteria 6 and 9–11 and Charter OBJ-01, OBJ-02, OBJ-05, OBJ-06, OBJ-07, OBJ-09.  
* **Primary Owner:** Product Manager (Seth) and Frontend/QA Coordinator (Dein) as end-user representatives' facilitators; Kahlil archives survey instruments.  
* **Execution Frequency:** Week 12 phase-gate sign-off prior to the Week 14 defense (KAN-87, KAN-88).

### **5.2 Sign-off Criteria**

* 100% of mandatory acceptance criteria met (Criteria 1–11 at their stated targets).  
* Zero open Severity P1 (Critical) or P2 (High) defects.  
* Signed UAT acceptance form plus archived survey results and rating logs (KAN-89) and consolidated NFR evidence log (KAN-90).  
* Dry-run demonstration approved by the adviser during the bi-weekly review (KAN-80).

### **5.3 UAT Execution Template**

| UAT ID | User Story / Requirement | Test Step / Action | Business Expectation | Stakeholder Sign-Off | Status |
| :---- | :---- | :---- | :---- | :---- | :---- |
| UAT-01 | As a first-time Guest, I want to complete one try-on within 2 minutes without training (FR-1.8, §4.4; Criterion 6 / OBJ-02) | Observer times a Guest session from landing page to equipped item with Front/Rear toggle. | Session completes ≤2:00 with zero photo uploads and no registration prompt blocking flow. | \[Seth – PM\] \[Participant\] | Planned (Week 12\) |
| UAT-02 | As a Registered User, I want confidence that the fit visualization suits me (FR-7.5; Criterion 9 / OBJ-01) | Pre-session confidence rating → try-on → post-session rating → in-app like/dislike on fit visualization. | ≥80% of sessions show ≥+1 gain or post ≥4/5 and rate "like" ≥4/5. | \[Seth – PM\] \[Participant\] | Planned (Week 12\) |
| UAT-03 | As a shopper, I want style recommendations I can trust (FR-7.3–7.5; Criterion 10 / OBJ-05) | Review Recommendation Panel with match reasons; rate recommendations post-session. | ≥80% approval ("like" ≥4/5). | \[Seth – PM\] \[Participant\] | Planned (Week 12\) |
| UAT-04 | As a shopper, I want confidence in my purchase decision and lower intent to return (Criterion 11 / OBJ-06) | Pre/post purchase-decision confidence and return-intent ratings around a mock checkout session. | ≥80% of sessions report higher confidence and lower return-intent vs baseline. | \[Seth – PM\] \[Participant\] | Planned (Week 12\) |
| UAT-05 | As a Seller, I want to upload my catalog using the template and instruction sheet without help (FR-4.1–4.8; Criterion 5 / OBJ-09) | Seller participant downloads template, uploads 10 items unassisted, reads validation report. | ≥80% of items publish without manual correction; report reasons understood. | \[Carlos – Backend\] \[Participant\] | Planned (Week 12\) |
| UAT-06 | As a Registered User, I want to complete a mock purchase end-to-end (FR-6.1–6.9; Criterion 8 / OBJ-07) | Build cart, checkout through mock gateway, verify order history entry. | ≥70% of created carts complete the simulated checkout. | \[Seth – PM\] \[Participant\] | Planned (Week 12\) |
| UAT-07 | As a user, I want my data protected (FR-1.4–1.9; Criterion 7 / OBJ-04) | Walkthrough: password policy, guest ephemerality check, account deletion (deactivation \+ archival) request. | Checklist 100% pass; deletion deactivates the account and archives personal data under restricted access, with no active access remaining. | \[Seth – PM\] \[Carlos – Backend\] | Planned (Week 12\) |

## 

## **6\. Defect Management & Severity Matrix**

| Severity Level | Definition | Response Window | Resolution Target |
| :---- | :---- | :---- | :---- |
| P1 – Critical | Staging down, data loss/corruption (orders, presets), security breach (RBAC bypass, guest data persisted to DB). No workaround. | Immediate (\<1 hour; overrides the 12-hour Messenger tag rule) | Same day/emergency hotfix before any demo or milestone |
| P2 – High | Major feature broken but partial workaround exists (e.g., canvas misalignment on one proportion, checkout failing on one path). | \<4 hours | Within current sprint (weekly cycle) |
| P3 – Medium | Minor feature bug or UI misalignment; core functionality unaffected (filter sorting, report wording, asset edge case). | Next planning cycle | Scheduled next sprint |
| P4 – Low | Cosmetic flaw, typo, minor enhancement suggestion. | Backlog review | Backlog / low priority; fixed only before freeze if capacity allows |

All defects are logged in Jira as sub-tasks under Epic 1.4 (KAN-81) with label *defect* and severity mapped to the Priority field. Defect trends are reported in the weekly sprint report (KAN-79) and reviewed at bi-weekly adviser reviews (KAN-80).

## **7\. Quality Metrics & Reporting**

* **Defect Density:** Total defects found / lines of code (or function points) per work package (1.3.1–1.3.8).  
* **Test Pass Rate:** (Passed Tests / Total Executed Tests) × 100, reported per suite (unit, validation, E2E, UAT).  
* **Cost of Quality (CoQ) Ratio:** Prevention \+ appraisal costs (WBS 1.4 effort: 40 \+ 25 \+ 30 hrs plus review time) vs. failure costs (rework hours logged in Jira).  
* **Acceptance-Criteria Attainment Dashboard** (updated weekly in the sprint report):

| Criterion | Target | Measurement Source | Owner | Jira Evidence |
| :---- | :---- | :---- | :---- | :---- |
| 1 Performance | 95% API \<500 ms | Automated performance run | Carlos / Seth | KAN-84, KAN-90 |
| 2 Rendering | Overlay/view/proportion \<1 s | Render benchmark | Dein | KAN-84, KAN-90 |
| 3 Load time | \<3 s on campus Wi-Fi | Load-time test | Dein | KAN-90 |
| 4 Seller pipeline | 10 items \<60 s | Pipeline timing test | Carlos / Seth | KAN-83, KAN-84 |
| 5 Upload accuracy | ≥80% publish clean | Validation report audit | Seth | KAN-85 |
| 6 Usability | Guest try-on ≤2 min | Observed UAT session | Dein | KAN-88 |
| 7 Security | Checklist 100% | Security review checklist | Carlos / Seth | KAN-90 |
| 8 Commerce flow | ≥70% carts complete | UAT commerce scenario | Seth | KAN-89 |
| 9 Fit/style confidence | ≥80% improve \+ like ≥4/5 | Pre/post ratings \+ in-app rating | Seth / Dein | KAN-89 |
| 10 Recommendation approval | ≥80% like ≥4/5 | Post-session rating | Seth | KAN-89 |
| 11 Purchase-decision confidence | ≥80% improve, lower return intent | Pre/post UAT ratings | Seth | KAN-89 |

## **Appendix A — Traceability: Suites → Requirements → Jira**

| Suite / Cases | SRS Reference | RTM | Jira |
| :---- | :---- | :---- | :---- |
| UT-01, UT-02, UT-03; E2E-07 | FR-7.1–7.5 | RT-06 | KAN-103, KAN-117, KAN-49 |
| UT-04…UT-08; E2E-03, E2E-04 | FR-4.1–4.8 | RT-04 | KAN-83, KAN-85, KAN-86, KAN-47 |
| UT-09, UT-10; E2E-01, E2E-02, E2E-08 | FR-2.1–2.10, FR-5.1–5.3 | RT-02, RT-05 | KAN-58, KAN-46, KAN-48, KAN-116 |
| UT-11, UT-12; E2E-05, E2E-06, E2E-10 | FR-1.1–1.9, FR-6.1–6.9 | RT-01, RT-07, RT-09 | KAN-45, KAN-56, KAN-118 |
| E2E-09; E2E-08 | SRS §4.1 | RT-08 | KAN-90 |
| UAT-01…UAT-07 | SRS §4.4, FR-7.5 | RT-01, RT-02, RT-04, RT-05, RT-06, RT-07, RT-09 | FR-1.4–1.9, FR-2.1–2.10, FR-4.1–4.8, FR-5.1–5.8, FR-6.1–6.9, FR-7.5, §4.4 |
| E2E-12 | FR-3.1–3.4 | RT-03 | KAN-104, KAN-105 |

## 

## **Appendix B — Use-Case Coverage Map (UC-01–UC-19)**

| Use Case | Covering Test Cases |
| :---- | :---- |
| UC-01 Customize Avatar | UT-09, UT-10, UT-14, E2E-01, E2E-02 |
| UC-02 Browse Catalog | E2E-12, E2E-09 |
| UC-03 Try On Clothing | E2E-01, E2E-08 |
| UC-04 Switch Avatar View | E2E-08 |
| UC-05 View Recommendations | UT-01–UT-03, E2E-07 |
| UC-06 View Match Reasons | E2E-07 |
| UC-07 Register Account | E2E-02 |
| UC-08 Access Account | E2E-02, E2E-06 |
| UC-09 Manage Avatar Presets | E2E-02 |
| UC-10 Manage Saved Outfits | E2E-11 |
| UC-11 Manage Cart | UT-11, E2E-05, E2E-06 |
| UC-12 Complete Mock Checkout | UT-12, E2E-05 |
| UC-13 Process Mock Payment | UT-12, E2E-05 |
| UC-14 View Order History | E2E-05 |
| UC-15 Download CSV Template | E2E-03 |
| UC-16 Upload Catalog Items | UT-04–UT-07, E2E-03, E2E-04 |
| UC-17 Validate Catalog Items | UT-04–UT-08, E2E-04 |
| UC-18 View Validation Report | E2E-03, E2E-04 |
| UC-19 Manage Listings | E2E-04, UT-13 |

End of document — FitFusion AI Software Testing & Quality Assurance Plan v1.0 (2026-10-24). Maintained under WBS 1.4 and Epic KAN-81; changes to this plan follow the Scope Baseline Change Management Plan when they affect baselined criteria.

