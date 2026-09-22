import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/api/client';
import { toast } from 'sonner';

export interface PreOrderItem {
  id?: string;
  nama_barang: string;
  volume: string;
  estimasi_harga_satuan: string;
  keterangan: string;
}

export interface PreOrder {
  id?: string;
  sewa_alat_eksternal_id?: string | null;
  nomor_urut: string;
  tanggal: string;
  kode_pi: string;
  pekerjaan: string;
  items: PreOrderItem[];
}

const PRE_ORDER_QUERY_KEY = 'pre_order';

const mapRow = (item: any, items: PreOrderItem[] = []): PreOrder => ({
  id: item.id,
  sewa_alat_eksternal_id: item.sewa_alat_eksternal_id || null,
  nomor_urut: item.nomor_urut || '',
  tanggal: (item.tanggal || '').split('T')[0],
  kode_pi: item.kode_pi || '',
  pekerjaan: item.pekerjaan || '',
  items,
});

const mapItemRow = (row: any): PreOrderItem => ({
  id: row.id,
  nama_barang: row.nama_barang || '',
  volume: row.volume || '',
  estimasi_harga_satuan: row.estimasi_harga_satuan || '',
  keterangan: row.keterangan || '',
});

const fetchItems = async (preOrderId: string): Promise<PreOrderItem[]> => {
  const { data, error } = await supabase
    .from('pre_order_items')
    .select('*')
    .eq('pre_order_id', preOrderId)
    .order('urutan', { ascending: true });

  if (error) {
    console.error('Error fetching pre order items:', error);
    throw error;
  }

  return (data || []).map(mapItemRow);
};

/** Ambil satu pre-order terkait sewa_alat_eksternal_id tertentu (kalau sudah pernah dibuat & disimpan) */
export const usePreOrderBySewaAlatEksternal = (sewaAlatEksternalId: string | null | undefined) => {
  return useQuery({
    queryKey: [PRE_ORDER_QUERY_KEY, 'by-sewa-alat-eksternal', sewaAlatEksternalId],
    queryFn: async () => {
      if (!sewaAlatEksternalId) return null;
      const { data, error } = await supabase
        .from('pre_order')
        .select('*')
        .eq('sewa_alat_eksternal_id', sewaAlatEksternalId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching pre order:', error);
        throw error;
      }

      if (!data || data.length === 0) return null;

      const items = await fetchItems(data[0].id);
      return mapRow(data[0], items);
    },
    enabled: !!sewaAlatEksternalId,
    staleTime: 60 * 1000,
    retry: 1,
  });
};

const saveItems = async (preOrderId: string, items: PreOrderItem[]) => {
  // Hapus semua item lama, lalu masukkan ulang (replace penuh) - lebih sederhana & aman dari data nyasar
  const { error: deleteError } = await supabase
    .from('pre_order_items')
    .delete()
    .eq('pre_order_id', preOrderId);

  if (deleteError) throw deleteError;

  const rowsToInsert = items
    .filter((it) => it.nama_barang.trim())
    .map((it, index) => ({
      pre_order_id: preOrderId,
      nama_barang: it.nama_barang.trim(),
      volume: it.volume?.trim() || '',
      estimasi_harga_satuan: it.estimasi_harga_satuan?.trim() || '',
      keterangan: it.keterangan?.trim() || '',
      urutan: index,
      created_at: new Date().toISOString(),
    }));

  if (rowsToInsert.length === 0) return;

  const { error: insertError } = await supabase
    .from('pre_order_items')
    .insert(rowsToInsert);

  if (insertError) throw insertError;
};

export const useAddPreOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PreOrder) => {
      const insertData = {
        sewa_alat_eksternal_id: data.sewa_alat_eksternal_id || null,
        nomor_urut: data.nomor_urut?.trim() || '',
        tanggal: data.tanggal || null,
        kode_pi: data.kode_pi?.trim() || '',
        pekerjaan: data.pekerjaan?.trim() || '',
      };

      const { data: result, error } = await supabase
        .from('pre_order')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      await saveItems(result.id, data.items);
      const items = await fetchItems(result.id);
      return mapRow(result, items);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRE_ORDER_QUERY_KEY] });
      toast.success('Pre-Order berhasil disimpan');
    },
    onError: (error: Error) => {
      console.error('Error saving pre order:', error);
      toast.error('Gagal menyimpan Pre-Order', { description: error.message });
    },
  });
};

export const useUpdatePreOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PreOrder) => {
      if (!data.id) throw new Error('ID pre-order wajib ada untuk update');

      const updateData = {
        nomor_urut: data.nomor_urut?.trim() || '',
        tanggal: data.tanggal || null,
        kode_pi: data.kode_pi?.trim() || '',
        pekerjaan: data.pekerjaan?.trim() || '',
      };

      const { data: result, error } = await supabase
        .from('pre_order')
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
      queryClient.invalidateQueries({ queryKey: [PRE_ORDER_QUERY_KEY] });
      toast.success('Pre-Order berhasil diperbarui');
    },
    onError: (error: Error) => {
      console.error('Error updating pre order:', error);
      toast.error('Gagal memperbarui Pre-Order', { description: error.message });
    },
  });
};