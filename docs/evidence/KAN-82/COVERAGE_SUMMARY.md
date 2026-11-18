# KAN-82 — Unit & Integration Test Coverage Summary

Run date: 2026-11-18 (UTC)
Command: `coverage run --source=accounts,catalog,commerce,outfits,recommendations,ratings manage.py test accounts catalog commerce outfits recommendations ratings`
Result: 267 tests, exit code 0, 1 skipped.
Run log: docs/evidence/KAN-82/20261118T135032Z-six-suites-coverage-final.log
Run metadata: docs/evidence/KAN-82/20261118T135032Z-six-suites-coverage-final.meta.json
XML report: docs/evidence/KAN-82/coverage.xml
Per-file report: docs/evidence/KAN-82/coverage-core-report.txt

Overall measured coverage (all six apps): 84% (7370 statements, 1156 missed).

## Core business logic (per-file)

| Area | File | Statements | Missed | Coverage |
|---|---|---|---|---|
| Recommendations scoring | recommendations/scoring.py | 74 | 2 | 97% |
| Catalog validators | catalog/validators.py | 102 | 1 | 99% |
| Catalog views | catalog/views/core.py | 765 | 137 | 82% |
| Commerce cart/checkout/order | commerce/views.py | 180 | 35 | 81% |
| Commerce services | commerce/services.py | 7 | 0 | 100% |
| Accounts auth validation | accounts/serializers/auth_serializers.py | 111 | 3 | 97% |
| Accounts auth views | accounts/views/auth_views.py | 159 | 22 | 86% |
| Accounts preset serializers | accounts/serializers/preset_serializers.py | 50 | 0 | 100% |
| Accounts preset views | accounts/views/preset_views.py | 17 | 2 | 88% |
| Accounts validators | accounts/validators.py | 10 | 0 | 100% |

All core business-logic files are at or above the 80% threshold.

## Test additions in this phase

- `catalog.tests.CatalogLegacyValidatorCoverageTests` — exercises the retained
  catalog/validators.py compatibility module (CSV row, image, rembg, dominant
  color, palette tags).
- `accounts.tests.AuthValidationCoverageTests` — auth serializer/password/email
  validation, login state rejection, preset serializer bounds/aliases, preset
  owner guard, legacy auth views and token/logout/deactivate endpoints.
- `accounts.tests.AccountValidatorCoverageTests` — mobile and postal code field
  validators.
