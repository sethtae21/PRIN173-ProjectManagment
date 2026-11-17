# Diagnosis of prior failed runs

Historical failure logs and per-ticket `DEFECT_*.md` files are preserved as
requested. Their old “blocked” headings describe those attempts only; the
current outcomes are in `docs/evidence/EVIDENCE_INDEX.md`.

## KAN-104 and catalog validation

The earlier run at `20261116T013042Z-catalog.log` had a Windows CP1252 logging
error, incorrect color-family casing expectations, a mismatch between the
generated CSV and the upload parser/test format, and an obsolete
`occasion_tags` assertion. The fixes retained the approved style vocabulary,
used casing from the recommendations knowledge table, aligned parsing/tests
with the live CSV format, and removed `occasion_tags` from the application.
The fresh catalog run `20261117T095224Z-catalog.log` passed 54 tests.

## KAN-49, recommendations, and ratings

The separate 2026-11-11 KAN-49 ratings attempt is preserved at
`docs/evidence/KAN-49/2026-11-11_KAN-49_testrun_ratings-tests.log`; it shows a
PyMongo `NetworkTimeout` while Django flushed the remote test database. That
was a database/network failure, distinct from the later assertion failures.

The earlier recommendation run at `20261116T013640Z-recommendations.log`
failed because `CONTRAST_BY_HEIGHT` was imported from the wrong module and
weight expectations did not match the baselined color, height-contrast,
proportion-shading, and style values. Those imports and assertions are fixed.
The fresh recommendation run passed 45 tests; one literal-freeze test remains
skipped because no frozen values exist.

The ratings run `20261117T095641Z-ratings.log` exposed stale archival tests:
preview invoked the apply-by-default command without `--dry-run`, `--apply`
was not a supported option, and tests expected empty strings instead of the
documented `None` values for cleared fields. The next run
`20261117T100348Z-ratings.log` isolated one remaining stale role expectation:
the fixture is a seller and pseudonymization intentionally retains that role.
The test now passes `role='seller'` to the expected-value helper. The final
ratings run `20261117T100832Z-ratings.log` passed all 57 tests.

## OpenAPI

The initial schema generation reported 63 errors. Missing serializer/queryset
metadata and schema annotations were added. The current schema artifact is
validated as YAML with 69 operations and zero errors; its generation log is
`docs/evidence/KAN-41/20261117T093410Z-spectacular.log`.

All six latest suite records have complete test inventories and zero failures
or errors. The evidence index uses the latest successful log for each suite;
older attempts remain available and are not represented as current passes.
