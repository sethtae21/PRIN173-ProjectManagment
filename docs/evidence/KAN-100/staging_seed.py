import io
import json
import time
import uuid
import datetime
import requests
from PIL import Image, ImageDraw

API = "http://127.0.0.1:8000"
stamp = datetime.datetime.utcnow().strftime("%Y%m%d%H%M%S")
suffix = uuid.uuid4().hex[:8]
email = f"seed-seller-{stamp}-{suffix}@example.test"
password = "SeedSeller123!"
mobile = "09" + str(uuid.uuid4().int)[:9].ljust(9, "7")
store = f"Seed Store {suffix}"

register = requests.post(f"{API}/auth/register/", json={
    "email": email,
    "full_name": "Seed Seller",
    "password": password,
    "password_confirm": password,
    "role": "seller",
    "store_name": store,
    "mobile": mobile,
}, timeout=60)
print("register", register.status_code)
register.raise_for_status()
access = register.json()["tokens"]["access"]
headers = {"Authorization": f"Bearer {access}"}


def tee_bytes(size=(800, 800), shirt=(255, 255, 255)):
    img = Image.new("RGB", size, (205, 205, 205))
    draw = ImageDraw.Draw(img)
    w, h = size
    body = [
        (w * 0.28, h * 0.22), (w * 0.40, h * 0.16), (w * 0.50, h * 0.20),
        (w * 0.60, h * 0.16), (w * 0.72, h * 0.22), (w * 0.82, h * 0.34),
        (w * 0.72, h * 0.42), (w * 0.68, h * 0.34), (w * 0.68, h * 0.82),
        (w * 0.32, h * 0.82), (w * 0.32, h * 0.34), (w * 0.28, h * 0.42),
        (w * 0.18, h * 0.34),
    ]
    draw.polygon(body, fill=shirt)
    draw.ellipse((w * 0.44, h * 0.16, w * 0.56, h * 0.24), fill=(205, 205, 205))
    out = io.BytesIO()
    img.save(out, format="PNG")
    return out.getvalue()


csv_text = (
    "name,description,category,size,color,color_description,color_family,price,style_tags,"
    "front_image_filename,rear_image_filename\n"
    "Classic White Tee,\"A comfortable, breathable cotton t-shirt perfect for daily wear.\","
    "Tops,M,White,Pure White,Neutral,599.00,\"Casual\",white_tee_front.png,white_tee_rear.png\n"
)
front = tee_bytes()
rear = tee_bytes()

upload = requests.post(
    f"{API}/catalog/upload/",
    headers=headers,
    files=[
        ("csv_file", ("catalog_products.csv", csv_text.encode(), "text/csv")),
        ("images", ("white_tee_front.png", front, "image/png")),
        ("images", ("white_tee_rear.png", rear, "image/png")),
    ],
    timeout=120,
)
print("upload", upload.status_code, upload.text[:400])
upload.raise_for_status()
batch_id = upload.json()["batch_id"]

final = None
for attempt in range(60):
    time.sleep(2)
    listings = requests.get(f"{API}/catalog/my-listings/", headers=headers, timeout=60)
    listings.raise_for_status()
    rows = listings.json()
    match = [row for row in rows if row.get("name") == "Classic White Tee"]
    if match:
        final = match[0]
        if final.get("status") in ("active", "rejected"):
            break

report = requests.get(
    f"{API}/catalog/batch-report/", headers=headers,
    params={"batch_id": batch_id}, timeout=60,
)

summary = {
    "email": email,
    "store": store,
    "batch_id": batch_id,
    "upload_status": upload.status_code,
    "batch_report_status": report.status_code,
    "batch_report": report.json() if report.ok else report.text,
    "item": final,
}
print(json.dumps(summary, indent=2, default=str))

public = requests.get(f"{API}/catalog/", params={"store": store}, timeout=60)
active = [row for row in public.json() if row.get("status") == "active"] if public.ok else []
print("public_active_count", len(active))
print("SEED_RESULT", "PASS" if final and final.get("status") == "active" and active else "FAIL")
