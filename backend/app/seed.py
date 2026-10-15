"""python -m app.seed [--demo]  -> buat akun admin (+ data contoh)."""
import os, sys, random, datetime as dt, bcrypt
from dotenv import load_dotenv
from sqlalchemy import text
from .db import engine
from .main import ingest, ingest_likert, run_nlp
from typing import Optional

load_dotenv()
u, p = os.getenv("ADMIN_USERNAME", "admin"), os.getenv("ADMIN_PASSWORD", "lsmartcity2026")
h = bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()
with engine.begin() as c:
    c.execute(text("INSERT INTO admins(username,password_hash) VALUES(:u,:h) ON CONFLICT (username) DO UPDATE SET password_hash=:h"), {"u": u, "h": h})
if "--demo" in sys.argv:
    demo = ["Pelayanan pemko sekarang cepat dan bagus, mantap!", "Jalan di Banda Sakti masih rusak dan macet parah",
            "Sampah menumpuk, lingkungan kotor dan bau", "Semoga UMKM lokal makin maju, pasar rapi", "Wifi gratis di taman kota sangat membantu warga",
            "Sekolah butuh pelatihan digital untuk guru dan pemuda", "Listrik sering mati, kecewa sekali", "Aplikasi layanan publik keren dan transparan",
            "Parkir susah dan lampu jalan mati", "Puskesmas pelayanannya baik dan cepat"]
    KEC = ["Banda Sakti", "Muara Dua", "Blang Mangat", "Muara Satu"]  # 4 kecamatan Kota Lhokseumawe
    PERTANYAAN = ["Layanan publik Pemko Lhokseumawe sudah cepat dan responsif",
                  "Fasilitas umum di lingkungan saya sudah memadai"]  # 1=Sangat Setuju ... 5=Sangat Tidak Setuju
    now = dt.datetime.now()
    # kecamatan diisi acak di sini hanya untuk contoh; komentar Instagram sungguhan biasanya tidak membawa info ini
    rows = [(t, now - dt.timedelta(days=i), random.choice(KEC)) for i, t in enumerate(demo)]
    ingest(None, "File Lokal", "demo", rows); run_nlp()
    with engine.begin() as c:  # data contoh langsung diverifikasi supaya dashboard terisi begitu di-seed
        c.execute(text("UPDATE data_nlp SET is_verified = TRUE"))
    likert_rows = [(q, random.randint(1, 5), now - dt.timedelta(days=random.randint(0, 30)), random.choice(KEC))
                   for _ in range(24) for q in PERTANYAAN]
    ingest_likert(None, "File Lokal", "demo-kuesioner", likert_rows)
print("Selesai. Admin:", u)
