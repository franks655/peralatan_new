-- Tabel Invoice untuk menyimpan data invoice sewa alat
CREATE TABLE IF NOT EXISTS `invoice` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `no_invoice` VARCHAR(100) NOT NULL,
  `tanggal` DATE NOT NULL,
  `nama_penyewa` VARCHAR(255) NOT NULL,
  `nama_perusahaan` VARCHAR(255) NOT NULL,
  `pekerjaan` VARCHAR(255) NULL COMMENT 'Nama pekerjaan/proyek',
  `lokasi_proyek_id` VARCHAR(36) NULL,
  `lokasi_proyek` VARCHAR(255) NULL COMMENT 'Lokasi pekerjaan langsung',
  `lokasi_pekerjaan` VARCHAR(255) NULL COMMENT 'Lokasi pekerjaan manual',
  `periode_bulan` INT NOT NULL COMMENT '1-12',
  `periode_tahun` INT NOT NULL COMMENT '2026, dll',
  `lampiran` TEXT NULL COMMENT 'Nama file lampiran yang diupload',
  `keterangan` TEXT NULL,
  `total_invoice` DECIMAL(15, 2) DEFAULT 0,
  `status` VARCHAR(50) DEFAULT 'draft' COMMENT 'draft, sent, paid, cancelled',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_no_invoice` (`no_invoice`),
  INDEX `idx_tanggal` (`tanggal`),
  INDEX `idx_periode` (`periode_bulan`, `periode_tahun`),
  FOREIGN KEY (`lokasi_proyek_id`) REFERENCES `lokasi_proyek`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabel Invoice Items untuk menyimpan detail alat yang di-invoice
CREATE TABLE IF NOT EXISTS `invoice_items` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `invoice_id` VARCHAR(36) NOT NULL,
  `alat_berat_id` VARCHAR(36) NOT NULL,
  `no_lambung` VARCHAR(50) NOT NULL,
  `nama_alat` VARCHAR(255) NOT NULL,
  `qty` INT DEFAULT 1,
  `satuan` VARCHAR(50) DEFAULT 'Unit',
  `harga_sewa` DECIMAL(15, 2) NOT NULL,
  `lama_sewa_jam` DECIMAL(10, 2) NOT NULL COMMENT 'Total jam dari timesheet',
  `satuan_lama_sewa` VARCHAR(50) DEFAULT 'Jam',
  `keterangan` TEXT NULL,
  `total_item` DECIMAL(15, 2) NOT NULL COMMENT 'qty * harga_sewa * lama_sewa_jam',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_invoice_id` (`invoice_id`),
  INDEX `idx_alat_berat_id` (`alat_berat_id`),
  FOREIGN KEY (`invoice_id`) REFERENCES `invoice`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`alat_berat_id`) REFERENCES `alat_berat`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
