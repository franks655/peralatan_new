import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/api/client';
import type { Kendaraan } from '@/types';

const QUERY_KEY = ['database-kendaraan'];

/* ------------------------------------------------------------------ */
/* Helper                                                              */
/* ------------------------------------------------------------------ */

const txt = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

const intOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

/** DB (snake_case) -> aplikasi (camelCase) */
const fromDb = (item: any): Kendaraan => ({
  id: item.id,
  noLambung: item.no_lambung || null,
  namaAlat: item.nama_alat,
  jenisAlat: item.jenis_alat,
  tahunPerolehan: item.tahun_perolehan || null,
  nilaiPerolehan: item.nilai_perolehan || null,
  lokasi: item.lokasi || null,
  status: item.status || null,
  keterangan: item.keterangan || null,
  merk: item.merk || null,
  tipe: item.tipe || null,
  kondisi: item.kondisi || null,
  serviceTerakhir: item.service_terakhir || null,
  serviceBerikutnya: item.service_berikutnya || null,
  gambar: item.gambar || null,
  foto: item.foto || null,

  // kolom baru
  namaPemilik: item.nama_pemilik || null,
  alamatPemilik: item.alamat_pemilik || null,
  model: item.model || null,
  tahunPembuatan: item.tahun_pembuatan ?? null,
  isiSilinder: item.isi_silinder ?? null,
  nomorRangka: item.nomor_rangka || null,
  nomorMesin: item.nomor_mesin || null,
  warnaTnkb: item.warna_tnkb || null,
  tahunRegistrasi: item.tahun_registrasi ?? null,
  nomorBpkb: item.nomor_bpkb || null,
  tglBerlakuStnk: item.tgl_berlaku_stnk || null,
  tglBerlakuPajak: item.tgl_berlaku_pajak || null,
  pengguna: item.pengguna || null,

  created_at: item.created_at,
  updated_at: item.updated_at,
});

/** Aplikasi -> DB. Dipakai bersama oleh insert & update agar tidak ada kolom yang terlewat. */
const toDbPayload = (d: Omit<Kendaraan, 'id'>) => ({
  no_lambung: txt(d.noLambung),
  // nama_alat kemungkinan NOT NULL & dipakai halaman lain -> isi otomatis bila kosong
  nama_alat:
    txt(d.namaAlat) ||
    [txt(d.merk), txt(d.tipe)].filter(Boolean).join(' ') ||
    txt(d.noLambung),
  jenis_alat: txt(d.jenisAlat),

  nama_pemilik: txt(d.namaPemilik),
  alamat_pemilik: txt(d.alamatPemilik),
  model: txt(d.model),
  tahun_pembuatan: intOrNull(d.tahunPembuatan),
  isi_silinder: intOrNull(d.isiSilinder),
  nomor_rangka: txt(d.nomorRangka),
  nomor_mesin: txt(d.nomorMesin),
  warna_tnkb: txt(d.warnaTnkb),
  tahun_registrasi: intOrNull(d.tahunRegistrasi),
  nomor_bpkb: txt(d.nomorBpkb),
  tgl_berlaku_stnk: txt(d.tglBerlakuStnk),
  tgl_berlaku_pajak: txt(d.tglBerlakuPajak),
  pengguna: txt(d.pengguna),

  tahun_perolehan: d.tahunPerolehan || null,
  nilai_perolehan: d.nilaiPerolehan || null,
  lokasi: txt(d.lokasi),
  status: txt(d.status) || 'aktif',
  keterangan: txt(d.keterangan),
  merk: txt(d.merk),
  tipe: txt(d.tipe),
  kondisi: txt(d.kondisi) || 'Baik',
  service_terakhir: txt(d.serviceTerakhir),
  service_berikutnya: txt(d.serviceBerikutnya),
  gambar: txt(d.gambar),
  foto: txt(d.foto),
});

const assertValid = (d: Omit<Kendaraan, 'id'>) => {
  if (!txt(d.noLambung)) {
    throw new Error('Nomor Polisi tidak boleh kosong');
  }
};

const translateDbError = (error: any): Error => {
  console.error('Supabase error:', error?.code, error?.message, error?.details);
  if (error?.code === '23505' || error?.message?.includes('Duplicate')) {
    return new Error(`Duplikat data: nomor polisi/rangka sudah ada (${error.details || error.message})`);
  }
  if (error?.code === '23502') {
    return new Error(`Kolom wajib kosong: ${error.details || error.message}`);
  }
  if (error?.code === '42501') {
    return new Error('Tidak memiliki izin untuk mengubah data');
  }
  return new Error(`DB Error [${error?.code}]: ${error?.message}`);
};

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

export const useKendaraan = () => {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('database_kendaraan')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data?.map(fromDb) as Kendaraan[]) || [];
    },
  });
};

export const useAddKendaraan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Kendaraan, 'id'>) => {
      assertValid(data);

      const { error } = await supabase
        .from('database_kendaraan')
        .insert(toDbPayload(data));

      if (error) throw translateDbError(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
};

export const useUpdateKendaraan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Kendaraan) => {
      assertValid(data);

      const { error } = await supabase
        .from('database_kendaraan')
        .update(toDbPayload(data))
        .eq('id', id);

      if (error) throw translateDbError(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
};

export const useDeleteKendaraan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('database_kendaraan')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
};