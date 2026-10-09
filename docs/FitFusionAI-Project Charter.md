

# **FitFusion AI – Virtual Try-On & Outfit Simulation System**

**Project Charter**

Document Identifier: IEEE-PC-FITFUSION-01  |  Version: 1.1  | Date: 2026-09-21

## **1\. Project Overview**

**Project Name:** FitFusion AI – Virtual Try-On & Outfit Simulation System

**Course Title & Code:** Project Management – PRIN 173

**Instructor:** Ma Christina Florentino

**Target Completion / Submission Date:** November 18, 2026 (Week 14 — Final Defense)

## **2\. Document Control & References**

### **2.1 Revision History**

| Version | Date | Author(s) | Description of Changes |
| :---- | :---- | :---- | :---- |
| 1.0 | 2026-08-29 | Project Group 1 |  |
| 1.1 | 2026-09-21 | Project Group 1 | Revisions per Panel of Evaluators feedback |

### **2.2 Referenced Documents**

* **\[R1\]** IEEE Std 1058-1998 (Software Project Management Plans).  
* **\[R2\]** ISO/IEC/IEEE 29148:2018 and IEEE Std 830-1998 (Requirements Specifications).  
* **\[R3\]** FitFusion AI Project Idea Document v1.1 (2026-08-22) — project title approved by the panel on 2026-08-27.  
* **\[R4\]** FitFusion AI Software Requirements Specification (SRS) v1.1 (2026-09-21); supersedes v1.0 approved on 2026-08-28.  
* **\[R5\]** FitFusion AI Project Scope Baseline v1.1 (2026-09-21); supersedes v1.0 approved on 2026-08-28 (Scope Statement, WBS, WBS Dictionary, Change Management Plan).  
* **\[R6\]** FitFusion AI Team Working Agreement & Role Sign-off Letter (2026-08-24).  
* **\[R7\]** FitFusion AI Entity-Relationship Diagram (ERD) — project GitHub repository: github.com/sethtae21/PRIN173-ProjectManagment (/docs).  
* **\[R8\]** Figma UI Wireframes: figma.com/design/Xf2GQEuKbp8JRts4rCkRrX/FitFusion-Wireframe.  
* **\[R9\]** Vendor documentation: MongoDB Atlas, Django, React.  
* **\[R10\]** National Retail Federation (NRF), *Consumer Returns in the Retail Industry* (2023 ed.) — industry return-rate and returns-cost data.  
* **\[R11\]** Zalando SE — fit/size-related returns handling and acquisition of Fit Analytics (2021) as evidence of fit uncertainty in online apparel.  
* **\[R12\]** ASOS — "Fit Assistant" / "See My Fit" virtual try-on features deployed to address size-and-fit uncertainty.  
* **\[R13\]** Google Shopping — Virtual Try-On feature requiring a user-uploaded full-body photograph for ML-rendered previews.  
* **\[R14\]** Baymard Institute — e-commerce UX, page-speed expectations, and cart-abandonment studies (2024).  
* **\[R15\]** McKinsey & Company, *The value of getting personalization right — or wrong* (2021).  
* **\[R16\]** DOLE / NWPC — Regional Tripartite Wages and Productivity Board, NCR Wage Order (daily minimum wage basis for the labor benchmark in §7.2).  
* **\[R17\]** Shopee Seller Centre & Lazada Seller Center — manual listing and image guidelines without automated garment-image validation.  
* **\[R18\]** Color theory and seasonal color-analysis practice (e.g., Itten's color wheel; seasonal color-analysis practice) — basis of the color-family compatibility knowledge table and recommendation weights

## **3\. Project Overview & Business Case**

## **3.1 Problem Statement & Justification**

## **Problem 1 (P1):** Online shoppers discover only after delivery whether a garment actually fits their body type and size; because fit can only be confirmed by wearing the item, the mismatch is discovered at home, and the shopper bears the personal cost: repacking, return or exchange shipping, refund waits, and wasted money. This is a post-purchase (post-buy) fitting problem experienced by the shopper — the disappointment and personal cost occur after the purchase decision, not during browsing; the retailer-side business impact of the same returns is P4. Fit-uncertainty is a documented driver of apparel returns, as shown by Zalando's fit-related returns processes and its acquisition of Fit Analytics \[R11\], and by ASOS deploying Fit Assistant/"See My Fit" to close the same gap \[R12\].

## **Problem 2 (P2):** Existing virtual try-on and preview solutions impose privacy or performance costs — for example, Google Shopping's Virtual Try-On requires users to upload a full-body photograph for machine-learning rendering \[R13\] — and slow, heavy shopping experiences increase bounce and cart abandonment \[R14\].

## **Problem 3 (P3):** Before any purchase is made, shoppers hesitate to explore new styles because they cannot preview whether a garment's color, pattern, and overall look will suit their skin tone and personal taste; generic, one-size-fits-all previews and recommendations ignore individual color compatibility and style preference, frustrating consumers who expect personalized experiences. This is a pre-purchase (pre-buy) style-and-color problem — distinct from P1's post-buy fitting problem and independent of body size: the barrier here is taste and color confidence before any money is spent, so shoppers stick to safe, familiar choices instead of exploring \[R15\].

## **Problem 4 (P4):** Online clothing retailers experience increased product return rates, customer complaints, and lost sales due to uncertain purchasing decisions; industry returns data reports returns as a persistent, large-scale drain on retail revenue \[R10\].

## **Problem 5 (P5):** Marketplace sellers (e.g., Shopee and Lazada seller centers) rely on manual listing guidelines with no automated garment-image validation, producing inconsistent photos and metadata that mislead buyers and contribute to returns \[R17\].

**Justification:** FitFusion AI addresses the pre-purchase side of these problems — it improves purchase-decision confidence and reduces return-intent through (a) multi-angle visualization of catalog garments on a personalized avatar and (b) explainable, rule-based style/color recommendations. The MVP does not perform garment-fit prediction: it does not predict size or guarantee physical fit, because physical fit can only be confirmed by wearing the garment; the post-purchase fitting cost of P1 is addressed indirectly via reduced return-intent (OBJ-06).

## **3.2 Project Objectives & Success Criteria**

| Metric ID | Objective / Target | Addresses Problem | Method of Measurement |
| :---- | :---- | :---- | :---- |
| OBJ-01 | Fit uncertainty reduced before purchase: ≥80% of try-on sessions show improved self-reported fit/style confidence (pre/post within-session 1–5 scale: ≥+1 point gain or post ≥4/5) and rate the fit visualization "like" (≥4/5) | P1 | Pre/post session confidence rating \+ like/dislike rating captured during UAT (≥80% of sessions improve & ≥4/5) |
| OBJ-02 | Friction & privacy cost removed: first-time Guest completes one try-on within 2 min, no training, no registration, no photo upload | P2 | Observed UAT session (≤2 min, zero uploads) |
| OBJ-03 | Performance cost of existing solutions removed: 95% API \<500 ms; canvas \<1 s; load \<3 s | P2 | Automated performance test (SRS §4.1); render benchmark; load-time test |
| OBJ-04 | Privacy cost removed: 100% pass on Security & Privacy checklist (TLS 1.2+, Argon2id, server-side RBAC, ephemeral guests, no photo upload) | P2 | Security audit & RT-09 checklist (100% pass) |
| OBJ-05 | Style hesitation resolved: ≥80% approval ("like" ≥4/5) of color/style recommendations | P3 | Post-session recommendation rating (≥80% approval) |
| OBJ-06 | Purchase-decision confidence improved: ≥80% of UAT sessions report higher confidence in the purchase decision and lower intent to return the tried item vs pre-session baseline (self-reported proxy — real returns reduction is a post-MVP business outcome, per assumption 6.1.7) | P1, P4 | Pre/post UAT confidence \+ return-intent ratings (≥80% of sessions improve) |
| OBJ-07 | Lost sales from hesitation reduced: ≥70% of created carts complete mock checkout | P4 | UAT commerce scenario (≥70% checkout) |
| OBJ-08 | Manual-listing burden removed: 10-item CSV processed \<60 s | P5 | Pipeline timing test |
| OBJ-09 | Inconsistent listings eliminated at source: ≥80% publish without manual correction | P5 | Seller Dashboard validation report audit |
| OBJ-10 | MVP fully operational on local staging and demonstrable by Week 14 — final defense on November 18, 2026 | Project-level | Milestone audit (Week 14\) |
| OBJ-11 | All baselined deliverables accepted: signed UAT form \+ Panel sign-off (§9) by Week 14 | Project-level | Signed UAT form \+ §9 approval record |
| OBJ-12 | Infrastructure cost maintained at Php0 (free tiers only) through the defense date | Project-level | Zero-billing verification (Php0) |

## 

## 

## **4\. Scope & High-Level Requirements**

### **4.1 In-Scope Features**

1. System Authentication & Role-Based Access Control (JWT; Registered User / Guest / Seller; server-side RBAC; ephemeral guest sessions)  
2. Multi-Angle Avatar System (male/female; height/weight mapping; skin tone and undertone; shoulder, waist, hip, thigh, cup-size proportions; Front/Side/Rear views)  
3. Seller-Managed Catalog via CSV upload with automated rembg background removal and Pillow-based validation with rejection reports  
4. Virtual Try-On 2D Overlay Canvas (per-category item switching, instant view toggling, saved outfit CRUD)  
5. Explainable Rule-Based Styling Engine (Deterministic Expert System) using weighted tag scoring (color \+3, height contrast \+2, proportion shading \+1, style/occasion \+1) with visible match reasons.  
6. Mock E-Commerce Flow (persistent cart for Registered Users, full checkout UI, standalone mock payment gateway, order history)  
7. Catalog browsing and filtering (category, size, color, style, and per-seller Store pages)

### 

### **4.2 Out-of-Scope (Boundaries)**

1. Real payment processing and merchant fulfillment (mock payment only)  
2. User-uploaded photos or clothing images (Sellers only manage the catalog)  
3. Garment-fit prediction, size prediction, or fit guarantees (the system provides fit visualization and explainable recommendations only).  
4. Custom-trained Machine Learning (ML), Deep Learning, and Generative AI models. The MVP strictly uses a deterministic, rule-based Heuristic Expert System for styling recommendations to guarantee explainability and avoid ML training costs. Off-the-shelf utilities like rembg/Pillow are permitted only for image preprocessing and validation, not for recommendation, fit prediction, or decision-making.  
5. Fully 3D rotatable avatars, WebGL rendering, dynamic cloth physics  
6. Multi-seller marketplace discovery; external third-party API integrations  
7. Body tracking, pose detection, fabric simulation  
8. Cloud-hosted application hosting (application runs on local staging host; only MongoDB Atlas remains cloud-hosted)

### 

### **4.3 Major Project Deliverables**

* Project Charter, Project Idea Document, SRS, Project Scope Baseline & WBS (v1.1 baselines)  
* Figma UI wireframes/prototypes and 2D asset pipeline design guide  
* MongoDB Atlas schema (collections & ERD) and Django REST API specification  
* Executable MVP: React frontend, Django backend, CSV \+ rembg image pipeline, rule-based recommendation engine, standalone mock payment gateway  
* Test suite (unit, integration, validation-algorithm) and UAT sign-off package  
* Locally hosted MVP web application (local staging URL; TLS via local CA for the staging demonstration URL; loopback HTTP for local development only per SRS §5.3, Seller instruction sheet, source code repository (GitHub), final panel demonstration & handover package

## 

## 

## 

## 

## 

## 

## **4.4 Requirements Traceability Matrix (RTM)**

## 

| Req ID | High-Level Requirement  | SRS Reference | WBS Package | Deliverable | Verification Method | Acceptance Criteria (Scope Baseline 1.2 / Charter 3.2) |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| RT-01 | Secure registration, login, RBAC, guest ephemerality (Idea Feature 6\) *(enabling — security/privacy foundation; indirect problem link via OBJ-04/P2)* | FR-1.1–1.9 | 1.3.1 | Auth & RBAC module | Unit tests \+ security review | Criterion 7 / OBJ-04 |
| RT-02 | Customizable multi-angle avatar with saved presets (Idea Feature 1\) | FR-2.1–2.10 | 1.3.2 | Avatar creator & preset management | Integration test \+ UAT | Criteria 2, 6 / OBJ-02 |
| RT-03 | Browsable, filterable clothing catalog with Seller metadata (Idea Feature 2\) | FR-3.1–3.4 | 1.2.1, 1.3.3 | Catalog browser \+ MongoDB catalog schema | Integration test | Criterion 1 / OBJ-03 |
| RT-04 | Seller CSV upload with auto background removal & validation (Idea Feature 2\) | FR-4.1–4.8 | 1.3.3, 1.3.7 | Seller Dashboard \+ rembg/Pillow pipeline \+ validation reporting | Validation test suite (1.4.2), 100% pass on defined cases | Criteria 4, 5 / OBJ-08, OBJ-09 |
| RT-05 | Multi-angle virtual try-on overlay canvas with outfit saving (Idea Feature 3\) | FR-5.1–5.8 | 1.3.4, 1.3.8 | React try-on canvas \+ outfit management | Render benchmark \+ UAT (incl. fit like/dislike rating) | Criterion 2, 9 / OBJ-01, OBJ-03 |
| RT-06 | Explainable rule-based outfit recommendations (Idea Feature 4\) | FR-7.1–7.5 | 1.3.5 | Recommendation engine with visible scores | Service tests \+ weights-validation tests per SRS FR-7.2 \+ in-app recommendation rating | Criterion 10 / OBJ-05 |
| RT-07 | Mock cart, checkout, and order history (Idea Feature 5\) | FR-6.1–6.9 | 1.3.6 | Mock e-commerce module \+ mock gateway | End-to-end checkout test \+ UAT commerce scenario (pre/post simulated return-intent rating) | Criterion 8, 11 / OBJ-06, OBJ-07 |
| RT-08 | Performance & load targets for API, canvas, page load | SRS §4.1 | 1.4.1 | Performance test report | Automated performance test | Criteria 1–3 / OBJ-03 |
| RT-09 | Security & privacy (TLS 1.2+, hashed passwords, RA 10173\) *(enabling — compliance foundation; indirect problem link via OBJ-04/P2)* | SRS §4.2 | 1.3.1, 1.5.1 | Secure deployment config | Security review checklist | Criterion 7 / OBJ-04 |
| RT-10 | Local staging deployment on team-managed host (DB remains Atlas free tier) *(project-level — deployment feasibility; links OBJ-10/OBJ-12)* | SRS §2.3 | 1.5.1 | Live local staging URL (localhost/LAN) with green health checks | Health-check verification | OBJ-10 / OBJ-12 |

## 

## 

## **5\. Organization & Responsibilities**

### **5.1 Key Stakeholders**

| Role | Name / Title | Contact / Organization | Authority Level |
| :---- | :---- | :---- | :---- |
| Sponsor | Panel of Evaluators | Academic Panel — Charter Approval & Sign-Off (§9) | Final approval; CCB co-approver |
| Instructor / Course Adviser | Ma Christina Florentino, Course Instructor – PRIN 173 | PRIN 173 Course Faculty | Academic guidance & governance oversight; CCB co-approver |
| Project Manager / Scrum Master | Seth Martin D. Duclayan | Student Lead / PM | Day-to-day execution; CCB chair; schedule & reporting |
| Technical Lead / Backend Lead | Carlos Jefferson S. Yap | Backend, Architecture & DevOps | Architecture & code quality; backend, database, and deployment decisions |
| Frontend Lead / QA Coord. | Karol Dein A. Tamo | Frontend, UI/UX & UAT Execution | UI implementation decisions; leads frontend UAT execution |
| Documentation & Presentation Lead | Kahlil Alfonso A. Lacia | Technical Writing & Defense Flow | Documentation control; UAT survey design; physical deliverables & presentation flow |

### 

### **5.2 Responsibility Assignment Matrix (RACI)**

R \= Responsible, A \= Accountable, C \= Consulted, I \= Informed

| Project Task / Phase | PM (Seth) | Backend (Carlos) | Frontend (Dein) | Docs & Pres. (Kahlil) | Sponsor (Panel of Evaluators) |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Charter & Scope Sign-off | A | C | C | C | R |
| SRS & Architecture Baseline | C | A / R | C | I | I |
| Backend Implementation | I | A / R | C | I | I |
| Frontend Implementation | I | C | A / R | I | I |
| Testing, QA & UAT Surveys | C | R | A / R | R  | I |
| Documentation & Seller Sheets | I | C | C | A / R | I |
| Final Demonstration & Handover | A / R | R | R | R (Deck/Flow) | I |

## **6\. Technical & Management Constraints**

### **6.1 Project Assumptions & Constraints**

**6.1.1** Assumption: Sellers can follow the CSV template and three-view photo conventions without extensive training (SRS FR-4.1).

**6.1.2** Assumption: rembg will isolate garments without manual editing (SRS FR-4.2).

**6.1.3** Assumption: multi-angle 2D overlay provides sufficient visual fidelity for initial validation (SRS §2.4, Avatar-only visualization).

**6.1.4** Assumption: mock payment sufficiently validates e-commerce UX (SRS §2.4, Mock payment in MVP).

**6.1.5** Assumption: MongoDB Atlas free tier (M0: 512 MB, 500 connections) and the local staging host suffice for MVP load (SRS §2.4, Cloud free-tier dependency).

**6.1.6** Assumption: frontend and backend can be developed concurrently in Semester 1 by the leads (SRS §2.1, Product Perspective).

**6.1.7** Assumption: real returns/complaints reduction is a post-MVP business outcome; the MVP measures self-reported return-intent and purchase-decision confidence as proxies (SRS FR-7.5; Scope Criteria 9–11).

**6.1.8** Constraint: Total infrastructure budget capped at Php0 (free tiers only) (SRS §2.4, Cloud free-tier dependency; Scope Baseline §1.5); application hosted on local staging host(dedicated local staging server); only MongoDB Atlas remains cloud (free tier)

**6.1.9** Constraint: The MVP must be fully demonstrable at the final defense — Week 14, November 18, 2026 (SRS §2.4, Semester timeline).

**6.1.10** Constraint: Fixed stack — React (+Vite), Python 3.13+ / Django 6.x, MongoDB Atlas; local staging host minimum 4 GB RAM, x86\_64 (SRS §2.3, Operating Environment).

**6.1.11** Constraint: No Machine Learning or Black-Box AI. The system shall use a deterministic, Heuristic Expert System (Symbolic AI) for recommendations to remain fully explainable, auditable by the panel, and viable within the zero-budget/one-semester constraint (SRS §2.4, AI positioning).

**6.1.12** Constraint: Compliance with the Data Privacy Act of 2012 (RA 10173\) and WCAG 2.1 Level AA target (SRS §2.4, Privacy regulation; SRS §4.4).

### 

### 

### 

### 

### 

### **6.2 Preliminary Risk Management**

| Risk ID | Description | Impact | Probability | Mitigation Strategy |
| :---- | :---- | :---- | :---- | :---- |
| RSK-01 | Scope creep (requests for 3D, real payment, mobile apps) | High | High | Enforce the current Scope Baseline (v1.1); formal Change Request \+ Change Control Board (PM \+ adviser/panel); out-of-scope items deferred to future phases |
| RSK-02 | Schedule slippage in critical modules ahead of the Week 14 (November 18, 2026\) defense | High | Medium | WBS weekly milestones, sprint planning, bi-weekly adviser reviews, buffer weeks before the Week 14 defense |
| RSK-03 | Free-tier dependency (Atlas quotas, service limits/discontinuation) | High | Medium | Architecture within free-tier limits; per-Seller upload caps; GridFS storage; weekly manual mongodump backups;local staging host as primary app host; alternative free hosting identified as fallback |
| RSK-04 | Team availability & knowledge concentration (4 members balancing classes) | High | Medium | Shared repository, written handoff documentation, cross-training, pair reviews, and 50-point accountability system |
| RSK-05 | Third-party version risk (rembg, django-mongodb-backend) | Medium | Medium | Pinned versions in requirements.txt; standalone architecture; documented Pillow-only validation fallback |
| RSK-06 | Poor Seller image quality / rembg artifacts on cluttered photos | Medium | High | Automated validation with descriptive rejection reports; Seller instruction sheet advising plain/contrasting backgrounds; filename-mapping checks |
| RSK-07 | Stakeholder expectation mismatch (panel expects 3D/real payment) | Medium | Medium | SRS \+ Scope Baseline as single source of truth; bi-weekly adviser reviews; dry-run demos before the defense |
| RSK-08 | Privacy non-compliance (RA 10173\) | High | Low | Argon2id/PBKDF2 password hashing, minimal data collection, account deletion on request, guest-data ephemerality enforced at storage layer |

## 

## **7\. Milestone Schedule & Budget Estimate**

### **7.1 Schedule Baseline (High-Level)**

| Milestone | Target Completion Date | Major Deliverable / Criteria |
| :---- | :---- | :---- |
| M1: Initiation | Week 2 | Charter approved & signed; Idea Doc v1.1 baselined; SRS and Scope Baseline initially v1.0, revised to v1.1 per panel feedback (WBS 1.1.1) |
| M2: Requirements & Architecture Baseline | Week 4 | Approved MongoDB ERD/schema, Django REST API specification, Figma prototype, 2D asset pipeline guide (WBS 1.2.1–1.2.4) |
| M3: Core Implementation & Prototype | Week 8 | Auth/RBAC, avatar management, Seller CSV \+ rembg pipeline, and try-on canvas working; canvas renders \< 1 s (WBS 1.3.1–1.3.4) |
| M4: Implementation Baseline & Validation | Week 11 | Recommendation engine \+ mock e-commerce complete; outfit management & validation reporting complete; unit/integration tests passing; validation suite 100% pass on defined cases; local staging environment operational (WBS 1.3.5–1.3.8, 1.4.1–1.4.2, 1.5.1) |
| M5: Final Defense & Delivery | Week 14 — Final Defense: November 18, 2026 | UAT sign-off, MVP operational on local staging (localhost/LAN URL), Seller instruction sheet, panel defense & handover (WBS 1.4.3, 1.5.2, 1.5.3) |

### 

### 

### **7.2 High-Level Resource Budget**

| Role | Assigned WBS Packages | Est. Effort | DOLE NCR Benchmark Rate \[R16\] | Benchmark Labor Cost |
| :---- | :---- | :---- | :---- | :---- |
| Project Manager / Scrum Master | 1.1.1–1.1.3, 1.5.3 (share) | 75 Hrs | Php 610.00 / 8-hr day | Php 5,718.75 |
| Technical / Backend Lead | 1.2.1–1.2.2, 1.3.1, 1.3.3, 1.3.5–1.3.7, 1.4.1–1.4.2 (share), 1.5.1, 1.5.3 (share) | 385 Hrs | Php 610.00 / 8-hr day | Php 29,356.25 |
| Frontend Lead / QA Coord. | 1.2.3–1.2.4, 1.3.2, 1.3.4, 1.3.6 (share), 1.3.8, 1.4.1–1.4.3 (share), 1.5.3 (share) | 330 Hrs | Php 610.00 / 8-hr day | Php 25,162.50 |
| Documentation & Presentation Lead | 1.5.2, 1.5.3 (share) | 20 Hrs | Php 610.00 / 8-hr day | Php 1,525.00 |
| **Total** | All Level-3 work packages (WBS Dictionary) | **810 Hrs** | — | **Php 61,762.50** |

**Infrastructure Costs:** Php0 — MongoDB Atlas M0 free tier, local staging host (dedicated local staging server), and open-source tooling (GitHub, Jira, Figma free tiers). No paid services required.

## **8\. Governance**

**Governance mechanism:** Any addition, deletion, or modification to the baselined scope must be submitted via a formal Change Request Form and logged in the project risk/change register; changes affecting timeline, budget, or architecture require Change Control Board approval (Project Manager \+ academic adviser/panel) before work begins. Approved changes bump the SRS and Scope Baseline version numbers in sync (both currently v1.1). Work performed outside the approved baseline without CCB approval is considered scope creep and will not count toward the MVP. Progress is tracked via weekly sprint reports, Friday lab meetings, and bi-weekly adviser reviews.

## 

## 

## 

## 

## 

## 

## 

## 

## 

## 

## 

## 

## 

## 

## **9\. Approval & Sign-Off (Panel of Evaluators)**

By signing below, the Panel of Evaluators grants formal approval for the student group to proceed with project planning and execution based on the scope detailed above.

\[    \] **APPROVED**

\[    \] **APPROVED WITH REVISIONS**

\[    \] **REJECTED / RE-SUBMISSION REQUIRED**

**Comments / Conditions for Approval:**

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**Evaluator 1**

Name: **MS. ZHARINNA MARIE L. CAÑETE**

Signature: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_     Date: \_\_\_\_\_\_\_\_\_\_\_\_\_\_

**Evaluator 2**

Name:  **MR. DAVE B. MERCADO** 

Signature: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_     Date: \_\_\_\_\_\_\_\_\_\_\_\_\_\_

**Evaluator 3**

Name: **MR. JOHN ERICK D. BAUTISTA** 

Signature: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_     Date: \_\_\_\_\_\_\_\_\_\_\_\_\_\_

