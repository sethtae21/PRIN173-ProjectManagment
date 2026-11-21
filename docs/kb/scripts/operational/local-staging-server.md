---
id: script-operational-local-staging-server
title: Local HTTPS Staging Server
category: script
status: verified
source_of_truth: [backend/scripts/local_staging_server.mjs]
related: [docs-kb-scripts-operational-index, docs-kb-scripts-index]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

## What It Runs

Starts a loopback-only HTTPS server that serves the built frontend as a single-page app and proxies configured API/media path prefixes to the backend over HTTP ([static serving, proxy routing, and listener](../../../../backend/scripts/local_staging_server.mjs#L39)).

## Prerequisites

- Node.js.
- A built frontend distribution directory.
- Local TLS certificate and private key, such as files generated for local development.
- A reachable backend endpoint ([startup checks](../../../../backend/scripts/local_staging_server.mjs#L1)).

## Command (PowerShell)

From the repository root:

```powershell
node .\backend\scripts\local_staging_server.mjs
```

## Inputs/Env Vars

- `FITFUSION_TLS_CERT` and `FITFUSION_TLS_KEY` are required.
- `FITFUSION_FRONTEND_DIST` overrides the default `frontend\dist`.
- `FITFUSION_BACKEND_URL` defaults to `http://127.0.0.1:8000`.
- `FITFUSION_HTTPS_PORT` defaults to `8443` ([configuration](../../../../backend/scripts/local_staging_server.mjs#L6)).

## Outputs & Reports

Listens on `127.0.0.1` and logs the local HTTPS URL when ready. Known API/media prefixes are proxied; other paths are served from the frontend build with `index.html` fallback ([request handling and listener](../../../../backend/scripts/local_staging_server.mjs#L39)).

## Exit Codes

No explicit exit code is set. Missing TLS settings/files or frontend build cause a thrown startup error; runtime proxy failures return `502` to the request, while the Node process continues ([startup checks and handlers](../../../../backend/scripts/local_staging_server.mjs#L6)).

## Source

- [`backend/scripts/local_staging_server.mjs` lines 1–117](../../../../backend/scripts/local_staging_server.mjs#L1): environment setup, `shouldProxy`, `proxyRequest`, `serveStatic`, and `createServer`.
- [`backend/diagnostics/README.md` lines 1–33](../../../../backend/diagnostics/README.md#L1): operational bucket description.

## Related

- No sibling script dependency is documented.

## Back to index

- [Operational Script Catalog](README.md)
- [Runnable Script Catalog](../README.md)
- [Knowledge-base home](../../README.md)
