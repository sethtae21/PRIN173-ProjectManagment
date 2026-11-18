# FitFusion AI — Handover Package (KAN-100 / KAN-97)

Assembled: 2026-11-18 (UTC)
Repository: `PRIN173-ProjectManagment` (git)
Handover source snapshot: branch `main`, commit `f67de61` ("phase 3: KAN-115 evidence")
The commit that adds this package is the handover tip; run `git rev-parse HEAD` in the
repository to confirm the exact delivered revision. 561 tracked files at assembly time.

This package collects every deliverable named in KAN-97/KAN-100: source repository,
documentation set, database schema, demo assets, staging URL and TLS notes, plus the
verification commands and their latest recorded results.

## 1. Source repository

| Area | Location | Notes |
|---|---|---|
| Django REST backend | `backend/` | `manage.py`, `fitfusion/` settings, apps: accounts, catalog, commerce, outfits, recommendations, ratings; `backend/requirements.txt` |
| React frontend | `frontend/` | Vite + React 19; `frontend/package.json`, `frontend/src/`, Playwright specs in `frontend/e2e/` |
| Utility scripts | `backend/scripts/` | `local_staging_server.mjs`, `backup_atlas.ps1`, `verify_backup_restore.ps1`, `export_mongodb.py` |
| Evidence set | `docs/evidence/` | `EVIDENCE_INDEX.md` maps every ticket to artifacts and status |
| Root docs | `README.md` | Backend/frontend setup commands |

Runtime requirements: Python 3.13 virtualenv (`backend/.venv`), Node.js with npm,
MongoDB (Atlas `MONGODB_URI`, or local `mongodb://localhost:27017/fitfusion`),
mkcert for local HTTPS. Full pins are in `backend/requirements.txt` and
`frontend/package.json`.

## 2. Documentation set

| Document | Path |
|---|---|
| Software Requirements Specification | `docs/Papers/SRS (5).md` |
| Software Architecture / Design Document | `docs/Papers/SADD (2).md` |
| Project scope and deliverables | `docs/Papers/Scope (3).md` |
| Project charter | `docs/Papers/Charter (4).md` |
| Software testing plan | `docs/Papers/Software testing plan.md` |
| System architecture diagram | `docs/System Architecture/FitFusion-SystemArchitecture.drawio.png` |
| Backend setup, HTTPS staging, Atlas backup | `backend/README.md` |
| Root setup | `README.md` |
| Evidence index (ticket → artifact/status) | `docs/evidence/EVIDENCE_INDEX.md` |
| Sprint/UAT/audit records | `docs/sprint-notes/`, `docs/evidence/audit-2026-11-18/` |

## 3. Database schema

- Engine: MongoDB through `django-mongodb-backend` (`MONGODB_URI` in
  `backend/fitfusion/settings.py`; database `fitfusion`).
- ERD: `docs/ERD/FitFusion-ERD.png` (2,869,790 bytes).
- Physical model, collections, embedding/referencing decisions and indexes:
  `docs/Papers/SADD (2).md` (MongoDB collections and system specification).
- Live collection families: `accounts_user`, `accounts_avatarpreset`/`outfits_*`,
  `catalog_catalogitem`, `catalog_uploadbatch`, `commerce_cart`, `commerce_order`,
  `ratings_rating`, plus Django framework collections documented as excluded
  infrastructure in the SADD.
- API contract (OpenAPI 3, generated with drf-spectacular):
  `docs/evidence/KAN-41/api-schema.yml` (86,539 bytes; includes catalog
  `sort=price_asc|price_desc`, `min_price` and `max_price` query parameters).

## 4. Demo assets

| Asset | Path | Purpose |
|---|---|---|
| Sample catalog CSV | `backend/catalog/sample_data/catalog_products.csv` | Upload template example (one product row) |
| Staging seed script | `docs/evidence/KAN-100/staging_seed.py` | Registers a seller, uploads the CSV + generated front/rear PNGs, polls `/catalog/my-listings/` and prints `SEED_RESULT PASS/FAIL` |
| Staging E2E screenshots (11) | `docs/evidence/KAN-115/*.png` | Landing, guest catalog/product/presets, shopper dashboard/cart/account, seller dashboard, CSV validation, signup validation, invalid login |
| Guest UI screenshots | `docs/evidence/KAN-113/guest-screens.png` | Guest page set |
| Registered UI screenshot | `docs/evidence/KAN-114/registered-screens.png` | Registered user page set |
| Seller dashboard screenshot | `docs/evidence/KAN-66/seller-dashboard.png` | Seller view |

## 5. Staging URL and TLS notes

- Staging URL: `https://localhost:8443/` (loopback only; not publicly reachable).
- Backend API behind the proxy: `http://127.0.0.1:8000` (`/health/`, `/api/docs/`
  are proxied).
- TLS: mkcert leaf certificate trusted by the local user CA. Files live outside
  the repository at `%LOCALAPPDATA%\FitFusionAI\certs\localhost.pem` and
  `localhost-key.pem`; never commit the private key.
- Proxy: `backend/scripts/local_staging_server.mjs`; env vars `FITFUSION_TLS_CERT`,
  `FITFUSION_TLS_KEY`, `FITFUSION_BACKEND_URL`, `FITFUSION_HTTPS_PORT`,
  `FITFUSION_FRONTEND_DIST`.
- Full step-by-step (certificate generation, Waitress with `DEBUG=False`,
  `TRUST_PROXY_SSL_HEADER=True`, `DJANGO_ALLOWED_HOSTS`): `backend/README.md`
  → "Local HTTPS Staging".
- Certificates are machine-specific: on a new workstation regenerate them with
  mkcert and re-trust the local CA before starting the proxy.

## 6. Setup and run runbook

```powershell
# Backend
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
$env:MONGODB_URI = 'mongodb+srv://<user>:<password>@<cluster>/'   # or local MongoDB
python manage.py migrate
python manage.py runserver 127.0.0.1:8000

# Frontend
cd frontend
npm ci
npm run build          # produces frontend/dist served by the staging proxy
# or: npm run dev       # starts at 8443/8444... (auto-TLS if mkcert files exist)

# Staging proxy (after frontend build and backend start)
$env:FITFUSION_TLS_CERT = Join-Path $env:LOCALAPPDATA 'FitFusionAI\certs\localhost.pem'
$env:FITFUSION_TLS_KEY  = Join-Path $env:LOCALAPPDATA 'FitFusionAI\certs\localhost-key.pem'
node .\backend\scripts\local_staging_server.mjs
```

Demo data: run `backend\.venv\Scripts\python.exe docs\evidence\KAN-100\staging_seed.py`
with the backend running; it prints the generated seller email/store and ends with
`SEED_RESULT PASS`. Re-running creates a new seller and listing each time.

## 7. Verification commands and latest recorded results

| Check | Command | Latest result | Artifact |
|---|---|---|---|
| Backend suites + coverage (6 apps) | `coverage run --source=accounts,catalog,commerce,outfits,recommendations,ratings manage.py test accounts catalog commerce outfits recommendations ratings` | 267 tests, exit 0; overall 84%; core files 82–100% | `docs/evidence/KAN-82/20261118T135032Z-six-suites-coverage-final.log`, `docs/evidence/KAN-82/COVERAGE_SUMMARY.md`, `coverage.xml` |
| Playwright evidence screens | `npx playwright test e2e/evidence-screens.spec.ts` | 5 passed, exit 0 | `docs/evidence/KAN-82/20261118T140756Z-playwright-evidence-screens.log` |
| Staging end-to-end + client validation | `npx playwright test e2e/staging-phase-a.spec.ts` | 8 passed, exit 0 | `docs/evidence/KAN-115/20261118T142852Z-staging-phase-a.log` |
| Frontend production build | `npm run build` | exit 0 | `docs/evidence/KAN-115/20261118T142743Z-frontend-build.log` |
| Seeded staging data | `python docs/evidence/KAN-100/staging_seed.py` | `SEED_RESULT PASS`, public active listing count 1 | `docs/evidence/KAN-115/20261118T142358Z-seed-staging.log` |
| Atlas backup / restore | `.\scripts\backup_atlas.ps1`, `verify_backup_restore.ps1` | Procedure documented; run per `backend/README.md` | — |

## 8. Package checksums (SHA-256)

```
57D7CA01C09D9140CD7076003830555F6A4085F71BA63B7EA822B64FE00878AB  docs/evidence/KAN-100/staging_seed.py
B5C21EC8B26D82241FA03FAA7A3C5291CEE81404A7B7B3DE45F6C5E62D6364A6  docs/evidence/KAN-41/api-schema.yml
CD0644858E6E1C75BE79AD49D3C08BF3AF9C905FF2B936CC8655DFFFC6B37A98  docs/ERD/FitFusion-ERD.png
```

## 9. Known limitations and open items

- The KAN-87 live UAT walkthrough is still outstanding; staging evidence here is
  automated end-to-end verification, not a recorded UAT sign-off.
- Staging is loopback HTTPS only. There is no public deployment or hosted URL.
- TLS certificates and `.env` are per-machine and deliberately not in the repository.
- Demo data depends on the MongoDB instance configured through `MONGODB_URI`; the
  seed script must be run against a fresh environment before a demo.
- Account archival/retention tooling and the 30-day cold-archive job are covered by
  separate tickets/evidence, not by this package.

## 10. Handover checklist (KAN-97/KAN-100 deliverables)

- [x] Source repository reference and revision
- [x] Documentation set (SRS, SADD, scope, charter, testing plan, diagrams, READMEs)
- [x] Database schema (ERD, SADD collection design, OpenAPI contract)
- [x] Demo assets (sample CSV, staging seed script, screenshots)
- [x] Staging URL and TLS notes (`https://localhost:8443/`, mkcert paths, proxy env vars)
- [x] Verification commands with latest recorded results
- [x] Known limitations
