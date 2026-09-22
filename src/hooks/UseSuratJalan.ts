import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/api/client';
import { toast } from 'sonner';

export interface SuratJalanItem {
  id?: string;
  nama_barang: string;
  banyaknya: string;
  keterangan: string;
}

export interface SuratJalan {
  id?: string;
  sewa_alat_internal_id?: string | null;
  no_urut: string;
  nomor: string;
  tanggal: string;
  dari_proyek: string;
  untuk_proyek: string;
  items: SuratJalanItem[];
  mengetahui_nama: string;
  yang_menerima_nama: string;
  yang_menyerahkan_nama: string;
}

const SURAT_JALAN_QUERY_KEY = 'surat_jalan';

const mapRow = (item: any, items: SuratJalanItem[] = []): SuratJalan => ({
  id: item.id,
  sewa_alat_internal_id: item.sewa_alat_internal_id || null,
  no_urut: item.no_urut || '',
  nomor: item.nomor || '',
  tanggal: (item.tanggal || '').split('T')[0],
  dari_proyek: item.dari_proyek || '',
  untuk_proyek: item.untuk_proyek || '',
  items,
  mengetahui_nama: item.mengetahui_nama || '',
  yang_menerima_nama: item.yang_menerima_nama || '',
  yang_menyerahkan_nama: item.yang_menyerahkan_nama || '',
});

const mapItemRow = (row: any): SuratJalanItem => ({
  id: row.id,
  nama_barang: row.nama_barang || '',
  banyaknya: row.banyaknya || '',
  keterangan: row.keterangan || '',
});

const fetchItems = async (suratJalanId: string): Promise<SuratJalanItem[]> => {
  const { data, error } = await supabase
    .from('surat_jalan_items')
    .select('*')
    .eq('surat_jalan_id', suratJalanId)
    .order('urutan', { ascending: true });

  if (error) {
    console.error('Error fetching surat jalan items:', error);
    throw error;
  }

  return (data || []).map(mapItemRow);
};

/** Ambil satu surat jalan terkait sewa_alat_internal_id tertentu (kalau sudah pernah dibuat & disimpan) */
export const useSuratJalanBySewaAlat = (sewaAlatInternalId: string | null | undefined) => {
  return useQuery({
    queryKey: [SURAT_JALAN_QUERY_KEY, 'by-sewa-alat', sewaAlatInternalId],
    queryFn: async () => {
      if (!sewaAlatInternalId) return null;
      const { data, error } = await supabase
        .from('surat_jalan')
        .select('*')
        .eq('sewa_alat_internal_id', sewaAlatInternalId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching surat jalan:', error);
        throw error;
      }

      if (!data || data.length === 0) return null;

      const items = await fetchItems(data[0].id);
      return mapRow(data[0], items);
    },
    enabled: !!sewaAlatInternalId,
    staleTime: 60 * 1000,
    retry: 1,
  });
};

const saveItems = async (suratJalanId: string, items: SuratJalanItem[]) => {
  // Hapus semua item lama, lalu masukkan ulang (replace penuh) - lebih sederhana & aman dari data nyasar
  const { error: deleteError } = await supabase
    .from('surat_jalan_items')
    .delete()
    .eq('surat_jalan_id', suratJalanId);

  if (deleteError) throw deleteError;

  const rowsToInsert = items
    .filter((it) => it.nama_barang.trim())
    .map((it, index) => ({
      surat_jalan_id: suratJalanId,
      nama_barang: it.nama_barang.trim(),
      banyaknya: it.banyaknya?.trim() || '',
      keterangan: it.keterangan?.trim() || '',
      urutan: index,
      created_at: new Date().toISOString(),
    }));

  if (rowsToInsert.length === 0) return;

  const { error: insertError } = await supabase
    .from('surat_jalan_items')
    .insert(rowsToInsert);

  if (insertError) throw insertError;
};

export const useAddSuratJalan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SuratJalan) => {
      const insertData = {
        sewa_alat_internal_id: data.sewa_alat_internal_id || null,
        no_urut: data.no_urut?.trim() || '',
        nomor: data.nomor?.trim() || '',
        tanggal: data.tanggal || null,
        dari_proyek: data.dari_proyek?.trim() || '',
        untuk_proyek: data.untuk_proyek?.trim() || '',
        mengetahui_nama: data.mengetahui_nama?.trim() || '',
        yang_menerima_nama: data.yang_menerima_nama?.trim() || '',
        yang_menyerahkan_nama: data.yang_menyerahkan_nama?.trim() || '',
      };

      const { data: result, error } = await supabase
        .from('surat_jalan')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      await saveItems(result.id, data.items);
      const items = await fetchItems(result.id);
      return mapRow(result, items);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SURAT_JALAN_QUERY_KEY] });
      toast.success('Surat jalan berhasil disimpan');
    },
    onError: (error: Error) => {
      console.error('Error saving surat jalan:', error);
      toast.error('Gagal menyimpan surat jalan', { description: error.message });
    },
  });
};

export const useUpdateSuratJalan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SuratJalan) => {
      if (!data.id) throw new Error('ID surat jalan wajib ada untuk update');

      const updateData = {
        no_urut: data.no_urut?.trim() || '',
        nomor: data.nomor?.trim() || '',
        tanggal: data.tanggal || null,
        dari_proyek: data.dari_proyek?.trim() || '',
        untuk_proyek: data.untuk_proyek?.trim() || '',
        mengetahui_nama: data.mengetahui_nama?.trim() || '',
        yang_menerima_nama: data.yang_menerima_nama?.trim() || '',
        yang_menyerahkan_nama: data.yang_menyerahkan_nama?.trim() || '',
      };

      const { data: result, error } = await supabase
        .from('surat_jalan')
        .update(updateData)
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;

      await saveItems(data.id, data.items);
      const items = await fetchItems(data.id);
      return mapRow(result, items);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SURAT_JALAN_QUERY_KEY] });
      toast.success('Surat jalan berhasil diperbarui');
    },
    onError: (error: Error) => {
      console.error('Error updating surat jalan:', error);
      toast.error('Gagal memperbarui surat jalan', { description: error.message });
    },
  });
};