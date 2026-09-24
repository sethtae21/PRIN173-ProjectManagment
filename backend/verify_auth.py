import os, requests, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "fitfusion.settings")
django.setup()
from accounts.models import User
try:
    from commerce.models import Cart
except Exception:
    Cart = None

BASE = "http://127.0.0.1:8000"
USERNAME, SELLERNAME = "verifyuser", "verifyseller"
EMAIL, SEMAIL = "verify.pass@test.com", "seller.verify.pass@test.com"
STRONG, WEAK, WRONG = "Str0ng!Pass", "weakpw", "Wr0ng!Pass"

results = []
def check(num, name, ok, detail=""):
    results.append((num, name, bool(ok)))
    print(f"{'PASS' if ok else 'FAIL'} | {num} | {name} | {detail}")

def post(url, payload=None, token=None):
    h = {"Authorization": f"Bearer {token}"} if token else {}
    return requests.post(BASE + url, json=payload or {}, headers=h, timeout=15)

# clean slate so re-runs work
for u in (USERNAME, SELLERNAME):
    User.objects.filter(username=u).delete()
for e in (EMAIL, SEMAIL):
    User.objects.filter(email=e).delete()

# 1 register normal user (username IS required)
r = post("/auth/register/", {"username": USERNAME, "email": EMAIL, "password": STRONG, "role": "user"})
body = r.json() if "json" in r.headers.get("content-type", "") else {}
access = body.get("access") or (body.get("tokens") or {}).get("access")
row = User.objects.filter(username=USERNAME).first()
check(1, "Register User -> JWT issued, role persisted",
      r.status_code in (200, 201) and bool(access) and row is not None,
      f"HTTP {r.status_code}; {r.text[:150] if r.status_code >= 400 else ''} role={getattr(row,'role','n/a')}; is_seller={getattr(row,'is_seller','n/a')}")

# 2 seller store-name rule
r = post("/auth/register/", {"username": SELLERNAME, "email": SEMAIL, "password": STRONG, "role": "seller"})
check("2a", "Seller WITHOUT store name -> rejected", r.status_code == 400, f"HTTP {r.status_code}; {r.text[:150]}")
r = post("/auth/register/", {"username": SELLERNAME, "email": SEMAIL, "password": STRONG, "role": "seller", "store_name": "Verify Store"})
srow = User.objects.filter(username=SELLERNAME).first()
check("2b", "Seller WITH store name -> stored",
      r.status_code in (200, 201) and getattr(srow, "store_name", None) == "Verify Store",
      f"HTTP {r.status_code}; {r.text[:150] if r.status_code >= 400 else ''} store_name={getattr(srow,'store_name',None)}")

# 3 duplicate email
r = post("/auth/register/", {"username": "verifyuser2", "email": EMAIL, "password": STRONG, "role": "user"})
check(3, "Duplicate email -> rejected", r.status_code == 400, f"HTTP {r.status_code}; {r.text[:150]}")

# 4 weak password
r = post("/auth/register/", {"username": "verifyweak", "email": "weak@test.com", "password": WEAK, "role": "user"})
check(4, "Weak password -> rejected server-side", r.status_code == 400 and "password" in r.text,
      f"HTTP {r.status_code}; {r.text[:200]}")

# 5 wrong password (login uses username)
r = post("/auth/login/", {"username": USERNAME, "password": WRONG})
check(5, "Wrong password login -> 401", r.status_code == 401, f"HTTP {r.status_code}; {r.text[:150]}")

# 6 RBAC on seller endpoint
r = post("/catalog/", {"name": "x"})
check("6a", "No token -> seller endpoint denied", r.status_code in (401, 403), f"HTTP {r.status_code}")
r = post("/catalog/", {"name": "x"}, token=access)
check("6b", "User token -> seller endpoint 403", r.status_code == 403, f"HTTP {r.status_code}; {r.text[:150]}")

# 7 guest ephemerality
guest_rows = User.objects.filter(role="guest").count() if hasattr(User, "role") else 0
check(7, "Zero guest rows in DB", guest_rows == 0, f"guest rows={guest_rows}")

# 8 account delete (cascade)
uid = row.id if row else None
if uid and Cart is not None and Cart.objects.filter(user_id=uid).count() == 0:
    try:
        Cart.objects.create(user_id=uid)
    except Exception as e:
        print("   (could not plant cart row:", e, ")")
r = requests.delete(BASE + "/profile/", headers={"Authorization": f"Bearer {access}"}, timeout=15)
gone = not User.objects.filter(id=uid).exists() if uid else False
left = Cart.objects.filter(user_id=uid).count() if (uid and Cart is not None) else -1
check(8, "Account delete -> user + related rows erased",
      r.status_code in (200, 204) and gone and left == 0,
      f"HTTP {r.status_code}; user_gone={gone}; cart_rows_left={left}")

print("\nSUMMARY:", sum(1 for *_, ok in results if ok), "/", len(results), "passed")
for num, name, ok in results:
    if not ok:
        print("  NEEDS ATTENTION:", num, name)