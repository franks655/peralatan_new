const db = require('./db');

async function createLokasiProyek() {
  const sql = `
    CREATE TABLE IF NOT EXISTS \`lokasi_proyek\` (
      \`id\` VARCHAR(36) NOT NULL PRIMARY KEY,
      \`nama_proyek\` VARCHAR(255) NOT NULL,
      \`lokasi\` VARCHAR(255) NOT NULL,
      \`tanggal_mulai_proyek\` DATE NULL,
      \`kepala_proyek\` VARCHAR(255) NULL,
      \`keterangan\` TEXT NULL,
      \`status\` VARCHAR(50) DEFAULT 'aktif',
      \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await db.query(sql);
    console.log('✅ Tabel lokasi_proyek berhasil dibuat / sudah ada di database.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Gagal membuat tabel lokasi_proyek:', err);
    process.exit(1);
  }
}

createLokasiProyek();
