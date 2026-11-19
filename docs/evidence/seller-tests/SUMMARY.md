# Seller Catalog (SEL) — Test Execution Summary

## Run overview

| Item | Value |
| --- | --- |
| Test suite | `frontend/e2e/seller-tests.spec.ts` |
| Command | `npx playwright test e2e/seller-tests.spec.ts --reporter=line --workers=1` |
| Base command | `npx playwright test e2e/seller-tests.spec.ts` |
| Execution date | 2026-11-19, 10:02–10:05 UTC |
| Frontend | `https://localhost:8443` (HTTPS via local CA) |
| API | `http://127.0.0.1:8000` |
| Result | **19 passed / 0 failed** |
| Execution mode | Serial CSV order, STOP ON FAILURE |
| Context strategy | Fresh `BrowserContext` per case; separate seller/shopper identities; real UI login where a page guard is exercised |
| Async handling | `waitForBatchCompletion()` polls `GET /catalog/batch-report/?batch_id=<id>` until terminal — no arbitrary `waitForTimeout` |
| Source CSV | `docs/Test Cases/FitFusionAI - Test Cases - SEL — Seller Catalog Management.csv` (19 cases) |
| Application code | **Unchanged** — only the test spec and evidence/CSV files were modified |

Each case has `docs/evidence/seller-tests/SEL-XXX/test-log.json` with the observed status, exact rejection strings, batch IDs, API status codes and timing, plus full-page screenshots at the key interaction points. No `failure.png` remains in any case directory.

## Results

| ID | Case | Result | Evidence |
| --- | --- | --- | --- |
| SEL-001 | Download CSV Template | PASS | [SEL-001](SEL-001/) |
| SEL-002 | Upload Catalog Items (Valid) | PASS | [SEL-002](SEL-002/) |
| SEL-003 | Upload Validation (Size) | PASS | [SEL-003](SEL-003/) |
| SEL-004 | Upload Validation (Dimensions) | PASS | [SEL-004](SEL-004/) |
| SEL-005 | Upload Validation (Required Fields) | PASS | [SEL-005](SEL-005/) |
| SEL-006 | Upload Validation (Color Mismatch) | PASS | [SEL-006](SEL-006/) |
| SEL-007 | Upload Validation (Filename Mapping) | PASS | [SEL-007](SEL-007/) |
| SEL-008 | Upload Validation (rembg Failure) | PASS | [SEL-008](SEL-008/) |
| SEL-009 | View Validation Report | PASS | [SEL-009](SEL-009/) |
| SEL-010 | Upload Batch Cap (11 items) | PASS | [SEL-010](SEL-010/) |
| SEL-011 | Edit Listing (Revalidation) | PASS | [SEL-011](SEL-011/) |
| SEL-012 | Delete Listing | PASS | [SEL-012](SEL-012/) |
| SEL-013 | Seller RBAC | PASS | [SEL-013](SEL-013/) |
| SEL-014 | Performance: Pipeline Speed | PASS | [SEL-014](SEL-014/) |
| SEL-015 | UAT: Upload Accuracy | PASS | [SEL-015](SEL-015/) |
| SEL-016 | Generated PNG Transparency | PASS | [SEL-016](SEL-016/) |
| SEL-017 | Derived Color-Palette Tags | PASS | [SEL-017](SEL-017/) |
| SEL-018 | Upload Validation (File Format) | PASS | [SEL-018](SEL-018/) |
| SEL-019 | Upload Validation (Style Vocabulary) | PASS | [SEL-019](SEL-019/) |

## Key observations

### Template and valid upload (SEL-001–SEL-002)

- **SEL-001** — The upload page's **Download Required Template** button produced `catalog_products.csv` (the backend `Content-Disposition` header overrides the anchor's `download` attribute). The file contains all 11 required columns including `style_tags`, `front_image_filename` and `rear_image_filename`, an instruction row (`HOW TO UPLOAD`), and no `occasion_tags`. `GET /catalog/download-template/` and `GET /catalog/download-package/` both returned 200; the ZIP contains `seller_image_guidelines.txt`.
- **SEL-002** — A real UI upload through `#catalog-csv`, `#front-product-image` and `#rear-product-image` returned HTTP 202 with a batch ID. The UI reached **"Catalog validated successfully"** and the batch report ended `completed` with 1 accepted / 0 rejected in ~200 ms. The listing appeared as `active` under the authenticated seller's store name and both stored images were rembg-processed media URLs.

### Validation and rejection (SEL-003–SEL-008)

- **SEL-003** — A deterministic 13,378,492-byte PNG was refused synchronously: `Image "front.png" exceeds the 5 MB maximum file size limit.` (HTTP 400).
- **SEL-004** — A 700×700 image produced `Front: Image too small (700x700). Minimum is 800x800.` in the batch report.
- **SEL-005** — Removing `price` from the CSV header produced `Row 2: Missing required field 'price'`.
- **SEL-006** — Declaring `Red` against the white-dominant garment produced `Color mismatch: declared 'Red' but the image's dominant color is #dcdcdc. Correct color to declare: "White" (color family: neutral).`
- **SEL-007** — A CSV filename with no matching upload produced `Front: 'does-not-exist.png' not found among uploaded images`.
- **SEL-008** — A plain rectangle image that rembg cannot segment produced `Front/Rear processing failed: Background removal failed: Background removal did not produce a valid transparent image.` The item stayed `rejected` — no partial publish.
- All rejections were read from the live `/catalog/batch-report/` endpoint after polling to a terminal status.

### Reporting, editing, deletion and RBAC (SEL-009–SEL-013)

- **SEL-009** — A mixed batch (1 valid white item, 1 red/white mismatch) ended 1 accepted / 1 rejected. The **View Full Validation Report** action opened `/seller/report`; the Accepted and Rejected panels rendered the item names and the exact color-mismatch reason text.
- **SEL-010** — An 11-row upload was refused before processing: `Upload exceeds maximum of 10 items.` (HTTP 400).
- **SEL-011** — Editing name, price and color through `/seller/listings/:id/edit` and clicking **Save and Re-submit** showed "Changes saved successfully"; the listing returned to `active` with the new name and price after revalidation.
- **SEL-012** — The delete modal showed "Delete Product?" and, on confirm, the listing returned HTTP 404 publicly and disappeared. A shopper cart line that referenced it retained its `name` snapshot and became `available: false` (detached); order history stayed readable. **Spec gap:** the documented "warn if in active carts" behaviour is not implemented in the current UI or API — only the generic confirmation exists. This was recorded in the case log/note rather than being silently marked as verified.
- **SEL-013** — A shopper hitting `/seller/catalog-upload` was bounced by the role guard to `/shopper/dashboard` with no seller page mounted. Direct API calls returned 403 for upload, batch report and my-listings; an anonymous upload returned 401.

### Performance, image quality and vocabulary (SEL-014–SEL-019)

- **SEL-014** — A full 10-item batch with 10 matched front/rear pairs completed in **5,233 ms** (8 polls, 10 accepted / 0 rejected), well inside the 60-second target.
- **SEL-015** — The unassisted 10-item upload produced a **100% first-try acceptance rate** (10/10). The population-level human UAT KPI (≥80% across participants) cannot be automated and is explicitly deferred in the log note.
- **SEL-016** — Both stored front and rear PNGs were downloaded from `/media/...` and verified with Pillow as **RGBA** with alpha extrema `(0, 255)` — genuine transparent mattes with opaque garment regions.
- **SEL-017** — The derived palette tags for `color_family=white` were exactly `['neutral', 'clean', 'fresh', 'versatile', 'light']`, and `compatible_color_palette_tags` was absent from the submitted CSV.
- **SEL-018** — Selecting `catalog.xlsx` produced `Please upload a valid CSV file.` and no batch/listing was created. Note: the client-side extension guard is the enforced rejection surface; the backend `CSVUploadSerializer` validates the same rule but is not invoked by the live upload view.
- **SEL-019** — `style_tags=streetwear` produced `Row 2: Invalid style_tags value(s): streetwear. Choose from: casual, formal, smart, sporty.`

## Fixture strategy

The suite generates its own fixtures so it is deterministic and never depends on pre-seeded media:

- A valid 900×900 white-background garment PNG is derived at runtime from the repository's `Female_Standard_front.png` avatar via Pillow in the backend virtualenv. This image reliably passes the live rembg pipeline and matches a `White`/`white` CSV declaration.
- Invalid PNGs (oversized ~13 MB noise, 700×700, and a plain rectangle that rembg rejects) are built in pure Node with `zlib`, so no binary blobs are committed.
- Each seller (and the shopper used for RBAC) is registered through `/auth/register/` with a random email, mobile and store name, so cases cannot interfere with one another or with seeded data.

## Known spec/code gaps (not test failures)

| Case | Gap | Handling |
| --- | --- | --- |
| SEL-012 | "Warn if product is in active carts" is documented but not implemented; the delete endpoint returns 204 with no warning payload. | Core delete, cart detachment and snapshot retention verified; gap recorded in `test-log.json` note. |
| SEL-015 | Population-level UAT accuracy KPI requires human participants. | One unassisted 10-item batch measured at 100%; KPI formally deferred in note. |
| SEL-018 | Backend `CSVUploadSerializer.validate_csv_file` exists but is not called by the live upload view. | Client-side rejection verified and the backend gap recorded in note. |
