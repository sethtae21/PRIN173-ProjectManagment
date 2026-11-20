# Post-fix regression gates — 2026-11-20

Run after the authorized fixes for DEF-UT-14, DEF-UT-15 and DEF-TE-01.
Gates executed in the approved order; STOP ON FAILURE was retained (no
retries after a genuine failure). The two failed SEL rehearsals documented
below were caused by a staging-only matte-cache/model mismatch, not by an
application defect; the cache entry was removed and the suite re-run.

## Environment

- Lean staging proxy: `backend/scripts/local_staging_server.mjs` on
  `https://localhost:8443`, serving a fresh `frontend/dist` build and
  forwarding API routes to Django/Waitress on `http://127.0.0.1:8000`.
- Waitress launched with `DEBUG=True`, `DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1`,
  `MONGODB_URI=mongodb://127.0.0.1:27018/fitfusion` (real local MongoDB 7.0.14),
  `TRUST_PROXY_SSL_HEADER=True`, and the repository `.env` `REMBG_MODEL`
  (`u2net_cloth_seg`). No Atlas connection was used.
- All commands run from `C:\Users\seth\Documents\PRIN173-ProjectManagment\frontend`.

## Gate 2 — SEL suite (upload view changed)

```
npx playwright test e2e/seller-tests.spec.ts --reporter=line --workers=1
```

**Result: 19 passed / 0 failed (57.9 s).**
Full console output: [SEL-19-pass.log](SEL-19-pass.log).

Note: SEL-018 (non-CSV file rejected with no batch created) passed against the
changed `POST /catalog/upload/` guard, confirming the DEF-UT-15 fix did not
alter the valid-CSV multipart path.

## Gate 3 — AV suite (preset serializer changed)

```
npx playwright test e2e/avatar-tests.spec.ts --reporter=line --workers=1
```

**Result: 11 passed / 0 failed (39.5 s).** Full console output:
[AV-11-pass.log](AV-11-pass.log).

Note: AV-010 (boundary validation exact limits) and AV-002 (height out of
range) passed with the 120–220 cm ceiling, confirming the DEF-UT-14 fix.

## Staging-only rehearsal failures (not regressions)

Two earlier SEL rehearsals failed at SEL-008 with
`Color mismatch: declared 'White' but the image's dominant color is #1f50d9`
instead of the expected rembg message. Cause: the first rehearsal set
`REMBG_MODEL=u2netp`; the matte cache key
(`MATTE_PIPELINE_VERSION` + original bytes) does not include the model name,
so the second rehearsal reused that model's cached matte. The stale cache file
was deleted, the server restarted with the `.env` model, and the suite passed
19/19. No application or test file was changed for these rehearsals.
