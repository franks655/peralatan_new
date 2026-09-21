import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/api/client';
import { useToast } from '@/components/ui/use-toast';
import { withTimeout } from '@/utils/withTimeout';

export interface PerbaikanAlatPemeriksaanItem {
  id: string;
  perbaikan_alat_id: string;
  jenis_perbaikan: string;
  nama_sparepart: string;
  quantity: number;
  harga: number;
  total_harga?: number;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at?: string;
  updated_at?: string;
}

export const usePerbaikanAlatPemeriksaan = (perbaikanAlatId?: string) => {
  return useQuery({
    queryKey: ['perbaikan-alat-pemeriksaan', perbaikanAlatId || 'all'],
    queryFn: async () => {
      try {
        let query = supabase.from('perbaikan_alat_pemeriksaan').select('*');
        if (perbaikanAlatId) {
          query = query.eq('perbaikan_alat_id', perbaikanAlatId);
        }
        query = query.order('created_at', { ascending: true });

        const { data, error } = await withTimeout(
          Promise.resolve(query.then((r: any) => r)),
          10000,
          'Perbaikan Alat Pemeriksaan Fetch'
        ) as any;

        if (error) throw error;
        return (data || []) as PerbaikanAlatPemeriksaanItem[];
      } catch (err) {
        console.warn('Fetch perbaikan_alat_pemeriksaan failed:', err);
        return [] as PerbaikanAlatPemeriksaanItem[];
      }
    },
    enabled: true,
    retry: 1,
  });
};

export const useAddPerbaikanAlatPemeriksaan = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (item: Omit<PerbaikanAlatPemeriksaanItem, 'id' | 'created_at' | 'updated_at' | 'total_harga'>) => {
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
        .from('perbaikan_alat_pemeriksaan')
        .insert({
          perbaikan_alat_id: item.perbaikan_alat_id,
          jenis_perbaikan: item.jenis_perbaikan,
          nama_sparepart: item.nama_sparepart,
          quantity: Number(item.quantity) || 1,
          harga: Number(item.harga) || 0,
          status: item.status || 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('Insert perbaikan_alat_pemeriksaan error:', error);
        throw new Error(error.message || 'Gagal menyimpan item pemeriksaan');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perbaikan-alat-pemeriksaan'] });
      toast({ title: 'Berhasil', description: 'Item perintah pemeriksaan berhasil disimpan' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message || 'Gagal menyimpan item pemeriksaan', variant: 'destructive' });
    },
  });
};

export const useUpdatePerbaikanAlatPemeriksaan = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<PerbaikanAlatPemeriksaanItem>) => {
      if (!id) throw new Error('ID is required');
      const { data: result, error } = await supabase
        .from('perbaikan_alat_pemeriksaan')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Update perbaikan_alat_pemeriksaan error:', error);
        throw new Error(error.message || 'Gagal mengupdate item pemeriksaan');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perbaikan-alat-pemeriksaan'] });
      toast({ title: 'Berhasil', description: 'Item perintah pemeriksaan berhasil diperbarui' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message || 'Gagal memperbarui item pemeriksaan', variant: 'destructive' });
    },
  });
};

export const useDeletePerbaikanAlatPemeriksaan = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('perbaikan_alat_pemeriksaan')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perbaikan-alat-pemeriksaan'] });
      toast({ title: 'Berhasil', description: 'Item pemeriksaan berhasil dihapus' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message || 'Gagal menghapus item pemeriksaan', variant: 'destructive' });
    },
  });
};

export const useApprovePerbaikanAlatPemeriksaan = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, approved_by, rejection_reason }: { id: string; approved_by: string; rejection_reason?: string }) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/perbaikan_alat_pemeriksaan/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by, rejection_reason }),
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perbaikan-alat-pemeriksaan'] });
      toast({ title: 'Berhasil', description: 'Perintah pemeriksaan disetujui' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message || 'Gagal menyetujui', variant: 'destructive' });
    },
  });
};

export const useRejectPerbaikanAlatPemeriksaan = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, approved_by, rejection_reason }: { id: string; approved_by: string; rejection_reason: string }) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/perbaikan_alat_pemeriksaan/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by, rejection_reason }),
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perbaikan-alat-pemeriksaan'] });
      toast({ title: 'Berhasil', description: 'Perintah pemeriksaan ditolak' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message || 'Gagal menolak', variant: 'destructive' });
    },
  });
};
