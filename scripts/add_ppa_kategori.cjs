const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'peralatan.bekasi2017@gmail.comsproject 2',
  });

  try {
    await conn.query(`
      ALTER TABLE \`ppa\`
      ADD COLUMN IF NOT EXISTS \`kategori\` VARCHAR(50) NOT NULL DEFAULT 'Perbaikan Berkala' AFTER \`no_ppa\`
    `);
    const [cols] = await conn.query('DESCRIBE `ppa`');
    console.log('SUCCESS, cols:', cols.map(c => c.Field));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await conn.end();
  }
}

run();
