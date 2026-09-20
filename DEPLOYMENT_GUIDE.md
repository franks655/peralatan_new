# Deployment Guide: Frontend & Database di Rumah Web, Backend di Railway

## Arsitektur
- **Frontend**: Rumah Web (cPanel - public_html)
- **Database**: Rumah Web (MySQL - peralatan_new)
- **Backend**: Railway (Express + MySQL2)

---

## Langkah-langkah Deployment

### 1. Deploy Backend ke Railway

#### 1.1 Push Code ke GitHub
```bash
cd C:\Users\HP\Documents\Peralatan\peralatan_new
git add .
git commit -m "feat: prepare for railway deployment"
git push
```

#### 1.2 Setup Railway Project
1. Buka [railway.app](https://railway.app)
2. Login dan buat project baru
3. Connect ke GitHub repository: `franks655/peralatan_new`
4. Pilih backend branch
5. Set build command: `cd backend && npm install`
6. Set start command: `cd backend && node server.js`

#### 1.3 Set Environment Variables di Railway
Tambahkan environment variables di Railway → Settings → Variables:

```
DB_HOST=rumah-web-mysql-host.com
DB_PORT=3306
DB_USER=inty8713_divisi_peralatan
DB_PASSWORD=your_rumah_web_mysql_password
DB_NAME=peralatan_new
PORT=3001
```

**CATATAN PENTING:** 
- `DB_HOST`: Dapatkan dari cPanel → Remote MySQL atau database hostname di cPanel
- `DB_USER`: User database Anda di Rumah Web
- `DB_PASSWORD`: Password database Anda di Rumah Web
- `DB_NAME`: `peralatan_new`

#### 1.4 Deploy
Click "Deploy" di Railway. Tunggu sampai deployment selesai.

#### 1.5 Dapatkan Railway Backend URL
Setelah deploy berhasil, Railway akan memberikan URL seperti:
`https://your-project-name.up.railway.app` atau custom domain jika di-set.

---

### 2. Konfigurasi Database di Rumah Web

#### 2.1 Izinkan Remote MySQL Connection
1. Login ke cPanel Rumah Web
2. Buka **Remote MySQL** (biasanya di bagian Databases)
3. Tambahkan Railway IP address untuk allow remote connection
   - Jika Railway IP statis: tambahkan IP tersebut
   - Jika Railway IP dinamis: tambahkan `%` untuk allow dari semua IP (kurang aman tapi lebih mudah)
   - Atau hubungi support Rumah Web untuk info IP range Railway

#### 2.2 Pastikan Database `peralatan_new` Sudah Ada
Database `peralatan_new` sudah dibuat dan data sudah di-import dari SQL file yang sudah diperbaiki.

---

### 3. Build Frontend untuk Production

#### 3.1 Update Railway Backend URL di .env.production
File `.env.production` sudah dibuat dengan placeholder:
```
VITE_API_URL=https://your-railway-backend-url.railway.app
```

**Ganti** `https://your-railway-backend-url.railway.app` dengan Railway backend URL yang Anda dapatkan dari langkah 1.5.

#### 3.2 Build Frontend
```bash
cd C:\Users\HP\Documents\Peralatan\peralatan_new
npm run build
```

Hasil build akan ada di folder `dist/`.

---

### 4. Upload Frontend ke Rumah Web

#### 4.1 Upload File
1. Buka File Manager di cPanel Rumah Web
2. Buka folder `public_html`
3. Buat subfolder baru (misal: `peralatan`) atau upload langsung ke `public_html`
4. Upload semua isi folder `dist/` ke folder yang dipilih

#### 4.2 Verifikasi
Buka URL: `https://your-domain.com/peralatan/` (atau sesuai folder yang dipilih)

---

## Checklist Manual yang Perlu Diubah

### Di Repository Lokal:
1. ✅ `.env.production` - Update `VITE_API_URL` dengan Railway backend URL
2. ✅ Build frontend dengan `npm run build`
3. ✅ Upload hasil build ke `public_html` di Rumah Web

### Di Railway:
1. ✅ Set environment variables (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`)
2. ✅ Deploy backend
3. ✅ Catat Railway backend URL

### Di Rumah Web (cPanel):
1. ✅ Import database `peralatan_new` dari SQL file (sudah selesai)
2. ✅ Create view `v_silo_dokumen` dengan SQL yang sudah diperbaiki
3. ✅ Allow remote MySQL connection untuk Railway IP
4. ✅ Upload frontend build ke `public_html`

---

## Troubleshooting

### Backend Railway tidak bisa connect ke database Rumah Web:
- Pastikan Remote MySQL sudah di-enable di cPanel
- Cek firewall di Rumah Web tidak memblokir Railway IP
- Test connection dari Railway ke database menggunakan tool Railway Connect

### Frontend tidak bisa connect ke backend Railway:
- Pastikan `VITE_API_URL` di `.env.production` sudah benar
- Cek Railway backend sudah berjalan dan dapat diakses
- Cek CORS di backend (seharusnya sudah ada `cors` middleware)

### View error saat import database:
- Gunakan SQL view yang sudah diperbaiki (tanpa DEFINER atau dengan user yang benar)
- Import tabel dulu, baru create view manual setelah itu

---

## Contoh Environment Variables Railway

```
DB_HOST=intanciptaperdana.id
DB_PORT=3306
DB_USER=inty8713_divisi_peralatan
DB_PASSWORD=your_password_here
DB_NAME=peralatan_new
PORT=3001
```

**CATATAN:** Ganti dengan nilai actual dari cPanel Rumah Web Anda.
