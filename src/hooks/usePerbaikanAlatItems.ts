import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/api/client';
import { useToast } from '@/components/ui/use-toast';
import { withTimeout } from '@/utils/withTimeout';

export interface PerbaikanAlatItemDetail {
  id: string;
  perbaikan_alat_id: string;
  jenis_perbaikan: string;
  nama_sparepart: string;
  quantity: number;
  stock: number;
  harga_satuan: number;
  total_harga?: number;
  created_at?: string;
  updated_at?: string;
}

export const usePerbaikanAlatItems = (perbaikanAlatId?: string) => {
  return useQuery({
    queryKey: ['perbaikan-alat-items', perbaikanAlatId || 'all'],
    queryFn: async () => {
      try {
        let query = supabase.from('perbaikan_alat_items').select('*');
        if (perbaikanAlatId) {
          query = query.eq('perbaikan_alat_id', perbaikanAlatId);
        }
        query = query.order('created_at', { ascending: true });

        const { data, error } = await withTimeout(
          Promise.resolve(query.then((r: any) => r)),
          10000,
          'Perbaikan Alat Items Fetch'
        ) as any;

        if (error) throw error;
        return (data || []) as PerbaikanAlatItemDetail[];
      } catch (err) {
        console.warn('Fetch perbaikan_alat_items failed:', err);
        return [] as PerbaikanAlatItemDetail[];
      }
    },
    enabled: true,
    retry: 1,
  });
};

export const useAddPerbaikanAlatItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (item: Omit<PerbaikanAlatItemDetail, 'id' | 'created_at' | 'updated_at' | 'total_harga'>) => {
      if (!item.perbaikan_alat_id) {
        throw new Error('Perbaikan Alat ID harus ada');
      }
      if (!item.jenis_perbaikan) {
        throw new Error('Jenis perbaikan harus diisi');
      }
      if (!item.nama_sparepart) {
        throw new Error('Sparepart/Jasa harus diisi');
      }

      const { data, error } = await supabase
        .from('perbaikan_alat_items')
        .insert({
          perbaikan_alat_id: item.perbaikan_alat_id,
          jenis_perbaikan: item.jenis_perbaikan,
          nama_sparepart: item.nama_sparepart,
          quantity: Number(item.quantity) || 1,
          stock: Number(item.stock) || 0,
          harga_satuan: Number(item.harga_satuan) || 0,
        })
        .select()
        .single();

      if (error) {
        console.error('Insert perbaikan_alat_items error:', error);
        throw new Error(error.message || 'Gagal menyimpan item perintah kerja');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perbaikan-alat-items'] });
      toast({ title: 'Berhasil', description: 'Item perintah kerja berhasil disimpan' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message || 'Gagal menyimpan item', variant: 'destructive' });
    },
  });
};

export const useUpdatePerbaikanAlatItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<PerbaikanAlatItemDetail>) => {
      if (!id) throw new Error('ID is required');
      const { data: result, error } = await supabase
        .from('perbaikan_alat_items')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Update perbaikan_alat_items error:', error);
        throw new Error(error.message || 'Gagal mengupdate item');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perbaikan-alat-items'] });
      toast({ title: 'Berhasil', description: 'Item perintah kerja berhasil diperbarui' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message || 'Gagal memperbarui item', variant: 'destructive' });
    },
  });
};

export const useDeletePerbaikanAlatItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('perbaikan_alat_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perbaikan-alat-items'] });
      toast({ title: 'Berhasil', description: 'Item perintah kerja berhasil dihapus' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message || 'Gagal menghapus item', variant: 'destructive' });
    },
  });
};
