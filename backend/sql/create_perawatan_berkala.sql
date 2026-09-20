-- ============================================================
-- Tabel: perawatan_berkala
-- Digunakan pada halaman: Permohonan Perawatan Berkala
-- Kolom utama: no_lambung, nama_alat, km_hm_terakhir,
--              km_hm_saat_ini, lokasi, approval
-- ============================================================

CREATE TABLE IF NOT EXISTS perawatan_berkala (
  id            CHAR(36)       NOT NULL DEFAULT (UUID()),
  created_at    DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at    DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  tanggal       DATE           NOT NULL,
  no_dokumen    VARCHAR(100)   NOT NULL DEFAULT '',
  no_lambung    VARCHAR(100)   NOT NULL DEFAULT '',
  nama_alat     VARCHAR(200)   NOT NULL DEFAULT '',
  km_hm_terakhir DECIMAL(12,2) DEFAULT NULL COMMENT 'KM/HM saat service terakhir',
  km_hm_saat_ini DECIMAL(12,2) DEFAULT NULL COMMENT 'KM/HM saat ini / saat pengajuan',
  lokasi        VARCHAR(200)   DEFAULT NULL,
  keterangan    TEXT           DEFAULT NULL,
  status        VARCHAR(20)    NOT NULL DEFAULT 'pending'   COMMENT 'pending | approved | rejected',
  approved_by   VARCHAR(100)   DEFAULT NULL,
  approved_at   DATETIME       DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_perawatan_tanggal    (tanggal),
  KEY idx_perawatan_no_lambung (no_lambung),
  KEY idx_perawatan_status     (status)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Permohonan Perawatan Berkala';
