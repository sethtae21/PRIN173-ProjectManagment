---
id: docs-kb-scripts-diagnostics-index
title: Diagnostic Script Catalog
category: index
status: draft
source_of_truth: []
related: [docs-kb-scripts-index, docs-kb-home]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

# Diagnostic Script Catalog

This bucket contains the two diagnostics in the P3 inventory. `verify_auth.py` is a root-level Django/`requests` smoke script that modifies fixture users, so it is an explicit exception to the black-box, standard-library-only diagnostics contract described in [`backend/diagnostics/README.md`](../../../../backend/diagnostics/README.md#L1). Run it only against a disposable development/test database.

| Script | Summary | Source (code link) | Tests (link) | Status |
| --- | --- | --- | --- | --- |
| [Session identity diagnostic](verify-session-identity.md) | Checks per-token identity, profile, role-based listing access, and refresh identity over HTTP. | [`backend/diagnostics/verifiy_session_identity.py`](../../../../backend/diagnostics/verifiy_session_identity.py#L146) | none found | verified |
| [Authentication smoke verification](verify-auth.md) | Exercises register/login/RBAC/delete with Django model access and fixture mutations. | [`backend/verify_auth.py`](../../../../backend/verify_auth.py#L1) | none found | verified |

## Back to index

- [Runnable Script Catalog](../README.md)
- [Knowledge-base home](../../README.md)
