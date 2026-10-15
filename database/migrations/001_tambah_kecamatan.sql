-- Migrasi untuk database yang sudah dibuat sebelum fitur filter kecamatan ditambahkan.
-- Aman dijalankan berkali-kali (IF NOT EXISTS).
ALTER TABLE data_mentah ADD COLUMN IF NOT EXISTS kecamatan VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_kecamatan ON data_mentah(kecamatan);
