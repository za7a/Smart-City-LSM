-- Migrasi untuk mendukung kuesioner skala 1-5 (mis. Google Forms: Sangat Setuju..Sangat Tidak Setuju)
-- dan penandaan kolom asal teks bebas (mis. "Kritik dan Saran", "Keinginan Masa Depan").
-- Aman dijalankan berkali-kali (IF NOT EXISTS).
ALTER TABLE data_mentah ADD COLUMN IF NOT EXISTS sumber_kolom VARCHAR(100);

CREATE TABLE IF NOT EXISTS survey_likert (
  id SERIAL PRIMARY KEY,
  sumber_id INT NOT NULL,
  responden VARCHAR(20),
  pertanyaan TEXT NOT NULL,
  skor SMALLINT NOT NULL CHECK (skor BETWEEN 1 AND 5),
  kecamatan VARCHAR(100),
  waktu TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sumber_id) REFERENCES data_sumber(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_survey_pertanyaan ON survey_likert(pertanyaan);
