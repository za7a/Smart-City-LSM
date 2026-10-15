import os, re
PILAR = {
    "Smart Governance": ["pemerintah", "pemko", "walikota", "pelayanan", "birokrasi", "administrasi", "transparan", "korupsi", "aplikasi"],
    "Smart Environment": ["sampah", "lingkungan", "banjir", "polusi", "hijau", "taman", "limbah", "kebersihan", "drainase"],
    "Smart Mobility": ["jalan", "macet", "transportasi", "angkutan", "parkir", "lalu lintas", "trotoar", "bus", "lampu"],
    "Smart Economy": ["ekonomi", "umkm", "usaha", "pasar", "kerja", "investasi", "pajak", "harga", "wisata"],
    "Smart Living": ["kesehatan", "rumah sakit", "puskesmas", "keamanan", "listrik", "internet", "wifi", "air bersih", "ibadah"],
    "Smart People": ["pendidikan", "sekolah", "pemuda", "pelatihan", "literasi", "kampus", "guru", "beasiswa", "kreatif"],
}
POS = {"bagus", "baik", "mantap", "keren", "bersih", "lancar", "cepat", "puas", "hebat", "mendukung", "maju", "terima kasih", "senang", "rapi"}
NEG = {"buruk", "jelek", "rusak", "macet", "lambat", "kotor", "banjir", "korupsi", "kecewa", "susah", "mahal", "parah", "mati", "bau"}
STOP = set("yang dan di ke dari untuk dengan ini itu ada tidak saja juga sudah lebih sangat agar atau karena pada kita kami mereka bisa masih belum harus".split())
_pipe = None

def clean(t: str) -> str:
    t = re.sub(r"https?://\S+|@\w+|#\w+", " ", t.lower())
    t = re.sub(r"[^a-z0-9\s]", " ", t)  # hapus emoji & simbol
    return re.sub(r"\s+", " ", t).strip()

def _bert():
    global _pipe
    if _pipe is None:
        try:
            from transformers import pipeline
            _pipe = pipeline("text-classification", model="w11wo/indonesian-roberta-base-sentiment-classifier")
        except Exception:
            _pipe = False
    return _pipe

def sentimen(t: str):
    if os.getenv("USE_INDOBERT") == "1" and _bert():
        r = _bert()(t[:512])[0]
        return {"positive": "Positif", "neutral": "Netral", "negative": "Negatif"}.get(r["label"].lower(), "Netral"), round(float(r["score"]), 4)
    s = sum(w in t for w in POS) - sum(w in t for w in NEG)
    return ("Positif" if s > 0 else "Negatif" if s < 0 else "Netral"), 0.6

def pilar(t: str) -> str:
    skor = {k: sum(w in t for w in v) for k, v in PILAR.items()}
    k = max(skor, key=skor.get)
    return k if skor[k] else "Lainnya"

def process(texts):
    out = []
    for raw in texts:
        b = clean(raw)
        s, sk = sentimen(b)
        out.append({"bersih": b, "pilar": pilar(b), "sentimen": s, "skor": sk})
    return out
