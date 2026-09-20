-- =====================================================================
-- Migration: Database Pengeluaran Biaya Kendaraan (MySQL/MariaDB)
-- =====================================================================
-- Jalankan di phpMyAdmin
-- =====================================================================

CREATE TABLE IF NOT EXISTS database_biaya_kendaraan (
  id CHAR(36) NOT NULL,
  
  -- Nomor Polisi kendaraan (disimpan sebagai teks, tidak FK keras ke
  -- database_kendaraan, konsisten dengan pola kegiatan_mekanik di project ini
  -- supaya histori biaya tetap ada walau data kendaraan induk berubah/dihapus)
  no_lambung VARCHAR(50) NOT NULL,
  
  tanggal DATE NOT NULL DEFAULT (CURRENT_DATE),
  jenis_perawatan VARCHAR(255),
  nama_barang_jasa VARCHAR(255) NOT NULL,
  
  volume DECIMAL(12,2) NOT NULL DEFAULT 1,
  satuan VARCHAR(50),
  harga_satuan DECIMAL(14,2) NOT NULL DEFAULT 0,
  
  -- Total dihitung otomatis oleh database (MySQL 5.7+ computed column)
  total DECIMAL(14,2) GENERATED ALWAYS AS (ROUND(volume * harga_satuan, 2)) STORED,
  
  tempat VARCHAR(255),
  keterangan TEXT,
  
  -- Khusus untuk E-toll
  gerbang_masuk VARCHAR(255),
  gerbang_keluar VARCHAR(255),
  
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comment untuk tabel
ALTER TABLE database_biaya_kendaraan COMMENT = 'Riwayat pengeluaran biaya per kendaraan (BBM, service, e-toll, dll).';

-- Index untuk performa
CREATE INDEX idx_biaya_kendaraan_no_lambung ON database_biaya_kendaraan (no_lambung);
CREATE INDEX idx_biaya_kendaraan_tanggal ON database_biaya_kendaraan (tanggal DESC);

-- Trigger untuk UUID otomatis (MySQL tidak punya UUID() native seperti PostgreSQL)
DELIMITER $$

CREATE TRIGGER trg_biaya_kendaraan_before_insert
BEFORE INSERT ON database_biaya_kendaraan
FOR EACH ROW
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    SET NEW.id = UUID();
  END IF;
END$$

DELIMITER ;

-- Catatan untuk Row Level Security:
-- MySQL tidak memiliki Row Level Security seperti PostgreSQL.
-- Jika Anda butuh kontrol akses, implementasikan di level aplikasi
-- atau gunakan MySQL views dengan WHERE clause sesuai kebutuhan.
