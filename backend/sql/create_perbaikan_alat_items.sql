-- ============================================================
-- Tabel: perbaikan_alat_items
-- Item Perintah Kerja (SPK) untuk Perbaikan Alat
-- ============================================================

CREATE TABLE IF NOT EXISTS perbaikan_alat_items (
  id                  CHAR(36)       NOT NULL DEFAULT (UUID()),
  perbaikan_alat_id   CHAR(36)       NOT NULL,
  jenis_perbaikan     VARCHAR(255)   NOT NULL DEFAULT '',
  nama_sparepart      VARCHAR(255)   NOT NULL DEFAULT '' COMMENT 'Nama sparepart/jasa dari dropdown atau isi manual',
  quantity            DECIMAL(12,2)  NOT NULL DEFAULT 1.00,
  stock               DECIMAL(12,2)  NOT NULL DEFAULT 0.00 COMMENT 'Stock tersedia saat ini',
  harga_satuan        DECIMAL(15,2)  NOT NULL DEFAULT 0.00,
  total_harga         DECIMAL(15,2)  AS (quantity * harga_satuan) STORED,
  created_at          DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at          DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_pai_perbaikan_id (perbaikan_alat_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Item Perintah Kerja (SPK) Perbaikan Alat';
