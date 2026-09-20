import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/api/client';
import type { BiayaKendaraan } from '@/types';

const QUERY_KEY = ['database-biaya-kendaraan'];

/* ------------------------------------------------------------------ */
/* Helper                                                              */
/* ------------------------------------------------------------------ */

const txt = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

const numOrZero = (v: unknown): number => {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** DB (snake_case) -> aplikasi (camelCase) */
const fromDb = (item: any): BiayaKendaraan => {
  const jenisPerawatan = item.jenis_perawatan || null;
  const isCustom = jenisPerawatan && !['E-toll', 'Biaya Pemakaian BBM', 'Biaya Perbaikan'].includes(jenisPerawatan);
  
  return {
    id: item.id,
    noLambung: item.no_lambung,
    tanggal: item.tanggal,
    jenisPerawatan: jenisPerawatan,
    namaBarangJasa: isCustom ? jenisPerawatan : (item.nama_barang_jasa || jenisPerawatan),
    volume: numOrZero(item.volume),
    satuan: item.satuan || null,
    hargaSatuan: numOrZero(item.harga_satuan),
    total: item.total !== null && item.total !== undefined ? Number(item.total) : null,
    tempat: item.tempat || null,
    keterangan: item.keterangan || null,
    gerbangMasuk: item.gerbang_masuk || null,
    gerbangKeluar: item.gerbang_keluar || null,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
};

/**
 * Aplikasi -> DB. Kolom `total` sengaja TIDAK dikirim karena merupakan
 * generated column (dihitung otomatis oleh database dari volume * harga_satuan).
 */
const toDbPayload = (d: Omit<BiayaKendaraan, 'id' | 'total'>) => {
  const isCustom = !['E-toll', 'Biaya Pemakaian BBM', 'Biaya Perbaikan'].includes(d.jenisPerawatan || '');
  return {
    no_lambung: txt(d.noLambung),
    tanggal: txt(d.tanggal),
    jenis_perawatan: txt(d.jenisPerawatan),
    nama_barang_jasa: isCustom ? txt(d.jenisPerawatan) : txt(d.namaBarangJasa),
    volume: numOrZero(d.volume),
    satuan: txt(d.satuan),
    harga_satuan: numOrZero(d.hargaSatuan),
    tempat: txt(d.tempat),
    keterangan: txt(d.keterangan),
    gerbang_masuk: txt(d.gerbangMasuk),
    gerbang_keluar: txt(d.gerbangKeluar),
  };
};

const assertValid = (d: Omit<BiayaKendaraan, 'id' | 'total'>) => {
  if (!txt(d.noLambung)) {
    throw new Error('Nomor Polisi tidak boleh kosong');
  }
  // Untuk custom category, jenisPerawatan berfungsi sebagai namaBarangJasa
  const isCustom = !['E-toll', 'Biaya Pemakaian BBM', 'Biaya Perbaikan'].includes(d.jenisPerawatan || '');
  if (isCustom) {
    if (!txt(d.jenisPerawatan)) {
      throw new Error('Kategori tidak boleh kosong');
    }
  } else {
    if (!txt(d.namaBarangJasa)) {
      throw new Error('Nama Barang/Jasa tidak boleh kosong');
    }
  }
  if (!txt(d.tanggal)) {
    throw new Error('Tanggal tidak boleh kosong');
  }
  if (numOrZero(d.volume) <= 0) {
    throw new Error('Volume harus lebih besar dari 0');
  }
  if (numOrZero(d.hargaSatuan) < 0) {
    throw new Error('Harga Satuan tidak boleh negatif');
  }
  // Validasi khusus untuk E-toll
  if (d.jenisPerawatan === 'E-toll') {
    if (!txt(d.gerbangMasuk)) {
      throw new Error('Gerbang Masuk tidak boleh kosong untuk kategori E-toll');
    }
    if (!txt(d.gerbangKeluar)) {
      throw new Error('Gerbang Keluar tidak boleh kosong untuk kategori E-toll');
    }
  }
};

const translateDbError = (error: any): Error => {
  console.error('Database error:', error?.code, error?.message, error?.details);
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

export const useBiayaKendaraan = () => {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('database_biaya_kendaraan')
        .select('*')
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data?.map(fromDb) as BiayaKendaraan[]) || [];
    },
  });
};

export const useAddBiayaKendaraan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<BiayaKendaraan, 'id' | 'total'>) => {
      assertValid(data);

      const { error } = await supabase
        .from('database_biaya_kendaraan')
        .insert(toDbPayload(data));

      if (error) throw translateDbError(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
};

export const useUpdateBiayaKendaraan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, total, ...data }: BiayaKendaraan) => {
      assertValid(data);

      const { error } = await supabase
        .from('database_biaya_kendaraan')
        .update(toDbPayload(data))
        .eq('id', id);

      if (error) throw translateDbError(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
};

export const useDeleteBiayaKendaraan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('database_biaya_kendaraan')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
};
