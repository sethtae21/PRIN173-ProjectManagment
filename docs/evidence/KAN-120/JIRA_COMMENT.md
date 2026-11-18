# KAN-120 — Price filter and catalog filter re-alignment (FR-3.3 v1.1)

Implemented server-side price filtering on `GET /catalog/`:

- `sort=price_asc|price_desc` orders active listings by price.
- `min_price` / `max_price` accept positive decimals and filter inclusively.
- Unknown sort values, negative/non-numeric prices, and `min_price > max_price`
  return HTTP 400.
- Existing category, size, color, style, and store filters are unchanged and
  compose with the new parameters.

Swagger (`docs/evidence/KAN-41/api-schema.yml`) regenerated; the three
parameters appear in the schema.

Frontend `CatalogPage.jsx` now requests `sort=price_asc|price_desc` from the
API instead of sorting the array client-side; `npm run build` passes.

Tests: `catalog.tests.CatalogValidationAndCRUDTests` price sort, range,
sort+size composition, store stability, and invalid-parameter cases — 59
catalog tests pass. Artifacts: `docs/evidence/_runs/20261118T130819Z-catalog-kan120.log`
and `docs/evidence/_runs/20261118T130819Z-catalog-kan120.meta.json`.
