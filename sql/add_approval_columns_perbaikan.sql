-- ============================================================
-- Add Approval Columns for Perbaikan Alat System
-- ============================================================

-- Tambah kolom approval untuk perintah kerja (SPK)
ALTER TABLE perbaikan_alat_items 
ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending | approved | rejected',
ADD COLUMN approved_by VARCHAR(50) NULL COMMENT 'User yang menyetujui',
ADD COLUMN approved_at TIMESTAMP NULL COMMENT 'Waktu approval',
ADD COLUMN rejection_reason TEXT NULL COMMENT 'Alasan penolakan';

-- Update kolom approval untuk perintah pemeriksaan (kalau belum lengkap)
ALTER TABLE perbaikan_alat_pemeriksaan
ADD COLUMN approved_by VARCHAR(50) NULL COMMENT 'User yang menyetujui',
ADD COLUMN approved_at TIMESTAMP NULL COMMENT 'Waktu approval',
ADD COLUMN rejection_reason TEXT NULL COMMENT 'Alasan penolakan';

-- Tambah index untuk performance
ALTER TABLE perbaikan_alat_items ADD INDEX idx_status (status);
ALTER TABLE perbaikan_alat_pemeriksaan ADD INDEX idx_status (status);
