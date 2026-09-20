import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/api/client';
import { useToast } from '@/components/ui/use-toast';
import { withTimeout } from '@/utils/withTimeout';

export interface PerawatanBerkalaItemDetail {
  id: string;
  perawatan_berkala_id: string;
  tanggal?: string | null;
  nama_mekanik: string;
  rencana_perawatan: string;
  jenis_perawatan: string;
  quantity: number;
  harga: number;
  total_harga?: number;
  created_at?: string;
  updated_at?: string;
}

export const usePerawatanBerkalaItems = (perawatanBerkalaId?: string) => {
  return useQuery({
    queryKey: ['perawatan-berkala-items', perawatanBerkalaId || 'all'],
    queryFn: async () => {
      try {
        let query = supabase.from('perawatan_berkala_items').select('*');
        if (perawatanBerkalaId) {
          query = query.eq('perawatan_berkala_id', perawatanBerkalaId);
        }
        query = query.order('created_at', { ascending: true });

        const { data, error } = await withTimeout(
          Promise.resolve(query.then((r: any) => r)),
          10000,
          'Perawatan Berkala Items Fetch'
        ) as any;

        if (error) throw error;
        return (data || []) as PerawatanBerkalaItemDetail[];
      } catch (err) {
        console.warn('Fetch perawatan_berkala_items failed:', err);
        return [] as PerawatanBerkalaItemDetail[];
      }
    },
    enabled: true,
    retry: 1,
  });
};

export const useAddPerawatanBerkalaItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (item: Omit<PerawatanBerkalaItemDetail, 'id' | 'created_at' | 'updated_at' | 'total_harga'>) => {
      if (!item.perawatan_berkala_id) {
        throw new Error('Perawatan Berkala ID harus ada');
      }
      if (!item.rencana_perawatan) {
        throw new Error('Rencana perawatan berkala harus diisi');
      }
      if (!item.jenis_perawatan) {
        throw new Error('Jenis perawatan harus diisi');
      }

      const { data, error } = await supabase
        .from('perawatan_berkala_items')
        .insert({
          perawatan_berkala_id: item.perawatan_berkala_id,
          tanggal: item.tanggal || null,
          nama_mekanik: item.nama_mekanik || '',
          rencana_perawatan: item.rencana_perawatan,
          jenis_perawatan: item.jenis_perawatan,
          quantity: Number(item.quantity) || 1,
          harga: Number(item.harga) || 0,
        })
        .select()
        .single();

      if (error) {
        console.error('Insert perawatan_berkala_items error:', error);
        throw new Error(error.message || 'Gagal menyimpan item perintah kerja');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perawatan-berkala-items'] });
      toast({ title: 'Berhasil', description: 'Item perintah kerja berhasil disimpan' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message || 'Gagal menyimpan item', variant: 'destructive' });
    },
  });
};

export const useUpdatePerawatanBerkalaItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<PerawatanBerkalaItemDetail>) => {
      if (!id) throw new Error('ID is required');
      const { data: result, error } = await supabase
        .from('perawatan_berkala_items')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Update perawatan_berkala_items error:', error);
        throw new Error(error.message || 'Gagal mengupdate item');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perawatan-berkala-items'] });
      toast({ title: 'Berhasil', description: 'Item perintah kerja berhasil diperbarui' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message || 'Gagal memperbarui item', variant: 'destructive' });
    },
  });
};

export const useDeletePerawatanBerkalaItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('perawatan_berkala_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perawatan-berkala-items'] });
      toast({ title: 'Berhasil', description: 'Item perintah kerja berhasil dihapus' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message || 'Gagal menghapus item', variant: 'destructive' });
    },
  });
};
