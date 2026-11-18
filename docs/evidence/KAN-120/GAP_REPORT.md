**Why this is not Done**
- Ticket: KAN-120 — KAN-47 Price filter + catalog filter re-alignment to FR-3.3 v1.1
- Current Jira status: In Progress
- Blocking reason: Price filter param not implemented/tested; no price-filter test in the catalog suite
- Missing: price filter (min/max or sort) on shopper catalog read API, Swagger update, integration test, Store page unchanged
- Evidence checked: backend/catalog/tests.py (no price-filter test); 20261117T095224Z-catalog.meta.json (no price test); backend/catalog/views/core.py
- To close this ticket: Implement price filter param, update Swagger, add integration test, confirm Store page listing unchanged
- Owner: CARLOS JEFFERSON S. YAP
