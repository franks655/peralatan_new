-- =====================================================================
-- Migration: Add E-toll fields to database_biaya_kendaraan
-- =====================================================================
-- Jalankan di phpMyAdmin untuk menambahkan kolom gerbang_masuk dan gerbang_keluar
-- =====================================================================

-- Tambahkan kolom gerbang_masuk dan gerbang_keluar jika belum ada
ALTER TABLE database_biaya_kendaraan 
ADD COLUMN IF NOT EXISTS gerbang_masuk VARCHAR(255) AFTER keterangan,
ADD COLUMN IF NOT EXISTS gerbang_keluar VARCHAR(255) AFTER gerbang_masuk;
