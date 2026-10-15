"""Skrip mandiri: tarik komentar satu postingan/reel Instagram lewat Apify,
lalu simpan ke CSV yang formatnya sudah cocok untuk diunggah lewat halaman
"Mengambil Data" (kolom teks/waktu dikenali otomatis oleh importer CSV).

Jalankan dari folder backend/ (supaya .env dan modul app/ ikut terbaca), contoh:
    cd backend
    python ../scripts/tarik_komentar_instagram.py <URL_POSTINGAN_ATAU_REEL>

Perlu APIFY_API_TOKEN di backend/.env (lihat README.md bagian "Instagram (Apify)").
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

import pandas as pd
from app import scraper


def main():
    if len(sys.argv) < 2:
        print("Pemakaian: python tarik_komentar_instagram.py <URL_POSTINGAN_ATAU_REEL>")
        sys.exit(1)

    target = sys.argv[1]
    rows = scraper.scrape_comments(target)  # [(teks, waktu_datetime_atau_None), ...]

    df = pd.DataFrame(
        [{"teks": t, "waktu": w.strftime("%Y-%m-%d") if w else ""} for t, w in rows]
    )
    out = "komentar_smart_city_lhokseumawe.csv"
    df.to_csv(out, index=False, encoding="utf-8-sig")

    print(f"Total komentar: {len(df)}")
    print(df.head())
    print(f"\nTersimpan di: {out}")
    print('Unggah file ini lewat halaman "Mengambil Data" di dashboard untuk memprosesnya.')


if __name__ == "__main__":
    main()
