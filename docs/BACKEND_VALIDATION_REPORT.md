# Backend Validation Report

Date: 2026-09-30  
Scope: Backend implementation and focused validation against SRS v1.1, Project Charter v1.1, and Scope Baseline v1.1. React/UI integration and UAT are not included.

## Verified

| Area | Evidence | Jira follow-up |
|---|---|---|
| Backend package paths | Uppercase-only `Backend/` entries were moved to the lowercase `backend/` package. `manage.py check` passed after the move. | KAN-58, KAN-64, KAN-101, KAN-103, KAN-111 test files now resolve from Django. |
| Seller catalog validation | Required CSV fields, positive finite price, image format and minimum dimensions, filename mapping, transparent rembg output, and color-family alignment are checked. Rejection reasons are reported per item. | KAN-64 implementation corrected; KAN-85 cases added. |
| Seller listing management | Metadata PATCH accepts the editable catalog fields; image replacement is validated and background-processed. A rejected color/image change does not partially save metadata. GridFS blobs are deleted by ObjectId on replacement/deletion. | Backend portion of KAN-47. |
| Seller instructions | Public ZIP endpoint returns the CSV template and three-view image guidelines. The upload test uses the downloaded template, including its instruction rows. | KAN-62. |
| Palette derivation | Successful upload test verifies an active item receives derived compatible palette tags. | KAN-86. |
| Recommendation input validation | Query enums, height range, finite values, result limit, and tag length/count are validated; invalid requests return 400. Existing active-item filtering is retained. | KAN-111 implementation/test; KAN-117 implemented/tested. |
| Guest rating privacy | Guest ratings are cache-only, sessions use the cache backend and browser-close cookie behavior, and `POST /ratings/guest-session/clear/` removes indexed aggregates. | Backend portion of KAN-101; frontend must call the clear endpoint on session close. |
| Database health output | Atlas `db_ping --json` passed against the live `mongodb+srv` cluster with TLS implied. Connection URIs are now redacted from helper results and JSON output. | KAN-93 connectivity verified. |
| 10-item CSV timing | Real rembg run using `u2netp`: 10 accepted, 0 rejected, 35.84 seconds end-to-end. The run's batch and generated catalog rows were removed. | KAN-84 meets the <60-second criterion in this run. |
| Regression tests | Catalog: 15/15 passed. Recommender weights/endpoint/active-item suite: 14 passed, 1 optional literal-freeze test skipped. The complete Django command reported 74 discovered and 53 executed tests, all passing. Focused rating, GridFS deletion, and redaction tests also passed. | KAN-83 implementation tests pass locally; integration/UAT remain separate. |
| Django deployment settings | `manage.py check` passed with simulated `DEBUG=False`, non-secret placeholder key, Atlas `mongodb+srv`, explicit hosts, and staging origin. | Hardening for KAN-92/KAN-94 is implemented, but not a live staging deployment. |

## Still Open

- **KAN-83 / KAN-103:** The adviser joint run and linking/sign-off in the Jira validation report remain pending. The optional literal weight freeze is still skipped by design.
- **KAN-92 / KAN-94:** No live local staging host or demonstration TLS URL was available to verify. The configuration defaults now require an explicit secret and Atlas `mongodb+srv` outside DEBUG.
- **KAN-95:** Backup script and restore instructions are present, but MongoDB Database Tools (`mongodump`/`mongorestore`) are not installed here. No real archive or restore was produced.
- **Performance NFR:** The upload timing target passed. The 95th-percentile <500 ms API target has not been measured.
- **UAT:** Confidence, recommendation-approval, checkout-conversion, and user-flow criteria require participants and remain outside this backend run.
- **Guest close behavior:** The backend supports explicit cleanup and non-persistent sessions; the frontend still needs to invoke the clear endpoint when a guest session ends.

The Django runner's discovery count (74) differs from its executed count (53); all executed tests passed, but the difference should be investigated before treating the entire discovered suite as covered.