-- Add pekerjaan column to invoice table
ALTER TABLE `invoice` ADD COLUMN `pekerjaan` VARCHAR(255) NULL COMMENT 'Nama pekerjaan/proyek' AFTER `nama_perusahaan`;