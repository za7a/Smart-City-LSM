# Smart City Lhokseumawe – Dashboard Analisis Survei

Dashboard yang menampilkan hasil analisis (sentimen + pilar Smart City) dari komentar Instagram dan jawaban Google Forms/survei lain.
**Stack:** React (Vite) + Tailwind + Recharts · FastAPI · PostgreSQL. Mendukung mode terang (putih cerah) dan gelap.

```
smartcity-lhokseumawe/
├─ database/schema.sql        # skema PostgreSQL (untuk database baru)
├─ database/migrations/       # migrasi bertahap untuk database yang sudah pernah dibuat
├─ docker-compose.yml         # PostgreSQL via Docker (opsional)
├─ sample-data/               # contoh CSV untuk uji impor
├─ scripts/                    # skrip mandiri, mis. tarik_komentar_instagram.py
├─ prototype/                 # prototipe HTML mandiri (buka langsung di browser, tanpa server)
├─ backend/  (FastAPI: app/main.py, nlp.py, scraper.py, seed.py, db.py)
├─ frontend/ (React: src/pages, src/components, src/theme.js)
└─ .vscode/  (extensions, launch, tasks)
```

## 1. Prasyarat
Node.js 18+, Python 3.10+, dan PostgreSQL 14+ (atau Docker). Git opsional.

## 2. Buka di VS Code
1. Ekstrak zip, lalu `File > Open Folder…` pilih `smartcity-lhokseumawe`.
2. Terima saran memasang ekstensi (Python, Pylance, Tailwind CSS IntelliSense, ES7 React snippets, Database Client).
3. Buka 2 terminal (`Ctrl+Shift+\``): satu untuk backend, satu untuk frontend.

## 3. Database PostgreSQL
**Opsi A – Docker (paling mudah):**
```
docker compose up -d
```
Database `smartcity` dan seluruh tabel dibuat otomatis. Lewati ke langkah 4.

**Opsi B – PostgreSQL terpasang di komputer:**
```
psql -U postgres -c "CREATE DATABASE smartcity;"
psql -U postgres -d smartcity -f database/schema.sql
```
(Windows: buka "SQL Shell (psql)" atau pakai pgAdmin: klik kanan Databases > Create > Database `smartcity`, lalu Query Tool > buka `database/schema.sql` > Execute.)

**Cek tabel:** `psql -U postgres -d smartcity -c "\dt"` harus menampilkan `admins`, `data_sumber`, `data_mentah`, `data_nlp`.

**Sudah pernah membuat database sebelum fitur kecamatan/kuesioner skala ditambahkan?** Jalankan migrasi berikut sekali saja, berurutan (aman diulang):
```
psql -U postgres -d smartcity -f database/migrations/001_tambah_kecamatan.sql
psql -U postgres -d smartcity -f database/migrations/002_tambah_survey_likert.sql
```
(Database baru tidak perlu ini — `schema.sql` sudah termasuk semuanya.)
Di VS Code Anda juga bisa memakai ekstensi Database Client: Add Connection > PostgreSQL > host `localhost`, port `5432`, user `postgres`, database `smartcity`.

**Tabel dan alurnya:** `admins` (akun login) → `data_sumber` (log pengambilan) → `data_mentah` (komentar asli, username disamarkan `User_0001`) → `data_nlp` (teks bersih, pilar, sentimen, skor, `is_verified`).

## 4. Backend
```
cd backend
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env            # macOS/Linux: cp .env.example .env
```
Edit `.env`: pastikan `DATABASE_URL=postgresql+psycopg2://postgres:PASSWORD@localhost:5432/smartcity` (password dengan simbol khusus harus di-URL-encode, misalnya `@` menjadi `%40`), ganti `JWT_SECRET` dengan teks acak panjang, dan ubah `ADMIN_PASSWORD`.
```
python -m app.seed --demo         # membuat akun admin + 10 data contoh
uvicorn app.main:app --reload --port 8000
```
Tes: buka http://localhost:8000/docs. Di VS Code: `Ctrl+Shift+P > Python: Select Interpreter` pilih `.venv`, lalu tekan F5 (konfigurasi "Backend FastAPI (debug)") untuk debug dengan breakpoint.

## 5. Frontend
```
cd frontend
npm install
npm run dev                        # http://localhost:5173
```
Permintaan `/api` otomatis diteruskan ke `localhost:8000` (lihat `vite.config.js`). Build produksi: `npm run build` (hasil di `frontend/dist`).
Jalan cepat dari VS Code: `Ctrl+Shift+P > Tasks: Run Task > jalankan semua`.

## 6. Cara memakai
1. Buka http://localhost:5173, tekan ikon bulan/matahari di navbar untuk mode gelap/terang (pilihan tersimpan).
2. **Login Admin** (`admin` dan password dari `.env`).
3. **Mengambil Data:** tempel URL postingan Instagram lalu Mulai Scraping, atau unggah CSV. Kolom yang dikenali otomatis:
   - `teks` / `komentar` — komentar biasa (opsional, kompatibel dengan format CSV lama).
   - `waktu` (format `YYYY-MM-DD`) dan `kecamatan` — opsional, berlaku untuk semua baris.
   - **Kolom lain berisi angka 1-5** (mis. hasil ekspor Google Forms berjudul pernyataan lengkap seperti "Layanan publik ... sudah cepat dan responsif") otomatis dikenali sebagai **jawaban kuesioner skala** dan disimpan terpisah (tabel `survey_likert`), bukan diproses lewat NLP.
   - **Kolom teks bebas lain** (mis. "Kritik dan Saran", "Keinginan Masa Depan untuk Kota Lhokseumawe") otomatis diperlakukan sama seperti komentar biasa: masuk ke `data_mentah` dan ikut dianalisis pilar + sentimennya di Data Learning.
   - Contoh: `sample-data/contoh-komentar.csv` (format sederhana lama) dan `sample-data/contoh-survei-kuesioner.csv` (format lengkap ala Google Forms). Komentar dari Instagram tidak membawa info kecamatan, jadi kolom itu tetap kosong kecuali diisi manual.
4. **Data Learning:** halaman ini menampilkan jumlah data (total, sudah diproses NLP, terverifikasi, belum diverifikasi) dan tabel 50 baris per halaman dengan tombol Sebelumnya/Selanjutnya. Klik Jalankan Model NLP, koreksi pilar/sentimen bila perlu lalu Simpan (menjadi Terverifikasi), atau klik **Verifikasi Semua Data** (di bawah tombol Jalankan Model NLP) untuk menerima semua label NLP apa adanya. **Hanya data yang sudah diverifikasi yang ikut dihitung di analisis Beranda**, jadi setelah `seed --demo` Beranda akan kosong sampai data diverifikasi. Kecamatan tidak ditebak dan tidak bisa diedit di sini; kecamatan hanya berasal dari kolom `kecamatan` pada CSV survei.
5. **Beranda:** filter tanggal dan pilar berlaku ke grafik "Jumlah komentar berdasarkan topik", sentimen, kata yang sering disebut, dan kartu 6 pilar. Bagian **"Hasil kuesioner (skala 1-5)"** punya dropdown **kecamatan pengisi** sendiri di pojok kiri atas kotaknya (hanya berlaku untuk hasil kuesioner) dan menampilkan persentase Setuju/Sangat Setuju per pernyataan. Klik kartu pilar untuk memfilter dengan cepat.

## 6b. Soal kuesioner skala 1-5 (Sangat Setuju..Sangat Tidak Setuju)
Jawaban berskala (angka) tidak diproses oleh model NLP — jawaban seperti itu sudah berupa data terstruktur, jadi cukup dihitung rata-rata/persentasenya langsung (lihat fungsi `dashboard()` di `backend/app/main.py`). Model NLP (sentimen + pilar) hanya berjalan pada kolom teks bebas seperti "Kritik dan Saran" atau "Keinginan Masa Depan", persis seperti memperlakukan komentar Instagram. Skala di sistem ini memakai urutan 1=Sangat Setuju .. 5=Sangat Tidak Setuju sesuai definisi soal; kalau Google Forms Anda memakai urutan sebaliknya (1=Sangat Tidak Setuju), balik dulu urutannya di kolom CSV, atau sesuaikan perhitungan `persen_setuju`/`persen_tidak_setuju` di endpoint `/api/dashboard`.

## 7. Opsional
- **IndoBERT:** `pip install transformers torch`, lalu `USE_INDOBERT=1` di `.env` (unduhan model pertama kali cukup besar).
- **Instagram (Apify):** komentar diambil lewat layanan Apify (actor `apify/instagram-comment-scraper`), cukup dengan menempel URL postingan/reel Instagram yang publik.
  1. Daftar di https://apify.com dan salin API token dari Settings > Integrations.
  2. Isi `APIFY_API_TOKEN` di `backend/.env`, lalu `pip install -r requirements.txt` (memasang `apify-client`).
  3. Di halaman **Mengambil Data**, tempel URL lalu klik Mulai Scraping. Prosesnya berjalan di latar belakang dan bisa beberapa saat.
  4. Apify berbasis pemakaian (ada kuota gratis terbatas); cek harga dan ketentuan terbarunya di situs Apify. Jumlah komentar per pengambilan dibatasi 100 (`limit_per_page` di `scraper.py`).
  5. Untuk pengambilan manual di luar aplikasi, ada `scripts/tarik_komentar_instagram.py` yang menghasilkan CSV siap diunggah lewat halaman Mengambil Data:
     ```
     cd backend
     python ../scripts/tarik_komentar_instagram.py <URL_POSTINGAN_ATAU_REEL>
     ```
     (perlu `pandas`: `pip install pandas`)
- **Google Forms:** ekspor jawaban ke CSV lalu unggah (sinkronisasi API otomatis belum ada).

## 8. Backup dan pemulihan database
```
pg_dump -U postgres smartcity > backup.sql
psql -U postgres -d smartcity -f backup.sql      # pulihkan ke database kosong
```
Reset total: `docker compose down -v` (Docker) atau `DROP DATABASE smartcity;` lalu ulangi langkah 3.

## 9. Masalah umum
| Gejala | Solusi |
|---|---|
| `connection refused` / `password authentication failed` | Pastikan PostgreSQL berjalan dan `DATABASE_URL` di `.env` benar |
| Login admin gagal | Jalankan ulang `python -m app.seed` (mengatur ulang password sesuai `.env`) |
| Beranda kosong | Belum ada data: jalankan `python -m app.seed --demo` atau impor CSV lalu Jalankan Model NLP |
| Halaman blank / error 404 pada `/api` | Backend belum jalan di port 8000 |
| `pip` gagal memasang `psycopg2-binary` | Perbarui pip, atau pakai Python 3.10–3.12 |

## 10. Catatan keamanan sebelum dipakai publik
Ganti `JWT_SECRET` dan password admin, pakai HTTPS, batasi `CORS_ORIGINS` ke domain Anda, dan jangan commit file `.env`.
