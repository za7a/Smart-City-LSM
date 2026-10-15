CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL,
  last_login TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS data_sumber (
  id SERIAL PRIMARY KEY,
  jenis_sumber VARCHAR(50) NOT NULL CHECK (jenis_sumber IN ('Instagram','Google Form','File Lokal')),
  url_atau_referensi TEXT, tanggal_diambil TIMESTAMP DEFAULT CURRENT_TIMESTAMP, admin_id INT,
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL);
CREATE TABLE IF NOT EXISTS data_mentah (
  id SERIAL PRIMARY KEY, sumber_id INT NOT NULL, teks_asli TEXT NOT NULL, username_anonim VARCHAR(100),
  kecamatan VARCHAR(100), -- opsional: diisi dari kolom "kecamatan" di CSV survei; kosong untuk komentar Instagram
  sumber_kolom VARCHAR(100), -- nama kolom asal pada CSV survei (mis. "Kritik dan Saran"); NULL untuk komentar biasa
  waktu_komentar TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sumber_id) REFERENCES data_sumber(id) ON DELETE CASCADE);

-- Jawaban kuesioner skala 1-5 (1=Sangat Setuju ... 5=Sangat Tidak Setuju). Dipisah dari data_mentah
-- karena berupa angka terstruktur, bukan teks bebas -- tidak diproses lewat model NLP.
CREATE TABLE IF NOT EXISTS survey_likert (
  id SERIAL PRIMARY KEY,
  sumber_id INT NOT NULL,
  responden VARCHAR(20), -- disamarkan otomatis, mis. Responden_0001 (untuk privasi)
  pertanyaan TEXT NOT NULL, -- teks pernyataan, biasanya persis judul kolom dari ekspor Google Forms
  skor SMALLINT NOT NULL CHECK (skor BETWEEN 1 AND 5),
  kecamatan VARCHAR(100),
  waktu TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sumber_id) REFERENCES data_sumber(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS data_nlp (
  id SERIAL PRIMARY KEY, data_mentah_id INT UNIQUE NOT NULL, teks_bersih TEXT,
  kategori_pilar VARCHAR(50) CHECK (kategori_pilar IN ('Smart Governance','Smart Environment','Smart Mobility','Smart Economy','Smart Living','Smart People','Lainnya')),
  nilai_sentimen VARCHAR(20) CHECK (nilai_sentimen IN ('Positif','Netral','Negatif')),
  skor_akurasi_model NUMERIC(5,4), is_verified BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (data_mentah_id) REFERENCES data_mentah(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_kategori ON data_nlp(kategori_pilar);
CREATE INDEX IF NOT EXISTS idx_sentimen ON data_nlp(nilai_sentimen);
CREATE INDEX IF NOT EXISTS idx_tanggal ON data_mentah(waktu_komentar);
CREATE INDEX IF NOT EXISTS idx_kecamatan ON data_mentah(kecamatan);
CREATE INDEX IF NOT EXISTS idx_survey_pertanyaan ON survey_likert(pertanyaan);
