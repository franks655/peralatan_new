import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/api/client';
import { useToast } from '@/components/ui/use-toast';
import { withTimeout } from '@/utils/withTimeout';

export interface PerbaikanAlatItem {
  id: string;
  created_at: string;
  updated_at: string;
  tanggal: string;
  no_dokumen: string;
  no_lambung: string;
  nama_alat: string;
  lokasi: string | null;
  kerusakan: string | null;
  jenis_kerusakan?: string[] | string | null;
  checked_kerusakan?: string[] | string | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
}

export const usePerbaikanAlat = () => {
  return useQuery({
    queryKey: ['perbaikan-alat'],
    queryFn: async () => {
      try {
        const { data, error } = await withTimeout(
          Promise.resolve(
            supabase
              .from('perbaikan_alat')
              .select('*')
              .order('created_at', { ascending: false })
              .then((r: any) => r)
          ),
          10000,
          'Perbaikan Alat Fetch'
        ) as any;
        if (error) throw error;
        return data as PerbaikanAlatItem[];
      } catch (err) {
        console.warn('perbaikan_alat unavailable, using empty array', err);
        return [] as PerbaikanAlatItem[];
      }
    },
    retry: 1,
    retryDelay: 500,
  });
};

export const useAddPerbaikanAlat = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<PerbaikanAlatItem, 'id' | 'created_at' | 'updated_at'>) => {
      if (!data.tanggal || !data.no_lambung || !data.nama_alat) {
        throw new Error('Tanggal, No. Lambung, dan Nama Alat harus diisi');
      }
      const { data: result, error } = await supabase
        .from('perbaikan_alat')
        .insert(data)
        .select()
        .single();
      if (error) {
        console.error('PerbaikanAlat Insert Error:', error);
        throw new Error(error.message || 'Gagal menyimpan data');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perbaikan-alat'] });
      toast({ title: 'Berhasil', description: 'Data permohonan perbaikan alat berhasil ditambahkan' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'Gagal menambahkan data', variant: 'destructive' });
    },
  });
};

export const useUpdatePerbaikanAlat = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<PerbaikanAlatItem>) => {
      if (!id) throw new Error('ID is required');
      const { data: result, error } = await supabase
        .from('perbaikan_alat')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        console.error('PerbaikanAlat Update Error:', error);
        throw new Error(error.message || 'Gagal mengupdate data');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perbaikan-alat'] });
      toast({ title: 'Berhasil', description: 'Data permohonan perbaikan alat berhasil diperbarui' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'Gagal memperbarui data', variant: 'destructive' });
    },
  });
};

export const useDeletePerbaikanAlat = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('perbaikan_alat')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perbaikan-alat'] });
      toast({ title: 'Berhasil', description: 'Data permohonan perbaikan alat berhasil dihapus' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'Gagal menghapus data', variant: 'destructive' });
    },
  });
};
