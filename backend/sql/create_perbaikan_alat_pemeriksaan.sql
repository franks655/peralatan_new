-- ============================================================
-- Tabel: perbaikan_alat_pemeriksaan
-- Item Perintah Pemeriksaan untuk Perbaikan Alat
-- ============================================================

CREATE TABLE IF NOT EXISTS perbaikan_alat_pemeriksaan (
  id                  CHAR(36)       NOT NULL DEFAULT (UUID()),
  perbaikan_alat_id   CHAR(36)       NOT NULL,
  jenis_perbaikan     VARCHAR(255)   NOT NULL DEFAULT '',
  nama_sparepart      VARCHAR(255)   NOT NULL DEFAULT '' COMMENT 'Nama sparepart/jasa dari dropdown atau isi manual',
  quantity            DECIMAL(12,2)  NOT NULL DEFAULT 1.00,
  harga               DECIMAL(15,2)  NOT NULL DEFAULT 0.00,
  total_harga         DECIMAL(15,2)  AS (quantity * harga) STORED,
  status              VARCHAR(20)    NOT NULL DEFAULT 'pending' COMMENT 'pending | approved',
  created_at          DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at          DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_pap_perbaikan_id (perbaikan_alat_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Item Perintah Pemeriksaan Perbaikan Alat';
