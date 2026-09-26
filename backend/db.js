const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config();
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : "",
  database: process.env.DB_NAME || "peralatan_new",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
  dateStrings: true,   // ← Kembalikan DATE/DATETIME sebagai string "YYYY-MM-DD"
  timezone: '+07:00',  // ← WIB (UTC+7) — sesuai timezone MySQL server lokal

  // ── Fix untuk ETIMEDOUT akibat koneksi idle di-drop shared hosting ──
  enableKeepAlive: true,        // kirim TCP keep-alive supaya koneksi idle tidak dianggap mati
  keepAliveInitialDelay: 10000, // mulai keep-alive setelah 10 detik idle
  connectTimeout: 10000,        // jangan biarkan proses nyangkut lama saat gagal connect
  idleTimeout: 60000,           // pool otomatis buang koneksi yang nganggur > 60 detik
});

// Buang koneksi yang error di background (mis. ECONNRESET/PROTOCOL_CONNECTION_LOST)
// supaya tidak dipakai ulang oleh request berikutnya
pool.on("connection", (conn) => {
  conn.on("error", (err) => {
    console.error("MySQL connection error (auto-dropped from pool):", err.code || err.message);
  });
});

// Test koneksi saat startup
pool
  .getConnection()
  .then((conn) => {
    console.log(
      `✅ MySQL connected to database: ${process.env.DB_NAME || "peralatan_new"} (${process.env.DB_HOST || "localhost"})`,
    );
    conn.release();
  })
  .catch((err) => {
    console.error("❌ MySQL connection failed:", err.message);
  });

module.exports = pool;