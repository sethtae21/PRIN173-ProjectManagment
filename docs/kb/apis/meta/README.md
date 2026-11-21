---
id: docs-kb-api-meta-index
title: Schema and API Documentation Routes
category: index
status: draft
source_of_truth: [backend/fitfusion/urls.py]
related: [docs-kb-apis-index]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

# Schema and API Documentation Routes

The OpenAPI schema and Swagger UI are grouped here because they are mounted directly by the project URL configuration rather than an application URL module.

| Method | Route | API item | Summary | Source (code link) | Tests (link) | Status |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/schema/` | [OpenAPI schema](get-api-schema.md) | Serve the generated OpenAPI schema | [fitfusion/urls.py](../../../../backend/fitfusion/urls.py#L21) | none found | verified |
| GET | `/api/docs/` | [Swagger UI](get-api-docs.md) | Render Swagger UI for the schema route | [fitfusion/urls.py](../../../../backend/fitfusion/urls.py#L22) | none found | verified |

## Back to index

- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
