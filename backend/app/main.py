import os, io, csv, re, datetime as dt
from collections import Counter
import bcrypt, jwt
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy import text
from typing import Optional
from .db import engine
from . import nlp, scraper

load_dotenv()
SECRET = os.getenv("JWT_SECRET", "ganti-di-env")
app = FastAPI(title="Smart City Lhokseumawe API")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","), allow_methods=["*"], allow_headers=["*"])
oauth = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
JOB = {"state": "idle", "pesan": "Belum ada proses"}

def admin_required(token: str = Depends(oauth)) -> int:
    try:
        return int(jwt.decode(token, SECRET, algorithms=["HS256"])["sub"])
    except Exception:
        raise HTTPException(401, "Sesi tidak valid, silakan login ulang")

def buat_sumber(c, admin_id, jenis, ref):
    return c.execute(text("INSERT INTO data_sumber(jenis_sumber,url_atau_referensi,admin_id) VALUES(:j,:r,:a) RETURNING id"),
                      {"j": jenis, "r": ref, "a": admin_id}).scalar()

def ingest_teks_rows(c, sid, rows) -> int:
    # rows: (teks, waktu, kecamatan, sumber_kolom). sumber_kolom None untuk komentar biasa (mis. Instagram atau kolom "teks").
    n = c.execute(text("SELECT COUNT(*) FROM data_mentah")).scalar()
    for i, (t, w, kec, kolom) in enumerate(rows, 1):
        c.execute(text("INSERT INTO data_mentah(sumber_id,teks_asli,username_anonim,waktu_komentar,kecamatan,sumber_kolom) VALUES(:s,:t,:u,:w,:k,:kol)"),
                  {"s": sid, "t": t, "u": f"User_{n + i:04d}", "w": w, "k": kec, "kol": kolom})
    return len(rows)

def ingest_likert_rows(c, sid, rows) -> int:
    # rows: (pertanyaan, skor 1-5, waktu, kecamatan) -- jawaban kuesioner skala, tidak melalui NLP
    n = c.execute(text("SELECT COUNT(*) FROM survey_likert")).scalar()
    for i, (q, sk, w, kec) in enumerate(rows, 1):
        c.execute(text("INSERT INTO survey_likert(sumber_id,responden,pertanyaan,skor,waktu,kecamatan) VALUES(:s,:r,:q,:sk,:w,:k)"),
                  {"s": sid, "r": f"Responden_{n + i:04d}", "q": q, "sk": sk, "w": w, "k": kec})
    return len(rows)

def ingest(admin_id, jenis, ref, rows) -> int:
    # rows: list berisi (teks, waktu, kecamatan). Dipakai untuk komentar biasa (mis. hasil scraping Instagram).
    with engine.begin() as c:
        sid = buat_sumber(c, admin_id, jenis, ref)
        return ingest_teks_rows(c, sid, [(t, w, kec, None) for t, w, kec in rows])

def ingest_likert(admin_id, jenis, ref, rows) -> int:
    # rows: list berisi (pertanyaan, skor, waktu, kecamatan)
    with engine.begin() as c:
        sid = buat_sumber(c, admin_id, jenis, ref)
        return ingest_likert_rows(c, sid, rows)

def run_nlp() -> int:
    with engine.begin() as c:
        rows = c.execute(text("SELECT m.id, m.teks_asli FROM data_mentah m LEFT JOIN data_nlp n ON n.data_mentah_id=m.id WHERE n.id IS NULL")).all()
        if not rows:
            return 0
        for r, x in zip(rows, nlp.process([r.teks_asli for r in rows])):
            c.execute(text("INSERT INTO data_nlp(data_mentah_id,teks_bersih,kategori_pilar,nilai_sentimen,skor_akurasi_model) VALUES(:i,:t,:k,:s,:a)"),
                      {"i": r.id, "t": x["bersih"], "k": x["pilar"], "s": x["sentimen"], "a": x["skor"]})
    return len(rows)

def _run(label, fn, *args):  # dijalankan di background agar UI tidak freeze
    JOB.update(state="running", pesan=f"{label} sedang berjalan...")
    try:
        JOB.update(state="done", pesan=f"{label} selesai ({fn(*args)} data)")
    except Exception as e:
        JOB.update(state="error", pesan=f"{label} gagal: {e}")

def _scrape(url_atau_media_id, admin_id):
    rows = [(t, w, None) for t, w in scraper.scrape_comments(url_atau_media_id)]  # Instagram tidak menyediakan info kecamatan
    return ingest(admin_id, "Instagram", url_atau_media_id, rows)

@app.post("/api/auth/login")
def login(f: OAuth2PasswordRequestForm = Depends()):
    with engine.begin() as c:
        a = c.execute(text("SELECT id,password_hash FROM admins WHERE username=:u"), {"u": f.username}).first()
        if not a or not bcrypt.checkpw(f.password.encode(), a.password_hash.encode()):
            raise HTTPException(401, "Username atau password salah")
        c.execute(text("UPDATE admins SET last_login=now() WHERE id=:i"), {"i": a.id})
    exp = dt.datetime.utcnow() + dt.timedelta(hours=8)
    return {"access_token": jwt.encode({"sub": str(a.id), "exp": exp}, SECRET, algorithm="HS256")}

@app.get("/api/dashboard")
def dashboard(
    start: Optional[str] = None,
    end: Optional[str] = None,
    pilar: Optional[str] = None,
    kecamatan: Optional[str] = None):
    
    # kecamatan sengaja HANYA dipakai untuk hasil kuesioner (lw/lp) di bawah, bukan untuk statistik
    # komentar (w/tgl/base) -- komentar Instagram tidak punya info kecamatan yang bisa diandalkan.
    d, w, p = "COALESCE(m.waktu_komentar, m.created_at)::date", ["n.is_verified = TRUE"], {}
    if start: w.append(f"{d} >= :start"); p["start"] = start
    if end: w.append(f"{d} <= :end"); p["end"] = end
    tgl = "FROM data_nlp n JOIN data_mentah m ON m.id=n.data_mentah_id WHERE " + " AND ".join(w)
    base = tgl + (" AND n.kategori_pilar = :pilar" if pilar else "")
    pp = {**p, **({"pilar": pilar} if pilar else {})}
    lw, lp = ["1=1"], {}
    if start: lw.append("COALESCE(waktu, created_at)::date >= :start"); lp["start"] = start
    if end: lw.append("COALESCE(waktu, created_at)::date <= :end"); lp["end"] = end
    if kecamatan: lw.append("kecamatan = :kecamatan"); lp["kecamatan"] = kecamatan
    with engine.connect() as c:
        s = c.execute(text(f"SELECT nilai_sentimen k, COUNT(*) v {base} GROUP BY 1"), pp).all()
        k = c.execute(text(f"SELECT kategori_pilar k, COUNT(*) v {base} GROUP BY 1 ORDER BY 2 DESC"), pp).all()  # jumlah komentar per topik/pilar
        t = c.execute(text(f"SELECT n.teks_bersih {base} LIMIT 5000"), pp).scalars().all()  # hanya teks bersih, tanpa username
        info = {r.k: r for r in c.execute(text(f"SELECT n.kategori_pilar k, COUNT(*) v, SUM(CASE WHEN n.nilai_sentimen='Positif' THEN 1 ELSE 0 END) pos {tgl} GROUP BY 1"), p).all()}
        lrows = c.execute(text(f"SELECT pertanyaan, skor, COUNT(*) n FROM survey_likert WHERE {' AND '.join(lw)} GROUP BY pertanyaan, skor"), lp).all()
        likert_kec = c.execute(text("SELECT DISTINCT kecamatan FROM survey_likert WHERE kecamatan IS NOT NULL AND kecamatan <> '' ORDER BY 1")).scalars().all()
    words = Counter(x for row in t if row for x in set(row.split()) if len(x) > 3 and x not in nlp.STOP)
    # kuesioner skala: 1=Sangat Setuju ... 5=Sangat Tidak Setuju (skala dibalik, bukan skala umum 1=buruk..5=baik)
    likert = {}
    for r in lrows:
        d = likert.setdefault(r.pertanyaan, {"pertanyaan": r.pertanyaan, "n": 0, "distribusi": {str(i): 0 for i in range(1, 6)}})
        d["n"] += r.n; d["distribusi"][str(r.skor)] = r.n
    likert_out = []
    for v in likert.values():
        n = v["n"] or 1
        setuju = v["distribusi"]["1"] + v["distribusi"]["2"]
        tidak = v["distribusi"]["4"] + v["distribusi"]["5"]
        likert_out.append({"pertanyaan": v["pertanyaan"], "n": v["n"], "distribusi": v["distribusi"],
                            "persen_setuju": round(setuju / n * 100), "persen_tidak_setuju": round(tidak / n * 100)})
    return {"total": sum(r.v for r in s), "sentimen": [{"name": r.k, "value": r.v} for r in s],
            "pilar": [{"name": r.k, "value": r.v} for r in k],
            "words": [{"text": a, "value": b, "persen": round(b / max(len(t), 1) * 100, 1)} for a, b in words.most_common(40)],
            "pilar_info": [{"name": n, "total": int(info[n].v) if n in info else 0,
                            "positif": round(int(info[n].pos) / int(info[n].v) * 100) if n in info else 0,
                            "topik": nlp.PILAR[n][:4]} for n in nlp.PILAR],
            "likert": likert_out, "likert_kecamatan_list": likert_kec}

@app.get("/api/admin/status")
def status(_=Depends(admin_required)):
    return JOB

class IG(BaseModel):
    url: str  # URL postingan/reel Instagram (diproses lewat Apify)

@app.post("/api/admin/scrape")
def scrape(body: IG, bg: BackgroundTasks, admin_id: int = Depends(admin_required)):
    bg.add_task(_run, "Scraping Instagram", _scrape, body.url, admin_id)
    return {"ok": True}

RESERVED_KOLOM = {"waktu", "kecamatan", "teks", "komentar", "text"}

def _kolom_likert(nilai):
    """True kalau semua nilai terisi pada kolom ini berupa angka bulat 1-5 (pola jawaban skala kuesioner)."""
    ada_isi = False
    for v in nilai:
        v = (v or "").strip()
        if not v:
            continue
        if not re.fullmatch(r"[1-5]", v):
            return False
        ada_isi = True
    return ada_isi

@app.post("/api/admin/upload")
async def upload(file: UploadFile = File(...), admin_id: int = Depends(admin_required)):
    baris = list(csv.DictReader(io.StringIO((await file.read()).decode("utf-8-sig"))))
    if not baris:
        raise HTTPException(400, "File CSV kosong")
    kolom_lain = [h for h in baris[0].keys() if h.strip().lower() not in RESERVED_KOLOM]
    kolom_likert = [h for h in kolom_lain if _kolom_likert([r.get(h) for r in baris])]
    kolom_teks = [h for h in kolom_lain if h not in kolom_likert]

    teks_rows, likert_rows = [], []
    for r in baris:
        low = {k.strip().lower(): v for k, v in r.items()}
        try: w = dt.datetime.fromisoformat(low.get("waktu") or "")
        except ValueError: w = None
        kec = (low.get("kecamatan") or "").strip() or None

        t = low.get("teks") or low.get("komentar") or low.get("text")
        if t: teks_rows.append((t, w, kec, None))  # kolom teks utama, kompatibel dengan format CSV lama

        for kol in kolom_teks:  # kolom teks bebas lain, mis. "Kritik dan Saran", "Keinginan Masa Depan ..."
            v = (r.get(kol) or "").strip()
            if v: teks_rows.append((v, w, kec, kol))

        for kol in kolom_likert:  # kolom pernyataan skala 1-5
            v = (r.get(kol) or "").strip()
            if v: likert_rows.append((kol, int(v), w, kec))

    if not teks_rows and not likert_rows:
        raise HTTPException(400, "Tidak ada kolom 'teks'/'komentar', kolom teks lain, atau kolom skala 1-5 yang bisa dikenali dari CSV ini")

    with engine.begin() as c:
        sid = buat_sumber(c, admin_id, "File Lokal", file.filename)
        n_teks = ingest_teks_rows(c, sid, teks_rows) if teks_rows else 0
        n_likert = ingest_likert_rows(c, sid, likert_rows) if likert_rows else 0
    return {"masuk_teks": n_teks, "masuk_likert": n_likert, "kolom_likert": kolom_likert, "kolom_teks_lain": kolom_teks}

@app.get("/api/admin/sumber")
def sumber(_=Depends(admin_required)):
    with engine.connect() as c:
        return [dict(r._mapping) for r in c.execute(text("SELECT id,jenis_sumber,url_atau_referensi,tanggal_diambil FROM data_sumber ORDER BY id DESC LIMIT 20"))]

@app.post("/api/admin/nlp/run")
def nlp_run(bg: BackgroundTasks, _=Depends(admin_required)):
    bg.add_task(_run, "Model NLP", run_nlp)
    return {"ok": True}

@app.get("/api/admin/nlp")
def nlp_list(unverified: bool = False, page: int = 1, page_size: int = 50, _=Depends(admin_required)):
    dasar = "FROM data_nlp n JOIN data_mentah m ON m.id=n.data_mentah_id" + (" WHERE NOT n.is_verified" if unverified else "")
    page = max(page, 1); offset = (page - 1) * page_size
    with engine.connect() as c:
        total = c.execute(text(f"SELECT COUNT(*) {dasar}")).scalar()
        rows = c.execute(text(f"SELECT n.id, m.teks_asli teks, m.sumber_kolom kolom, n.kategori_pilar pilar, n.nilai_sentimen sentimen, n.skor_akurasi_model skor, n.is_verified {dasar} ORDER BY n.id DESC LIMIT :l OFFSET :o"),
                            {"l": page_size, "o": offset}).all()
    return {"rows": [dict(r._mapping) for r in rows], "total": total, "page": page, "page_size": page_size}

@app.post("/api/admin/nlp/verify-all")
def nlp_verify_all(_=Depends(admin_required)):
    """Verifikasi sekaligus semua data yang belum diverifikasi (menerima label NLP apa adanya)."""
    with engine.begin() as c:
        n = c.execute(text("UPDATE data_nlp SET is_verified = TRUE WHERE is_verified = FALSE")).rowcount
    return {"diverifikasi": n}

@app.get("/api/admin/ringkasan")
def ringkasan(_=Depends(admin_required)):
    with engine.connect() as c:
        total_data = c.execute(text("SELECT COUNT(*) FROM data_mentah")).scalar()
        sudah_diproses = c.execute(text("SELECT COUNT(*) FROM data_nlp")).scalar()
        terverifikasi = c.execute(text("SELECT COUNT(*) FROM data_nlp WHERE is_verified")).scalar()
    return {"total_data": total_data, "sudah_diproses": sudah_diproses, "belum_diproses": total_data - sudah_diproses,
            "terverifikasi": terverifikasi, "belum_diverifikasi": sudah_diproses - terverifikasi}

class Koreksi(BaseModel):
    pilar: str
    sentimen: str

@app.patch("/api/admin/nlp/{nid}")
def nlp_fix(nid: int, b: Koreksi, _=Depends(admin_required)):
    try:
        with engine.begin() as c:
            c.execute(text("UPDATE data_nlp SET kategori_pilar=:p, nilai_sentimen=:s, is_verified=TRUE WHERE id=:i"), {"p": b.pilar, "s": b.sentimen, "i": nid})
    except Exception:
        raise HTTPException(400, "Nilai pilar atau sentimen tidak valid")
    return {"ok": True}
