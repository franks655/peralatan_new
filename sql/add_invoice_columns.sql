-- Add pekerjaan and lokasi columns to invoice table
ALTER TABLE `invoice` 
ADD COLUMN `pekerjaan` VARCHAR(255) NULL COMMENT 'Nama pekerjaan/proyek' AFTER `nama_perusahaan`,
ADD COLUMN `lokasi` VARCHAR(255) NULL COMMENT 'Lokasi pekerjaan (manual atau otomatis dari lokasi_proyek)' AFTER `lokasi_proyek_id`;