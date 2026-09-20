-- Menambahkan kolom harga_sewa ke tabel alat_berat
-- Jalankan di phpMyAdmin Rumah Web

ALTER TABLE `alat_berat` 
ADD COLUMN `harga_sewa` DECIMAL(15, 2) NULL 
COMMENT 'Harga sewa alat berat per unit (jika sewa)' 
AFTER `keterangan`;

-- Update data existing jika ada nilai kepemilikan = 'Sewa' dengan default harga
-- (Opsional - uncomment jika ingin set default value)
-- UPDATE `alat_berat` SET `harga_sewa` = 0 WHERE `kepemilikan` = 'Sewa' AND `harga_sewa` IS NULL;
