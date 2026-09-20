-- ============================================================
-- Tabel: perbaikan_alat
-- Digunakan pada halaman: Permohonan Perbaikan Alat
-- ============================================================

CREATE TABLE IF NOT EXISTS perbaikan_alat (
  id            CHAR(36)       NOT NULL DEFAULT (UUID()),
  created_at    DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at    DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  tanggal       DATE           NOT NULL,
  no_dokumen    VARCHAR(100)   NOT NULL DEFAULT '',
  no_lambung    VARCHAR(100)   NOT NULL DEFAULT '',
  nama_alat     VARCHAR(200)   NOT NULL DEFAULT '',
  lokasi        VARCHAR(200)   DEFAULT NULL,
  kerusakan     TEXT           DEFAULT NULL COMMENT 'Deskripsi kerusakan / keluhan',
  status        VARCHAR(20)    NOT NULL DEFAULT 'pending' COMMENT 'pending | approved | rejected',
  approved_by   VARCHAR(100)   DEFAULT NULL,
  approved_at   DATETIME       DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_perbaikan_alat_tanggal    (tanggal),
  KEY idx_perbaikan_alat_no_lambung (no_lambung),
  KEY idx_perbaikan_alat_status     (status)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Permohonan Perbaikan Alat';
