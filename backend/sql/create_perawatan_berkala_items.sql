-- ============================================================
-- Tabel: perawatan_berkala_items
-- Item Perintah Kerja untuk Perawatan Berkala
-- ============================================================

CREATE TABLE IF NOT EXISTS perawatan_berkala_items (
  id                   CHAR(36)       NOT NULL DEFAULT (UUID()),
  perawatan_berkala_id CHAR(36)       NOT NULL,
  tanggal              DATE           DEFAULT NULL,
  nama_mekanik         VARCHAR(100)   NOT NULL DEFAULT '',
  rencana_perawatan    VARCHAR(255)   NOT NULL DEFAULT '',
  jenis_perawatan      VARCHAR(255)   NOT NULL DEFAULT '',
  quantity             DECIMAL(12,2)  NOT NULL DEFAULT 1.00,
  harga                DECIMAL(15,2)  NOT NULL DEFAULT 0.00,
  total_harga          DECIMAL(15,2)  AS (quantity * harga) STORED,
  created_at           DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at           DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_pbi_perawatan_id (perawatan_berkala_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Item Perintah Kerja Perawatan Berkala';
