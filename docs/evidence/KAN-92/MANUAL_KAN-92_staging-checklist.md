# KAN-92 local staging setup checklist

Status: NOT EXECUTED. Do not report deployment success without a live local run.

| Evidence action | Expected result to verify | Required filename |
|---|---|---|
| Start the configured local staging proxy | Server starts with the intended backend and TLS certificate configuration | `KAN-92_proxy-start_YYYYMMDD.log` |
| Open the staging health endpoint | A successful health response is returned by the live local deployment | `KAN-92_staging-health_YYYYMMDD.png` |

Operator, date, backend/proxy configuration (no secrets), and observed results: ____________________
