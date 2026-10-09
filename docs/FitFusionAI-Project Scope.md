# **Project Scope Baseline**

**Project Name:** FitFusion AI – Virtual Try-On & Outfit Simulation System

**Project Manager:** Seth Martin D. Duclayan

**Contributing Team Members:** Lacia, Kahlil Alfonso A.; Tamo, Karol Dein A.; Yap, Carlos Jefferson S.

**Baseline Version:** 1.1

## **1\. Project Scope Statement**

### **1.1 Product Scope Description**

FitFusion AI is a standalone web application that provides an interactive 2D virtual try-on and outfit simulation experience with a mock e-commerce flow. Registered Users and Guests create customizable body avatars (Male or Female) usingheight, weight, skin tone, undertone, and adjustable body proportions (shoulder, waist, hip, thigh, and female-only cup size), and visualize clothing on a multi-angle 2D overlay canvas supporting Front, Side, and Rear views. Shoppers can also browse the catalog and open a per-seller Store page to view and select items published by each Seller. The catalog is managed exclusively by Sellers through a CSV-upload-based Catalog Admin Dashboard; the backend automatically removes image backgrounds using the off-the-shelf rembg library and validates uploads (required fields, dimensions, transparency, filename mapping, and image-text color alignment) using the Pillow library. A deterministic, rule-based Heuristic Expert System (symbolic/heuristic AI) recommends outfits using weighted tag scoring (color compatibility, height contrast, proportion shading, style/occasion match) with fully visible match reasons. Registered Users may add items to a persistent shopping cart and complete a simulated checkout through a standalone mock payment gateway, with order history tied to their account. The system is built on a React (+Vite) frontend, a Python/Django REST backend with JWT authentication and server-side RBAC (Registered User, Guest, Seller), and a MongoDB Atlas cloud database.The application is deployed on the local staging host (dedicated local staging server) for Semester 1 evaluation; only the database remains cloud-hosted (Charter §6.1.8).

The business problem addressed by the MVP is pre-purchase uncertainty — shoppers cannot judge how a garment will look on their body type, skin tone, and personal style before purchase (Charter P1, P3), and retailers bear returns, complaints, and lost sales from uncertain purchases (Charter P4). The MVP addresses this by (a) multi-angle visualization of catalog garments on a personalized avatar and (b) explainable, rule-based style/color recommendations (Heuristic Expert System), thereby improving purchase-decision confidence and reducing return-intent. The MVP does not perform garment-fit prediction: it does not predict size or guarantee physical fit, because physical fit can only be confirmed by wearing the garment; the system reduces uncertainty and return-intent rather than predicting fit (the post-purchase fitting cost of Charter P1 is addressed indirectly via reduced return-intent, Charter OBJ-06).

### **1.2 Acceptance Criteria**

* **Criterion 1 (Performance):** 95% of catalog, filtering, recommendation, and e-commerce API requests return within 500 milliseconds under normal load.  
* **Criterion 2 (Rendering):** Overlay changes (switching a clothing item or view angle) render within 1 second on a mid-range laptop.  
* **Criterion 3 (Load Time):** The initial application load completes within 3 seconds on a standard campus Wi-Fi connection.  
* **Criterion 4 (Seller Pipeline):** A CSV upload of up to 10 items is processed within 60 seconds, including automated background removal (rembg), validation, and image processing.  
* **Criterion 5 (Upload Accuracy):** At least 80% of CSV-uploaded items publish without manual correction, as measured by the Seller Dashboard validation reports.  
* **Criterion 6 (Usability):** A first-time Guest user completes one virtual try-on within 2 minutes without training.  
* **Criterion 7 (Security):** All passwords are hashed (Argon2id or PBKDF2), all traffic uses TLS 1.2+ (local staging uses TLS via a local CA for the demonstration URL; loopback plain HTTP is allowed only for local development/testing per SRS §5.3), RBAC is enforced server-side on every protected endpoint, and no guest data is written to the persistent database.  
* **Criterion 8 (Commerce Flow):** At least 70% of created carts complete the simulated mock checkout during evaluation testing.  
* **Criterion 9 (Fit/Style Confidence):** At least 80% of try-on sessions show improved self-reported fit/style confidence (pre/post within-session 1–5 scale: ≥ \+1 point gain or post ≥ 4/5) and rate the fit visualization "like" (≥ 4/5), measured via pre/post session confidence rating plus the in-app like/dislike rating captured during UAT. (Charter OBJ-01)  
* **Criterion 10 (Recommendation Approval):** At least 80% approval ("like" ≥ 4/5) of color/style recommendations, measured via the post-session in-app recommendation rating. (Charter OBJ-05)  
* **Criterion 11 (Purchase-Decision Confidence):** At least 80% of UAT sessions report higher confidence in the purchase decision and lower intent to return the tried item versus the pre-session baseline (self-reported proxy — real returns reduction is a post-MVP business outcome, per Charter assumption 6.1.7), measured via pre/post UAT confidence and return-intent ratings. (Charter OBJ-06) 

### **1.3 Project Deliverables**

* **Project Management Deliverables:** Project Idea Document, Software Requirements Specification (SRS), Project Scope Baseline, Figma UI wireframes/prototypes, assumptions & risk register, and weekly status reports.  
* **Technical Deliverables:** MongoDB Atlas database schema (collections & ERD), Django REST API, React frontend (avatar canvas, catalog browser, cart/checkout UI, Seller Dashboard), CSV validation \+ rembg image pipeline, rule-based recommendation engine (Heuristic Expert System), standalone mock payment gateway, test suite (unit, integration, validation-algorithm), UAT sign-off package including the UAT survey instrument (pre/post confidence, return-intent, and in-app like/dislike ratings per SRS FR-7.5), and the source code repository.  
* **User/Operational Deliverables:** Locally hosted MVP web application (local staging URL; TLS via local CA for the staging demonstration URL; loopback HTTP for local development only per SRS §5.3), Seller instruction sheet (CSV template \+ three-view photo guidelines), and the final panel demonstration package.

### **1.4 Project Exclusions (Out of Scope)**

* Real payment processing and merchant fulfillment (mock payment only).  
* User-uploaded photos or clothing images (Sellers only manage the catalog).  
* Garment-fit prediction, size prediction, or fit guarantees (the system provides fit visualization and explainable recommendations only).  
* All Machine Learning (ML), Deep Learning, and Generative AI models; the in-scope recommendation component is a deterministic rule-based Heuristic Expert System (symbolic/heuristic AI), not ML (off-the-shelf image-processing utilities like Pillow and rembg are permitted as fixed preprocessing components for background removal and validation only).  
* Fully 3D rotatable avatars, WebGL rendering, and dynamic cloth physics.  
* Multi-seller marketplace model (Shopee-like cross-seller discovery).  
* External API integrations with third-party fashion sites.  
* Body tracking, pose detection, and fabric simulation.  
* Native iOS/Android mobile apps (web application only) and multi-language localization (English only).  
* Cloud-hosted application hosting (the application runs on the local staging host; only MongoDB Atlas remains cloud-hosted).

### **1.5 Constraints**

* **Budget:** Total infrastructure budget capped at Php 0 — the system must run entirely on free tiers (MongoDB Atlas M0); the application is hosted on the local staging host (dedicated local staging server), with only MongoDB Atlas remaining cloud (free tier).  
* **Timeline:** The MVP must be fully demonstrable before the Semester 1 defense date; advanced features are deferred to prevent scope creep.  
* **Compliance:** The system must comply with the Data Privacy Act of 2012 (RA 10173\) and aim for WCAG 2.1 Level AA accessibility.  
* **Technology:** React (+Vite) frontend, Python 3.13+/Django 6.x backend, MongoDB Atlas; local staging host minimum 4GB RAM, x86\_64.

### **1.6 Assumptions**

* Sellers can follow the CSV template and image-filename conventions without extensive training.  
* Sellers will provide three-view photographs (Front, Side, Rear), and the rembg utility will successfully isolate the garments without manual background editing.  
* A multi-angle 2D overlay provides sufficient visual fidelity for initial validation.  
* Mock payment is sufficient to validate the e-commerce UX in the MVP.  
* The MongoDB Atlas free tier (512 MB storage, 500 connections) and the local staging host are sufficient for MVP-scale load.  
* The frontend, backend, and asset pipeline can be developed concurrently within Semester 1\.

## 

## 

## 

## 

## **2\. Work Breakdown Structure (WBS)**

A hierarchical decomposition of the total scope of work to be carried out by the project team, applying the 100% Rule down to Level 3 work packages. The complete WBS is presented below as a single, unsplit text hierarchy; a high-resolution vector export (SVG/PDF) of this same hierarchy is maintained in the project GitHub repository for stakeholder presentations.

* **1.0 FitFusion AI System**  
  * **1.1 Project Management & Baseline Control**  
    * 1.1.1 Scope Management & Baseline  
    * 1.1.2 Sprint Planning & Reviews  
    * 1.1.3 Risk & Stakeholder Reporting  
  * **1.2 Requirements & Design**  
    * 1.2.1 Database Schema Design  
    * 1.2.2 REST API Architecture & Specification  
    * 1.2.3 UI/UX Wireframes & Prototypes  
    * 1.2.4 2D Asset Pipeline Design  
  * **1.3 System Implementation**  
    * 1.3.1 Authentication & RBAC Module  
    * 1.3.2 Avatar Creation & Management Module  
    * 1.3.3 Seller Catalog Upload Pipeline  
    * 1.3.4 Virtual Try-On Overlay Canvas (Core)  
    * 1.3.5 Rule-Based Recommendation Engine  
    * 1.3.6 Mock E-Commerce Module  
    * 1.3.7 Catalog Validation & Reporting  
    * 1.3.8 Outfit Management (Saved Outfits)  
  * **1.4 Testing & Quality Assurance**  
    * 1.4.1 Unit & Integration Testing  
    * 1.4.2 Validation Algorithm Testing  
    * 1.4.3 User Acceptance Testing  
  * **1.5 Deployment & Closure**  
    * 1.5.1 Local Staging Setup & Deployment  
    * 1.5.2 Documentation & Seller Instruction Sheet  
    * 1.5.3 Final Panel Demonstration & Handover

## 

## 

## 

## **3\. WBS Dictionary**

Detailed explanations and requirements for every Work Package (the bottom-level elements of the WBS), with cross-references to the SRS.

| WBS Code | Work Package Name | Statement of Work (SOW) | Acceptable Deliverable / Acceptance Criteria | Assigned Owner | Est. Effort | Milestone |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| 1.1.1 | Scope Management & Baseline | Draft, review, and finalize the Project Idea Document, SRS, and Scope Baseline; maintain version control and the single source of truth. (SRS §1) | Approved Scope Baseline v1.1 and SRS v1.1. | Project Manager | 20 Hrs | Week 2 |
| 1.1.2 | Sprint Planning & Reviews | Conduct weekly sprint planning and bi-weekly adviser reviews; track progress against the WBS. | Weekly sprint reports and burndown tracking. | Project Manager | 30 Hrs | Weekly |
| 1.1.3 | Risk & Stakeholder Reporting | Maintain the assumptions/risk register; produce weekly status reports for the panel and adviser. | Updated risk register and weekly status reports. | Project Manager | 20 Hrs | Weekly |
| 1.2.1 | Database Schema Design | Design MongoDB collections (users, Sellers, catalog items, avatar presets, outfits, carts, orders), indexes, and ER diagrams. (SRS §5.2) | Approved ERD and seeding scripts. | Backend Lead | 40 Hrs | Week 3 |
| 1.2.2 | REST API Architecture & Specification | Specify Django REST endpoints, JSON schemas, and RBAC rules for auth, catalog, cart, orders, and recommendations. (SRS §5.2–5.3) | Approved API endpoint specification. | Backend Lead | 40 Hrs | Week 3 |
| 1.2.3 | UI/UX Wireframes & Prototypes | Produce Figma wireframes for all screens: auth, avatar creator, try-on canvas, catalog, cart/checkout, order history, Seller Dashboard. (SRS §5.1) | Approved Figma prototype linked in the SRS. | UI/UX Designer | 60 Hrs | Week 4 |
| 1.2.4 | 2D Asset Pipeline Design | Define avatar body-layer conventions, Front/Side/Rear alignment grid, and Seller photo/asset guidelines. (SRS FR-2.7, FR-4.1) | Asset design guide and sample aligned PNG set. | UI/UX Designer | 30 Hrs | Week 4 |
| 1.3.1 | Authentication & RBAC Module | Implement JWT login, role selection (User/Seller with Store Name), password policy enforcement, and guest ephemeral sessions. (SRS FR-1.1–1.9) | Fully tested auth endpoints passing security review. | Backend Developer | 60 Hrs | Week 6 |
| 1.3.2 | Avatar Creation & Management Module | Build avatar creator (gender, height/weight mapping, skin tone, proportions) and preset CRUD with persistence across sessions. (SRS FR-2.1–2.10) | Working avatar creator with save/load across sessions. | Frontend Developer | 70 Hrs | Week 6 |
| 1.3.3 | Seller Catalog Upload Pipeline | Build CSV template download, CSV \+ image upload with three labeled drop zones (Front/Side/Rear), and rembg automated background removal generating transparent PNGs; publish accepted items to the catalog under the Seller's Store Name. (SRS FR-4.1–4.6) | Working upload flow publishing items to the catalog with auto-generated transparent PNGs. | Backend Developer | 50 Hrs | Weeks 6–8 |
| 1.3.4 | Virtual Try-On Overlay Canvas (Core) | Build the React multi-angle overlay canvas layering transparent PNG clothing over the avatar, with per-category item switching and instant Front/Side/Rear view toggling without page reload. (SRS FR-5.1–5.3) | Canvas rendering overlay changes within 1 second. | Frontend Developer | 50 Hrs | Weeks 6–8 |
| 1.3.5 | Rule-Based Recommendation Engine | Encode the color-theory knowledge table and the weighted scoring function with the documented basis of weights (color harmony \+3, silhouette/height-appropriate contrast \+2, proportion-appropriate shading \+1, style/occasion \+1, per SRS FR-7.2); expose explainable match reasons and the optional in-app rating hook (SRS FR-7.5) to the Recommendation Panel. (SRS FR-7.1–7.5) | Recommendation service returning ranked items with visible scores; weight basis documented and validated per SRS FR-7.2 (deterministic unit/regression tests, ±1 sensitivity checks, UAT in-app recommendation rating ≥ 80% approval). | Backend Developer | 50 Hrs | Week 9 |
| 1.3.6 | Mock E-Commerce Module | Implement cart CRUD for Registered Users, mock checkout UI, standalone mock payment gateway, and order history with store names. (SRS FR-6.1–6.9) | End-to-end simulated purchase flow with stored order records. | Backend \+ Frontend | 70 Hrs | Week 10 |
| 1.3.7 | Catalog Validation & Reporting | Implement the Pillow-based validation algorithm — (a) required fields present, (b) image files exist and are at least 800 x 800 pixels and do not exceed 5 MB per file, (c) valid alpha channels on generated PNGs, (d) CSV-to-upload filename mapping, (e) image-text color alignment — and the validation report listing accepted and rejected items with reasons. (SRS FR-4.7–4.8) | Validation test suite (1.4.2) with 100% pass rate on defined cases; rejection report displayed in the Seller Dashboard; weights-validation report showing passing regression/sensitivity tests and any tuned weight values with recorded rationale. | Backend Developer | 30 Hrs | Weeks 9–10 |
| 1.3.8 | Outfit Management (Saved Outfits) | Implement save, load, edit, and delete of named outfit combinations for Registered Users, with persistence across sessions. (SRS FR-5.4–5.8) | Outfit CRUD working across sessions for Registered Users. | Frontend Developer | 30 Hrs | Weeks 9–10 |
| 1.4.1 | Unit & Integration Testing | Write unit tests for Django models/serializers/views and integration tests for React \+ API flows. (SRS §4) | Test suite with coverage report meeting quality targets. | QA Lead | 40 Hrs | Week 10 |
| 1.4.2 | Validation Algorithm Testing | Test the Pillow \+ rembg pipeline with valid, invalid, and edge-case Seller uploads (dimensions, transparency, color mismatch) (SRS FR-4.7); and execute the recommendation-weights validation tests — deterministic unit/regression tests with fixed tag combinations and expected rankings, plus ±1 sensitivity checks — recording any weight tuning and its rationale (SRS FR-7.2). | Validation test suite with 100% pass rate on defined cases. | QA Lead | 25 Hrs | Week 10 |
| 1.4.3 | User Acceptance Testing | Conduct end-user walkthroughs (Guest, Registered, Seller) to validate features against the SRS. Administer UAT survey instruments and capture in-app ratings (per SRS FR-7.5) to measure pre/post confidence, return-intent, and style approval, providing the necessary evidence to pass Charter Objectives OBJ-01, OBJ-05, and OBJ-06. (SRS §4.4) | Signed UAT acceptance form and survey results meeting KPIs, including ≥ 80% fit/style confidence improvement, ≥ 80% recommendation approval, and ≥ 80% purchase-decision confidence improvement (Criteria 9–11) | QA Lead | 30 Hrs | Week 12 |
| 1.5.1 | Local Staging Setup & Deployment | Provision the MongoDB Atlas M0 cluster and configure database/network access; deploy the Django \+ React build to the local staging host (dedicated local staging server);enable TLS via a local CA (e.g., mkcert) for the staging demonstration URL; plain HTTP on 127.0.0.1 is permitted only for local development/testing per SRS §5.3; operate the weekly manual database export routine. (SRS §2.3, §4.2, §4.3) | Live local staging URL (localhost/LAN) with green health checks. | DevOps / Backend | 30 Hrs | Week 11 |
| 1.5.2 | Documentation & Seller Instruction Sheet | Write the Seller CSV template instructions, three-view photo guidelines, README, and user-facing documentation. (SRS FR-4.1) | Final documentation package delivered. | Technical Writer / PM | 15 Hrs | Week 12 |
| 1.5.3 | Final Panel Demonstration & Handover | Prepare and execute the live panel demo, including dry-runs, Q\&A rehearsal, and deliverable handover. | Successful defense and approved handover package. | All Team Members | 20 Hrs | Week 14 |

## **4\. Scope Baseline Change Management Plan**

* Any proposed addition, deletion, or modification to the baseline scope must be submitted via a formal Change Request Form and logged in the project risk/change register.  
* Scope changes impacting the semester timeline, budget, or architecture require approval from the Change Control Board (CCB) — composed of the Project Manager and the academic adviser/panel — before work begins.  
* Approved changes must be reflected by updating the SRS version number (e.g., v1.0 → v1.1) and this Scope Baseline, keeping both documents as the synchronized single source of truth.  
* Work performed outside the approved baseline without CCB approval is considered scope creep and will not be counted toward the MVP deliverable.


