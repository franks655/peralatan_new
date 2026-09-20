export interface AlatPendukung {
  id: string;
  namaAlat: string;
  noLambung?: string | null;
  jenisAlat?: string | null;
  tahunPerolehan?: number | null;
  nilaiPerolehan?: number | null;
  lokasi?: string | null;
  status?: string | null;
  keterangan?: string | null;
  merk?: string | null;
  tipe?: string | null;
  kondisi?: string | null;
  serviceTerakhir?: string | null;
  serviceBerikutnya?: string | null;
  gambar?: string | null;
  foto?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Kendaraan {
  id: string;
  /** Nama bebas (opsional di form). Jika kosong, otomatis diisi dari Merk + Type. */
  namaAlat: string;
  /** Nomor Polisi (plat) */
  noLambung?: string | null;
  jenisAlat?: string | null;
  tahunPerolehan?: number | null;
  nilaiPerolehan?: number | null;
  lokasi?: string | null;
  status?: string | null;
  keterangan?: string | null;
  merk?: string | null;
  tipe?: string | null;
  kondisi?: string | null;
  serviceTerakhir?: string | null;
  serviceBerikutnya?: string | null;
  gambar?: string | null;
  foto?: string | null;

  // ---- Kolom baru (data STNK / BPKB) ----
  namaPemilik?: string | null;
  alamatPemilik?: string | null;
  model?: string | null;
  tahunPembuatan?: number | null;
  isiSilinder?: number | null;
  nomorRangka?: string | null;
  nomorMesin?: string | null;
  warnaTnkb?: string | null;
  tahunRegistrasi?: number | null;
  nomorBpkb?: string | null;
  /** Format YYYY-MM-DD */
  tglBerlakuStnk?: string | null;
  /** Format YYYY-MM-DD */
  tglBerlakuPajak?: string | null;
  pengguna?: string | null;

  created_at?: string | null;
  updated_at?: string | null;
}

export interface AlatBerat {
  id: string;
  no_lambung: string;
  nama_alat: string;
  jenis_alat?: string;
  tahun_perolehan?: number;
  nilai_perolehan?: number;
  lokasi?: string;
  lokasi_saat_ini?: string;
  lokasi_sebelum?: string;
  lokasi_sebelumnya?: string;
  kepemilikan?: string;
  status?: string;
  keterangan?: string;
  merk?: string;
  tipe?: string;
  noSeri?: string;
  kondisi?: string;
  serviceTerakhir?: string;
  serviceBerikutnya?: string;
  foto?: string | null;
  harga_sewa?: number;
  created_at?: string;
  updated_at?: string;
}

export interface BBMData {
  id: string;
  tanggalPembelian: Date;
  volumePembelian: number;
  hargaPerLiter: number;
  tanggalPemakaian: Date | null;
  volumePemakaian: number;
  keteranganPemakaian: string;
  namaAlatBerat: string;
  lokasiProyek?: string;
  totalHarga?: number;
}

export interface KegiatanMekanik {
  id?: string;
  user_id?: string | undefined;
  tanggal: Date | string;
  no_ppa: string | null;
  no_lambung: string;
  nama_alat: string | null;
  nama_mekanik: string;
  lokasi_pekerjaan: string;
  keterangan: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface LokasiProyek {
  id: string;
  namaProyek: string;
  lokasi: string;
  tanggalMulaiProyek?: string | null;
  kepalaProyek?: string | null;
  keterangan?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  alat_berat_id: string;
  no_lambung: string;
  nama_alat: string;
  qty: number;
  satuan: string;
  harga_sewa: number;
  lama_sewa_jam: number;
  satuan_lama_sewa: string;
  keterangan?: string;
  total_item: number;
  created_at?: string;
  updated_at?: string;
}

export interface Invoice {
  id?: string;
  no_invoice: string;
  tanggal: string;
  nama_penyewa: string;
  nama_perusahaan: string;
  pekerjaan?: string;
  lokasi_proyek_id?: string;
  lokasi_proyek?: string;
  lokasi_pekerjaan?: string;
  periode_bulan: number;
  periode_tahun: number;
  lampiran?: string;
  keterangan?: string;
  total_invoice: number;
  status: string;
  items?: InvoiceItem[];
  created_at?: string;
  updated_at?: string;
}

export interface BiayaKendaraan {
  id: string;
  noLambung: string;
  tanggal: string;
  jenisPerawatan?: string | null;
  namaBarangJasa: string;
  volume: number;
  satuan?: string | null;
  hargaSatuan: number;
  total?: number | null;
  tempat?: string | null;
  keterangan?: string | null;
  gerbangMasuk?: string | null;
  gerbangKeluar?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}