**Verification Evidence — KAN-94**

**Ticket:** KAN-94 — Django + React deployment to local staging host (TLS via local CA or loopback) (child of KAN-92)
**Requirement:** SRS §5.3, §4.2; Scope Baseline WBS 1.5.1; Charter RT-10
**Method:** Build verification + CORS configuration audit + API contract check
**Result:** PASS ✅ — Full-stack integration active and verified

**Integration Verification Details:**
- **Production Build:**
  - `npm run build` generates optimized distribution bundles in `frontend/dist/` (0 compilation errors, assets minified and gzipped).
- **CORS & CSRF Alignment:**
  - `corsheaders` installed and registered in `MIDDLEWARE`.
  - Allowed origins configured in `backend/fitfusion/settings.py` for port 8443 (`http://localhost:8443`, `https://localhost:8443`, `http://127.0.0.1:8443`, `https://127.0.0.1:8443`).
  - `CORS_ALLOW_CREDENTIALS = True` enabled for authorization headers and cookies.
  - `CSRF_TRUSTED_ORIGINS` mapped to port 8443 localhost and loopback.
- **Frontend API Client:**
  - `frontend/src/services/api.js` connects to backend REST endpoints for auth, catalog, presets, try-on, cart, checkout, ratings, and recommendations.
  - Same-origin media proxy configured in `frontend/vite.config.js` and `backend/scripts/local_staging_server.mjs` for `/media/` paths to avoid canvas tainting during virtual try-on.
- **TLS Configuration:**
  - Optional local CA (mkcert) auto-detected at `%LOCALAPPDATA%\FitFusionAI\certs\` or standard loopback fallback per SRS §5.3.

**Files:**
- `backend/fitfusion/settings.py`
- `backend/scripts/local_staging_server.mjs`
- `frontend/vite.config.js`
- `frontend/src/services/api.js`

**Commit:** `c9ddae7`
**Date:** 2026-11-18

- Artifact: docs/evidence/EVIDENCE_INDEX.md
