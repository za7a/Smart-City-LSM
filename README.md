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

