# KAN-94 local staging deployment checklist

Status: NOT EXECUTED. Command probes are recorded separately; this checklist is for browser-visible proof.

| Screen / action | Expected result to verify | Required filename |
|---|---|---|
| Open the local HTTPS application root | React application is served over TLS and loads without a browser error | `KAN-94_https-home_YYYYMMDD.png` |
| Navigate through Django-backed API documentation/health UI | Proxy routes to the configured backend | `KAN-94_https-api_YYYYMMDD.png` |

Operator, date, browser TLS trust state, and observed results: ____________________
