**Verification Evidence — KAN-121**

**Ticket:** KAN-121 — Size-compatibility guardrails on avatar controls (child of KAN-46)
**Requirement:** SRS FR-2.3 v1.1; UC-01 v4; WBS 1.3.2
**Method:** Code review + build verification

---

**Result: DONE ✅**

**Feature Verification:**
- ✅ Size-compatibility guardrails in FittingStudioPage.jsx
- ✅ `SIZE_RANGE_TABLE` imported from `services/api.js`
- ✅ `sizeForBodyBuild()` function enforces size-compatible sub-ranges
- ✅ Height slider: 120–218 cm (global), restricted when garment equipped
- ✅ Body build validated within size-compatible bounds
- ✅ Descriptive messages when controls are restricted
- ✅ Frontend build passes: 0 compilation errors

**Key Implementation:**
- `services/api.js`: `SIZE_RANGE_TABLE`, `sizeForBodyBuild()` exports
- `FittingStudioPage.jsx`: Consumes size table for slider range restriction

**Commit:** `c9ddae7` | **Date:** 2026-11-18

- Artifact: docs/evidence/EVIDENCE_INDEX.md
