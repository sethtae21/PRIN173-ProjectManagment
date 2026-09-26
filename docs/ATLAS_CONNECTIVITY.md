# Atlas Connectivity & Network/TLS Config (KAN-93)

Live cluster: `cluster0.zrnfpru.mongodb.net` (Atlas **M0 free tier**), database
`fitfusion`. Connection comes from `$MONGODB_URI` (see `.env.example`); the
`settings.py` localhost default is a **dev-only fallback** and is refused by
`db_ping`/`/health` so a green ping can never be a silent localhost lie.

## Verify from the Backend settings (the done-when)
```bash
python manage.py db_ping            # expect: "ping: ok" + cluster = cluster0.zrnfpru...
python manage.py db_ping --json     # machine-readable
# and over HTTP (reused by KAN-94):
curl -s http://127.0.0.1:8000/health/ | python -m json.tool   # expect status:"ok", db.atlas:true
```
A `ping: ok` whose `cluster` is `localhost`/`127.*` is **invalid** by design — the
command exits 1 and tells you to set `MONGODB_URI`.

## Team IP allowlist (project is SHARED -> team IPs only, never 0.0.0.0/0)
Atlas rejects connections from any public IP not in **Network Access**. Each
working member must be listed:

1. Get your current public IP:  https://whatismyipaddress.com  (or `curl -s ifconfig.me`).
2. Atlas UI -> **Security -> Network Access -> Add IP Address** -> paste it
   (label it with the person's name). Repeat per member.
3. If several members share one egress (campus lab / office / a team VPN with a
   **static** IP), add that single IP or its CIDR once instead of per-person.

**Dynamic-IP rot (the real operational cost of "team IPs only"):** residential /
mobile / hotspot IPs change, so the allowlist goes stale and someone gets
`ServerSelectionTimeoutError`/`10054` out of nowhere. Mitigations, best->good:
* **Static egress** (team VPN or a fixed lab network): whitelist it once. Preferred.
* **Shared sheet** of each member's current IP + a "re-check before demo" step in
  the runbook (cheap, works for a student team).
* **Demo venue**: if the panel demos from a known room, whitelist that room's
  egress CIDR ahead of time.
We deliberately do **not** use `0.0.0.0/0` (project policy): it would expose the
team's data to the whole internet for the convenience of avoiding this list.

## M0 free-tier pause/wake
M0 clusters **sleep after ~days of inactivity** and the first connection then
resets (`10054` / timeout) until the cluster wakes (~30–60s). So:
* Before a demo or a `migrate`, **wake the cluster** (Atlas UI shows a Resume
  button if paused) or just run `db_ping` once and re-run after ~30s.
* The hardening params in `.env.example` (`maxIdleTimeMS`, bounded timeouts,
  retries) make a momentary reset recover on retry instead of crashing the app —
  this is what ended the recurring `WinError 10054` during normal use.

## TLS
`mongodb+srv://` **implies TLS**; no extra param is needed and none should be
added. A `tls=false` in the URI is a security regression — `db_ping` warns if it
sees one. Only a non-`+srv` replica-set URI would need explicit `tls=true` +
`tlsCAFile`; we don't use one.

## Troubleshooting map (what `db_ping`'s hint means)
| Symptom / hint | Cause | Fix |
|---|---|---|
| `Resolved target is LOCALHOST` | `.env` missing/overridden -> settings fallback | set `MONGODB_URI` to the live +srv URI |
| `Cluster unreachable ... IP not whitelisted / M0 paused` | allowlist or sleep | add your IP (above) / wake cluster |
| `Transient reset (10054)` | idle socket or firewall/VPN killing 27017 | retry; check VPN/proxy/firewall; confirm hardening params present |
| `Bad credentials` | wrong/URL-unencoded password | re-copy from Database Access, encode `@ : / ? #` |
| `DNS failure` | typo in host / offline | fix host string / check network |
| `tls=false` warning | insecure URI | remove the param |

## Pointers
Executable proof: `accounts/management/commands/db_ping.py`, `accounts/views/health.py`,
`accounts/health_utils.py`. Reused by **KAN-94** (`/health/` = its green check).