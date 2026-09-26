"""
manage.py db_ping  ->  the literal KAN-93 done-when artifact: prints `ping: ok`
resolved from the Backend settings against the LIVE cluster (localhost refused
unless --allow-local). Exit code 0 on success, 1 on failure (CI/script friendly).

Usage:
    python manage.py db_ping                 # human report, live cluster required
    python manage.py db_ping --json          # machine-readable (pipe to jq)
    python manage.py db_ping --allow-local   # opt out of the localhost guard
"""
import json
import sys

from django.core.management.base import BaseCommand

from accounts.health_utils import PING_TIMEOUTS, ping, resolve_target


class Command(BaseCommand):
    help = "Ping the configured MongoDB target from Django settings; prove it's the live cluster."

    def add_arguments(self, parser):
        parser.add_argument("--json", action="store_true", help="emit JSON instead of a human report")
        parser.add_argument("--allow-local", action="store_true",
                            help="permit a localhost target (default: refuse, to avoid a fake 'ok')")

    def handle(self, *args, **options):
        as_json = options["json"]
        allow_local = options["allow_local"]

        # Resolve up front so a localhost misconfig is reported as such, with the
        # sanitized target, instead of a confusing connect timeout.
        try:
            target = resolve_target(allow_local=allow_local)
        except RuntimeError as e:
            if as_json:
                print(json.dumps({"ok": False, "stage": "resolve", "error": str(e)}, indent=2))
            else:
                self.stderr.write(self.style.ERROR(f"ping: FAIL (resolve)\n{e}"))
            sys.exit(1)

        res = ping(allow_local=allow_local, timeouts=PING_TIMEOUTS)

        if as_json:
            print(json.dumps(res, indent=2, default=str))
        else:
            self.stdout.write(f"target cluster : {target['cluster']}")
            self.stdout.write(f"target database: {target['database']}")
            self.stdout.write(f"live atlas?    : {target['atlas']}   (local={target['local']})")
            self.stdout.write(f"tls            : {target['tls']}")
            if target.get("tls_disabled_warning"):
                self.stderr.write(self.style.WARNING("WARNING: tls=false found in URI -> remove it."))
            if res.get("ok"):
                self.stdout.write(self.style.SUCCESS(
                    f"ping: ok   (latency {res['latency_ms']} ms, server {res.get('server_version')})"))
            else:
                self.stderr.write(self.style.ERROR(f"ping: FAIL ({res.get('stage')})"))
                self.stderr.write(f"  error: {res.get('error')}")
                self.stderr.write(f"  hint : {res.get('hint')}")

        sys.exit(0 if res.get("ok") else 1)