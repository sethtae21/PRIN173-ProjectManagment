# FitFusion AI Evidence Plan

Source: `Jira (5).html` export. Scope: every non-epic issue whose exported status is
Done or In Progress. Ticket status is taken from the export; evidence results are
assigned only after actual capture. Unstated traceability is explicitly identified
below rather than inferred.

| Issue | Title | Status | Class | Planned command/artifact | Traceability (FR/WBS/RTM/Criterion) |
|---|---|---|---|---|---|
| KAN-42 | 1.2.3 UI/UX Wireframes & Prototypes | Done | ARTIFACT | Existing `docs/Use Cases/` PDFs; Figma reference, if present; checklist for unavailable visual proof | Jira description; explicit FR/WBS/RTM/Criterion not present in the exported list row |
| KAN-41 | 1.2.2 REST API Architecture & Specification | Done | EXPORT | `python manage.py spectacular --file docs/evidence/KAN-41/api-schema.yml` | WBS 1.2.2 from Jira title; FR/RTM/Criterion not stated in exported row |
| KAN-40 | 1.2.1 Database Schema Design | Done | EXPORT | `python manage.py showmigrations`; existing `docs/ERD/*` | WBS 1.2.1 from Jira title; FR/RTM/Criterion not stated in exported row |
| KAN-118 | 1.3.6 Mock E-Commerce Module (backend) | Done | TESTRUN | `python manage.py test commerce -v 2` | SRS FR-6.1-FR-6.9; remaining WBS/RTM/Criterion not stated in exported row |
| KAN-116 | Phase B - Dynamic 2D avatar system | In Progress | MANUAL | Frontend build/lint; visual checklist for Front/Rear customization and alignment | SRS FR-2.3, FR-2.4, FR-2.7; Done-when in Jira description |
| KAN-114 | Phase A - Registered User UI pages | Done | MANUAL | Frontend build/lint; registered-user screen checklist | Done-when in Jira description; FR/WBS/RTM/Criterion not explicitly captured in list row |
| KAN-113 | Phase A - Guest UI pages | Done | MANUAL | Frontend build/lint; guest-screen and responsive checklist | Jira description: responsive 320px-4K and WCAG AA spot-check; remaining traceability not stated |
| KAN-105 | Per-seller Store page UI + catalog browser filters | In Progress | MANUAL | Frontend build/lint; store/filter checklist | SRS FR-3.3; WBS 1.3.3; RT-03; Done-when in Jira description |
| KAN-104 | Shopper catalog read API with store filter | Done | TESTRUN | `python manage.py test catalog -v 2` | SRS FR-3.3; WBS 1.3.3; RT-03 |
| KAN-49 | 1.3.5 Rule-Based Recommendation Engine | Done | TESTRUN | `python manage.py test ratings -v 2` (starter mapping) | WBS 1.3.5 from Jira title; FR/RTM/Criterion not explicit in exported list row |
| KAN-48 | 1.3.4 Virtual Try-On Overlay Canvas | In Progress | TESTRUN | `python manage.py test outfits -v 2`; visual checklist | SRS FR-5.1, FR-5.2, FR-5.8; WBS 1.3.4 |
| KAN-47 | 1.3.3 Seller Catalog Management | Done | TESTRUN | `python manage.py test catalog -v 2` | WBS 1.3.3 from Jira title; FR/RTM/Criterion not explicit in exported list row |
| KAN-46 | 1.3.2 Avatar Creation & Management Module | Done | TESTRUN | `python manage.py test outfits -v 2` | WBS 1.3.2 from Jira title; FR/RTM/Criterion not explicit in exported list row |
| KAN-45 | 1.3.1 Authentication & RBAC Module | Done | TESTRUN | `python manage.py test accounts -v 2` | WBS 1.3.1 from Jira title; FR/RTM/Criterion not explicit in exported list row |
| KAN-117 | KAN-49 Harden recommendations input validation | Done | TESTRUN | `python manage.py test recommendations -v 2` | SRS FR-7.2/FR-7.3; Done-when in Jira description |
| KAN-103 | KAN-49 Weights basis and regression/sensitivity tests | Done | TESTRUN | `python manage.py test recommendations -v 2`; attach `docs/WEIGHTS_BASIS.md`, `docs/WEIGHTS_VALIDATION_REPORT.md`, `docs/TUNING_LOG.md` | SRS FR-7.2; WBS 1.3.5 and 1.4.2; Jira Done-when |
| KAN-102 | KAN-49 Rating controls UI | In Progress | MANUAL | Frontend build/lint; rating-control checklist | Jira description: FR-7.3; Jira title: FR-7.5; other traceability not explicit |
| KAN-101 | KAN-49 In-app rating endpoints and persistence | Done | TESTRUN | `python manage.py test ratings -v 2` | Jira title: FR-7.5; WBS/RTM/Criterion not explicit in exported row |
| KAN-50 | KAN-49 Knowledge table and scoring service | Done | TESTRUN | `python manage.py test recommendations -v 2` | Jira parent/title; FR/WBS/RTM/Criterion not explicit in exported row |
| KAN-51 | KAN-49 Recommendation panel UI with match reasons | In Progress | MANUAL | Frontend build/lint; recommendation panel checklist | SRS FR-7.3; WBS 1.3.5; RT-06 |
| KAN-106 | KAN-45 Landing page and shopper navigation shell | Done | MANUAL | Frontend build/lint; landing-page checklist | Jira description refers to SRS section 5.1 and FR-1.1/FR-1.6/FR-1.8; WBS/RTM/Criterion not captured |
| KAN-56 | KAN-45 Account view/update/delete | Done | TESTRUN | `python manage.py test accounts -v 2` | Jira parent/title; FR/WBS/RTM/Criterion not explicit in exported row |
| KAN-52 | KAN-45 Registration, login, JWT, role assignment | Done | TESTRUN | `python manage.py test accounts -v 2` | Jira parent/title; FR/WBS/RTM/Criterion not explicit in exported row |
| KAN-53 | KAN-45 Password policy and server-side RBAC | Done | TESTRUN | `python manage.py test accounts -v 2` | Jira parent/title; FR/WBS/RTM/Criterion not explicit in exported row |
| KAN-54 | KAN-45 Guest access and ephemerality | Done | TESTRUN | `python manage.py test accounts -v 2` | Jira parent/title; FR/WBS/RTM/Criterion not explicit in exported row |
| KAN-59 | KAN-46 Preset list/edit/delete UI | In Progress | MANUAL | Frontend build/lint; preset UI checklist | SRS FR-2.5/FR-2.8; WBS 1.3.2 |
| KAN-58 | KAN-46 Preset CRUD endpoints | Done | TESTRUN | `python manage.py test accounts -v 2` (starter mapping) | Jira parent/title; FR/WBS/RTM/Criterion not explicit in exported row |
| KAN-57 | KAN-46 Avatar creator UI | Done | MANUAL | Frontend build/lint; avatar-creator screenshot checklist | SRS FR-2.1-FR-2.7 per Jira description |
| KAN-66 | KAN-47 Seller Dashboard frontend | Done | MANUAL | Frontend build/lint; dashboard screenshot checklist | Jira parent/title; FR/WBS/RTM/Criterion not explicit in exported row |
| KAN-65 | KAN-47 GridFS storage and temp-file cleanup | Done | TESTRUN | `python manage.py test catalog -v 2` | Jira parent/title; FR/WBS/RTM/Criterion not explicit in exported row |
| KAN-64 | KAN-47 Validation rules and batch report | Done | TESTRUN | `python manage.py test catalog -v 2` | SRS FR-4.7/FR-4.8 |
| KAN-63 | KAN-47 Upload endpoint and background processing | Done | TESTRUN | `python manage.py test catalog -v 2` | Jira parent/title; FR/WBS/RTM/Criterion not explicit in exported row |
| KAN-62 | KAN-47 CSV template and instruction ZIP | Done | ARTIFACT | Existing CSV template/instruction ZIP, if present in repository | Jira parent/title; FR/WBS/RTM/Criterion not explicit in exported row |
| KAN-60 | KAN-47 Environment standardization | Done | ARTIFACT | Existing backend settings, `requirements.txt`, and TLS configuration; history proof | Jira parent/title; FR/WBS/RTM/Criterion not explicit in exported row |
| KAN-69 | KAN-48 Outfit save/load/edit/delete | In Progress | TESTRUN | `python manage.py test outfits -v 2` | SRS FR-5.4; WBS 1.3.8; RT-05 |
| KAN-68 | KAN-48 Item switching and view toggling | In Progress | MANUAL | Frontend build/lint; try-on interaction checklist | Jira parent/title; FR/WBS/RTM/Criterion not explicit in exported row |
| KAN-67 | KAN-48 Overlay canvas engine | In Progress | MANUAL | Frontend build/lint; canvas interaction checklist | Jira parent/title; FR/WBS/RTM/Criterion not explicit in exported row |
| KAN-77 | 1.1.2 Sprint Planning & Reviews | In Progress | MANUAL | Jira board/sprint evidence checklist; no session data invented | WBS 1.1.2 |
| KAN-71 | 1.1.1 Scope Management & Baseline | Done | ARTIFACT | Existing scope baseline and project-management documents | Jira description; remaining traceability not explicit in exported row |
| KAN-72 | KAN-71 Project Idea Document | Done | ARTIFACT | Existing scope/project-idea document, if present | Jira parent/title; FR/WBS/RTM/Criterion not explicit in exported row |
| KAN-73 | KAN-71 SRS v1.0 | Done | ARTIFACT | `docs/sprint-notes/SRS (5).md` | Jira parent/title; FR/WBS/RTM/Criterion not explicit in exported row |
| KAN-74 | KAN-71 Scope Baseline v1.0 | Done | ARTIFACT | `docs/sprint-notes/Scope (3).md` | Jira parent/title; FR/WBS/RTM/Criterion not explicit in exported row |
| KAN-75 | KAN-71 Team Working Agreement sign-off | Done | ARTIFACT | Existing team charter/working-agreement artifact, if present | Jira parent/title; sign-off evidence/traceability to be verified |
| KAN-76 | KAN-71 Repository hygiene | Done | ARTIFACT | `.gitignore`, bounded requirements, `.env.example`; do not expose `.env` | Jira parent/title; FR/WBS/RTM/Criterion not explicit in exported row |
| KAN-78 | KAN-77 Jira board configuration | Done | MANUAL | Jira board configuration screenshot/checklist | Jira parent/title; FR/WBS/RTM/Criterion not explicit in exported row |
| KAN-79 | KAN-77 Weekly sprint reports | Done | ARTIFACT | Existing sprint-report documents, if present | Jira parent/title; FR/WBS/RTM/Criterion not explicit in exported row |
| KAN-80 | KAN-77 Bi-weekly adviser review sessions | In Progress | MANUAL | Adviser-session checklist/template; no session data invented | Jira parent/title; FR/WBS/RTM/Criterion not explicit in exported row |
| KAN-87 | 1.4.3 User Acceptance Testing | In Progress | MANUAL | Per-role walkthrough checklists and timing-sheet templates; no invented session data | SRS FR-7.5; remaining traceability not explicit in exported row |
| KAN-83 | 1.4.2 Validation Algorithm Testing | In Progress | TESTRUN | `python manage.py test recommendations -v 2`; separate checklist for required adviser joint run | Jira description: FR-4.7 and WBS 1.4.2; KAN-103 report also states FR-7.2/WBS 1.4.2 |
| KAN-84 | KAN-83 10-item/60-second performance run | In Progress | COMMAND | `python manage.py measure_api_performance` and `python manage.py measure_upload` (upload run budget <=60 seconds) | Jira parent/title; FR/WBS/RTM/Criterion not explicit in exported row |
| KAN-86 | KAN-83 Palette-tag population verification | In Progress | TESTRUN | `python manage.py test catalog -v 2` | Jira parent/title; FR/WBS/RTM/Criterion not explicit in exported row |
| KAN-96 | 1.5.2 Documentation & Seller Instruction Sheet | In Progress | ARTIFACT | Existing README and seller-instruction sheet, if present | Jira description: FR-4.1; missing expected docs are recorded as blocked |
| KAN-92 | 1.5.1 Local Staging Setup & Deployment | In Progress | COMMAND | Start `node scripts/local_staging_server.mjs` if configured; capture HTTP/TLS probes | Jira description: FR 4.3; other traceability not explicit |
| KAN-94 | KAN-92 Django + React local staging deployment | In Progress | COMMAND | `curl.exe -sS http://127.0.0.1:8000/health/`; `curl.exe -k -v https://localhost:8443/health/`; negative TLS 1.1 probe | WBS 1.5.1; RT-10 |
| KAN-93 | KAN-92 Atlas M0 provisioning and network/TLS | In Progress | COMMAND | `python manage.py db_ping --json`; attach `docs/ATLAS_CONNECTIVITY.md` | Jira parent/title; Atlas/TLS traceability from existing connectivity runbook |
| KAN-111 | KAN-49 Restrict recommendations to ACTIVE catalog items | Done | TESTRUN | `python manage.py test recommendations -v 2` | SRS FR-7.2; Jira Done-when |
| KAN-121 | KAN-46 Size-compatibility guardrails on avatar controls | In Progress | MANUAL | Frontend build/lint; size-guardrail interaction checklist | SRS FR-2.3 |
| KAN-122 | KAN-43 Re-render/trim 2D asset set to Front/Rear | In Progress | MANUAL | Frontend build/lint; asset/view screenshot checklist | SRS FR-2.6/FR-2.7/FR-4.1; WBS 1.2.4; RT-02 |

Issues not listed above (including KAN-89, KAN-95, and KAN-115) were not present as
non-epic Done/In Progress rows in the supplied export and are outside this capture.
