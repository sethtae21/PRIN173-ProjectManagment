---
id: docs-kb-formulas-index
title: Formula and Algorithm Catalog
category: index
status: draft
source_of_truth: []
related: [docs-kb-backend-logic-index]
updated: 2026-11-21
source_sha: 3c77bc770466c5557254e2eba030415abd6f306f
source_branch: docs/kb-wip
---

# Formula and Algorithm Catalog

| Formula or algorithm | Summary | Source (code link) | Tests (link) | Status |
| --- | --- | --- | --- | --- |
| [Recommendation score weights](recommendation-score-weights.md) | FR-7.2 rule weights and tuning contract. | [`knowledge_table.py`](../../../../backend/recommendations/knowledge_table.py#L32) | [`tests_weights.py`](../../../../backend/recommendations/tests_weights.py#L292) | verified |
| [Recommendation item scoring](recommendation-item-scoring.md) | Fixed-order rule scores and explanations. | [`scoring.py`](../../../../backend/recommendations/scoring.py#L83) | [`tests_weights.py`](../../../../backend/recommendations/tests_weights.py#L220) | verified |
| [Recommendation item ranking](recommendation-item-ranking.md) | Score-descending order with name tie-break. | [`scoring.py`](../../../../backend/recommendations/scoring.py#L153) | [`tests_weights.py`](../../../../backend/recommendations/tests_weights.py#L208) | verified |
| [Active catalog validator](catalog-validator-active.md) | CSV, image, category, size, color, and orientation rules. | [`core.py`](../../../../backend/catalog/views/core.py#L172) | [`tests.py`](../../../../backend/catalog/tests.py#L431) | verified |
| [Compatibility catalog validator](catalog-validator-legacy.md) | Legacy validation and HSV tag-generation rules. | [`validators.py`](../../../../backend/catalog/validators.py#L20) | [`tests.py`](../../../../backend/catalog/tests.py#L1433) | verified |
| [Catalog palette tags](catalog-palette-tags.md) | Color-family tag mapping and fallback. | [`color_palette_config.py`](../../../../backend/catalog/color_palette_config.py#L7) | [`tests_ut_cases.py`](../../../../backend/catalog/tests_ut_cases.py#L42) | verified |
| [Reference size bands](recommendation-size-bands.md) | Body-build size mapping and average measurement. | [`knowledge_table.py`](../../../../backend/recommendations/knowledge_table.py#L117) | none found | verified |
| [Canvas silhouette selection](canvas-silhouette-selection.md) | Height-adjusted reference weight to silhouette letter. | [`canvasWarp2D.js`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L141) | none found | verified |
| [Canvas body bounds](canvas-body-bounds.md) | Alpha-threshold scan and bounds output. | [`canvasWarp2D.js`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L212) | none found | verified |
| [Canvas deformation lattice](canvas-make-lattice.md) | Body-profile inputs to source/destination mesh points. | [`canvasWarp2D.js`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L297) | none found | verified |
| [Canvas layer resampling](canvas-render-layer.md) | Inverse mapping and interpolation through the mesh. | [`canvasWarp2D.js`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L678) | none found | verified |
| [Canvas body tint](canvas-tint-body.md) | Undertone offsets with bounded luminance preservation. | [`canvasWarp2D.js`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L1029) | none found | verified |
| [Avatar and garment crop rules](avatar-crop-normalization.md) | Avatar sizing and the separate garment union-crop thresholds; source attribution needs review. | [`AvatarCanvas.jsx`](../../../../Frontend/src/pages/Shopper/AvatarCanvas.jsx#L79), [`canvasWarp2D.js`](../../../../Frontend/src/pages/Shopper/canvasWarp2D.js#L1184) | none found | draft |
| [Alpha crop hook](canvas-alpha-crop-hook.md) | Component selection, tightening, padding, and faint-alpha rescue. | [`useAlphaCrop.js`](../../../../Frontend/src/hooks/useAlphaCrop.js#L4) | none found | verified |
| [UAT KPI OBJ-01](uat-obj-01.md) | Paired fit/style confidence and fit-rating approval. | [`uat_kpis.py`](../../../../backend/ratings/uat_kpis.py#L209) | none found | verified |
| [UAT KPI OBJ-02](uat-obj-02.md) | Observed first guest try-on time and no-upload criterion. | [`uat_kpis.py`](../../../../backend/ratings/uat_kpis.py#L396) | none found | verified |
| [UAT KPI OBJ-03](uat-obj-03.md) | API, canvas-render, and page-load budgets. | [`uat_kpis.py`](../../../../backend/ratings/uat_kpis.py#L404) | none found | verified |
| [UAT KPI OBJ-04](uat-obj-04.md) | Security and privacy checklist acceptance. | [`uat_kpis.py`](../../../../backend/ratings/uat_kpis.py#L413) | none found | verified |
| [UAT KPI OBJ-05](uat-obj-05.md) | Recommendation-panel star approval percentage. | [`uat_kpis.py`](../../../../backend/ratings/uat_kpis.py#L250) | none found | verified |
| [UAT KPI OBJ-06](uat-obj-06.md) | Paired purchase-confidence and return-intent change. | [`uat_kpis.py`](../../../../backend/ratings/uat_kpis.py#L267) | none found | verified |
| [UAT KPI OBJ-07](uat-obj-07.md) | Server-recorded mock checkout completion ratio. | [`uat_kpis.py`](../../../../backend/ratings/uat_kpis.py#L290) | none found | verified |
| [UAT KPI OBJ-08](uat-obj-08.md) | Ten-item CSV pipeline timing budget. | [`uat_kpis.py`](../../../../backend/ratings/uat_kpis.py#L440) | none found | verified |
| [UAT KPI OBJ-09](uat-obj-09.md) | Manual audit of items published without correction. | [`uat_kpis.py`](../../../../backend/ratings/uat_kpis.py#L447) | none found | verified |

## Back to index

- [Backend logic catalog](../README.md)
- [Knowledge-base home](../../README.md)
