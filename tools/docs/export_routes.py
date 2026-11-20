import os, sys, re, json, inspect, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "fitfusion.settings")

import django
django.setup()
from django.urls import URLPattern, URLResolver, get_resolver

def where(o):
    try:
        f = pathlib.Path(inspect.getsourcefile(o)).resolve()
        lines, start = inspect.getsourcelines(o)
        return f.relative_to(ROOT).as_posix(), start, start + len(lines) - 1
    except Exception:
        return "", 0, 0

def walk(pats, prefix=""):
    for p in pats:
        if isinstance(p, URLResolver):
            if str(p.pattern).startswith("admin/"):
                continue
            yield from walk(p.url_patterns, prefix + str(p.pattern))
            continue
        cb = p.callback
        route = "/" + (prefix + str(p.pattern)).lstrip("/")
        cls = getattr(cb, "cls", None) or getattr(cb, "view_class", None)
        acts = getattr(cb, "actions", None)
        if cls and acts:
            for m, a in sorted(acts.items()):
                f, s, e = where(getattr(cls, a, cls))
                yield dict(route=route, method=m.upper(), handler=f"{cls.__name__}.{a}", file=f, start=s, end=e)
        elif cls:
            hits = [m for m in ("get", "post", "put", "patch", "delete") if callable(getattr(cls, m, None))]
            for m in hits or ["ANY"]:
                f, s, e = where(getattr(cls, m, cls))
                yield dict(route=route, method=m.upper(), handler=f"{cls.__name__}.{m}", file=f, start=s, end=e)
        else:
            f, s, e = where(cb)
            for m in (getattr(cb, "methods", None) or ["ANY"]):
                yield dict(route=route, method=m.upper(), handler=getattr(cb, "__name__", "?"), file=f, start=s, end=e)

rows = sorted(walk(get_resolver().url_patterns), key=lambda r: (r["route"], r["method"]))
out = ROOT / "docs" / "kb" / "_generated"
out.mkdir(parents=True, exist_ok=True)
(out / "routes.json").write_text(json.dumps(rows, indent=2), encoding="utf-8")
md = ["| Method | Route | Handler | Source |", "| --- | --- | --- | --- |"]
for r in rows:
    src = f"`{r['file']}` L{r['start']}-{r['end']}" if r["file"] else "UNVERIFIED"
    md.append(f"| {r['method']} | `{r['route']}` | `{r['handler']}` | {src} |")
(out / "routes.md").write_text("\n".join(md) + "\n", encoding="utf-8")
print(f"{len(rows)} operations -> docs/kb/_generated/routes.json + routes.md")