**Why this is not Done**
- Ticket: KAN-120 (CODE) — KAN-47 Price filter + catalog filter re-alignment to FR-3.3 v1.1
- Current Jira status: To Do
- Blocking reason: No price filter parameter or price-filter test exists. The catalog still exposes color/style filters, and Swagger has no price query parameter.
- Missing: A price filter (min/max or sort), retention of the store parameter for the Store page, deprecation or remapping of color/style, Swagger update, integration tests, and proof the Store page listing is unchanged.
- Evidence checked: Case-insensitive repo search found no `min_price`, `max_price`, `price_min`, `price_max`, `price_sort`, or equivalent price filter. `backend/catalog/views/core.py` list action filters only `category`, `color`, `size`, `store`, and `style`. `docs/evidence/_runs/20261117T095224Z-catalog.meta.json` has no price-filter test (only `test_public_catalog_store_filter_returns_only_active_seller_items` and `test_public_catalog_style_filter_matches_json_array_tags`). `docs/evidence/KAN-41/api-schema.yml` has price fields in responses but no price query parameter.
- To close this ticket: Implement the FR-3.3 v1.1 price filter, deprecate/remap color and style, update Swagger, add passing integration tests, and verify the Store page listing is unchanged.
- Owner: CARLOS JEFFERSON S. YAP
