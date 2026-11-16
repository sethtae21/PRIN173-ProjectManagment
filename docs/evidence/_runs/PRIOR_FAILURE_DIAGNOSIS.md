# Diagnosis of prior failed runs

These are diagnoses of the previously captured failures, not new test results.
The current one-time suite runs are recorded separately in this directory.

## KAN-104 / catalog

The earlier raw output is preserved at
`docs/evidence/KAN-104/TEST_KAN-104_catalog.txt`. It includes a Windows CP1252
encoding error while the identity logger emitted an emoji. The one-time rerun
used `PYTHONIOENCODING=utf-8`, and that encoding error did not recur. The
captured catalog run still failed four assertions (full output:
`20261116T013042Z-catalog.log`): color suggestions and mismatch text were
lowercase (`blue`) while assertions expected `Blue`; the approved comma-
separated style-tag assertion returned false; and the occasion-tag assertion
expected an `occasion_tags` error. These are observed test/code mismatches;
the run is blocked and is not a pass.

## KAN-49 / recommendations and ratings

The earlier ratings output is preserved at
`docs/evidence/KAN-49/2026-11-11_KAN-49_testrun_ratings-tests.log`. Its
traceback shows a PyMongo `NetworkTimeout` while Django flushed the remote
`test_fitfusion` database. Immediately before the one-time rerun,
`python manage.py db_ping --json` returned `ok: true`, Atlas enabled, and
1300.9 ms latency; that point-in-time check could not guarantee later flushes.

In the captured one-time runs, `ratings` passed 28 tests with no failures. The
`recommendations` command failed: `recommendations.tests_weights` could not
import `CONTRAST_BY_HEIGHT` from `recommendations.knowledge_table`, and three
other assertions failed. The complete current output is in
`20261116T013640Z-recommendations.log`; no recommendation-suite pass is claimed.
