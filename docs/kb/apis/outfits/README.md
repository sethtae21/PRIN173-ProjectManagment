---
id: docs-kb-api-outfits-index
title: Outfits API Routes
category: index
status: draft
source_of_truth: [backend/outfits/urls.py]
related: [docs-kb-apis-index]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

# Outfits API Routes

Sibling methods for each route will be adjacent.

| Method | Route | API item | Summary | Source (code link) | Tests (link) | Status |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/outfits/` | [List outfits](get-outfits.md) | List the caller's saved outfits | [outfits/urls.py](../../../../backend/outfits/urls.py#L6) | [outfits tests](../../../../backend/outfits/tests.py#L69) | verified |
| POST | `/outfits/` | [Create outfit](post-outfits.md) | Create an outfit and bind it to the caller | [outfits/urls.py](../../../../backend/outfits/urls.py#L6) | [outfits tests](../../../../backend/outfits/tests.py#L50) | verified |
| GET | `/outfits/{pk}/` | [Read outfit](get-outfits-id.md) | Read one caller-owned outfit | [outfits/urls.py](../../../../backend/outfits/urls.py#L6) | [outfits tests](../../../../backend/outfits/tests.py#L69) | verified |
| PUT | `/outfits/{pk}/` | [Replace outfit](put-outfits-id.md) | Replace outfit fields; successful PUT test not located | [outfits/urls.py](../../../../backend/outfits/urls.py#L6) | none found | draft |
| PATCH | `/outfits/{pk}/` | [Partially update outfit](patch-outfits-id.md) | Partially update outfit fields and item IDs | [outfits/urls.py](../../../../backend/outfits/urls.py#L6) | [outfits tests](../../../../backend/outfits/tests.py#L85) | verified |
| DELETE | `/outfits/{pk}/` | [Delete outfit](delete-outfits-id.md) | Delete a caller-owned outfit | [outfits/urls.py](../../../../backend/outfits/urls.py#L6) | [outfits tests](../../../../backend/outfits/tests.py#L130) | verified |

## Back to index

- [API catalog](../README.md)
- [Knowledge-base home](../../README.md)
