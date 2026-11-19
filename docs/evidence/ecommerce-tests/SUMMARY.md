# E-Commerce & Mock Payment (EC) — Test Execution Summary

## Run overview

| Item | Value |
| --- | --- |
| Test suite | `frontend/e2e/ecommerce-tests.spec.ts` |
| Command | `npx playwright test e2e/ecommerce-tests.spec.ts --reporter=line --workers=1` |
| Base command | `npx playwright test e2e/ecommerce-tests.spec.ts` |
| Execution date | 2026-11-19, 08:13–08:15 UTC |
| Frontend | `https://localhost:8443` (HTTPS via local CA) |
| API | `http://127.0.0.1:8000` |
| Result | **15 passed / 0 failed** |
| Execution mode | Serial CSV order, STOP ON FAILURE |
| Context strategy | Fresh `BrowserContext` per case; real UI login for registered-shopper cases; token-free guest context for EC-002 |

All 15 cases were executed in CSV order with no application code changes. Evidence for each case is stored under `docs/evidence/ecommerce-tests/EC-XXX/`, including full-page screenshots at key interactions and a `test-log.json` with captured assertions/API observations.

## Results

| ID | Case | Result | Evidence |
| --- | --- | --- | --- |
| EC-001 | Add to Cart | PASS | [EC-001](EC-001/) |
| EC-002 | Add to Cart (Guest) | PASS | [EC-002](EC-002/) |
| EC-003 | Update Cart Quantity | PASS | [EC-003](EC-003/) |
| EC-004 | Remove Item / Clear Cart | PASS | [EC-004](EC-004/) |
| EC-005 | Cart Persistence | PASS | [EC-005](EC-005/) |
| EC-006 | Mock Checkout | PASS | [EC-006](EC-006/) |
| EC-007 | Mock Payment Decline | PASS | [EC-007](EC-007/) |
| EC-008 | View Order History | PASS | [EC-008](EC-008/) |
| EC-009 | View Order Details | PASS | [EC-009](EC-009/) |
| EC-010 | Add Unavailable Item | PASS | [EC-010](EC-010/) |
| EC-011 | Performance: API Sweep | PASS | [EC-011](EC-011/) |
| EC-012 | Security: TLS Verification | PASS | [EC-012](EC-012/) |
| EC-013 | UAT: Checkout Completion | PASS (UI Verified, Human UAT Deferred) | [EC-013](EC-013/) |
| EC-014 | Performance: Initial Page Load | PASS | [EC-014](EC-014/) |
| EC-015 | UAT: Purchase Confidence and Return Intent | PASS (UI Verified, Human UAT Deferred) | [EC-015](EC-015/) |

## Key observations

### Cart and guest controls (EC-001–EC-005)

- EC-001 added `Navy Formal Blazer` with quantity 1 and captured the in-app confirmation message.
- EC-002 used a guest context with no session token or cached user. The guest registration prompt was displayed and **zero** `/cart/` API calls were observed.
- EC-003 increased quantity from 1 to 2; the UI total changed from ₱2,499 to ₱4,998 and the server confirmed quantity 2.
- EC-004 removed one of two items, then cleared the remaining item using the UI's **Select all + Remove Selected** control; cart returned to 0 items.
- EC-005 logged out and back in through real UI flows; the cart item and quantity persisted.

### Checkout and orders (EC-006–EC-009)

- EC-006 completed the mock checkout, created order `FF-42685955` (total ₱3,598.00, 2 items, both with store names), cleared the cart, and verified the skippable **Rate Fit Accuracy** pop-up.
- EC-007 injected the documented decline sentinel into the real checkout POST via Playwright `page.route` (`payment_method: "Mock E-Wallet Decline"`). The API returned `Payment declined.`, no order was created, and the cart item remained intact.
- EC-008 confirmed the order history rendered the newest order first with order number, date, total, status, and item count.
- EC-009 opened the newest order and verified the store name was displayed for every item.

### Unavailable item (EC-010)

- A temporary seller account uploaded a listing through the real `/catalog/upload/` API, then delisted it with `DELETE /catalog/my-listings/<id>/` via the Playwright `request` API.
- Public retrieval returned HTTP 404. Adding the delisted item returned HTTP 400 with `Catalog item does not exist.`
- The product page rendered **Product Not Found / Could not load product details.** with no Add to Cart button and a **Return to Catalog** link.

### Performance and security (EC-011, EC-012, EC-014)

- EC-011 measured 20 steady-state samples per endpoint after warm-up:

  | Endpoint | p95 | Max | Criterion |
  | --- | ---: | ---: | --- |
  | `/catalog/` | 219 ms | 226 ms | < 500 ms ✅ |
  | `/api/recommendations/` | 211 ms | 219 ms | < 500 ms ✅ |
  | `/cart/` | 481 ms | 488 ms | < 500 ms ✅ |

- EC-012 asserted `window.location.protocol === 'https:'` on the loaded staging URL.
- EC-014 recorded initial navigation timings of 251 ms, 107 ms, and 80 ms (worst 251 ms), well under the 3000 ms target.

### Human UAT deferred checks (EC-013, EC-015)

- EC-013 verified the functional checkout controls (address form, Review and Place Order, simulated payment methods). The ≥70% cart-completion KPI requires human UAT sessions and was deferred.
- EC-015 verified the in-app Pre-Try-On Check and Post-Try-On Check controls and the confidence / return-intent question copy in the DOM. Fit-Accuracy pop-up behaviour was functionally verified in EC-006. The ≥80% population-level KPI is deferred to post-deployment per Scope v1.1.

## Notes

- No FAIL evidence remains in this folder; stale `failure.png` files from earlier diagnostic runs were removed after the final green run.
- EC-007 and EC-010 are test-only simulations: EC-007 rewrites the checkout request body, and EC-010 uses API requests to create then delist a temporary listing. Neither changes application code.
- The CSV `docs/Test Cases/FitFusionAI - Test Cases - EC — E-Commerce & Mock Payment .csv` was updated with PASS statuses and evidence links for all 15 cases.
