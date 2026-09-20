import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/api/client';
import { useToast } from '@/components/ui/use-toast';
import { withTimeout } from '@/utils/withTimeout';

export interface PerawatanBerkalaItem {
  id: string;
  created_at: string;
  updated_at: string;
  tanggal: string;
  no_dokumen: string;
  no_lambung: string;
  nama_alat: string;
  km_hm_terakhir: number | null;
  km_hm_saat_ini: number | null;
  lokasi: string | null;
  keterangan: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
}

export const usePerawatanBerkala = () => {
  return useQuery({
    queryKey: ['perawatan-berkala'],
    queryFn: async () => {
      try {
        const { data, error } = await withTimeout(
          Promise.resolve(
            supabase
              .from('perawatan_berkala')
              .select('*')
              .order('created_at', { ascending: false })
              .then((r: any) => r)
          ),
          10000,
          'Perawatan Berkala Fetch'
        ) as any;
        if (error) throw error;
        return data as PerawatanBerkalaItem[];
      } catch (err) {
        console.warn('Supabase perawatan_berkala unavailable, using empty array', err);
        return [] as PerawatanBerkalaItem[];
      }
    },
    retry: 1,
    retryDelay: 500,
  });
};

export const useAddPerawatanBerkala = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<PerawatanBerkalaItem, 'id' | 'created_at' | 'updated_at'>) => {
      if (!data.tanggal || !data.no_lambung || !data.nama_alat) {
        throw new Error('Tanggal, No. Lambung, dan Nama Alat harus diisi');
      }
      const { data: result, error } = await supabase
        .from('perawatan_berkala')
        .insert(data)
        .select()
        .single();
      if (error) {
        console.error('PerawatanBerkala Insert Error:', error);
        throw new Error(error.message || 'Gagal menyimpan data');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perawatan-berkala'] });
      toast({ title: 'Berhasil', description: 'Data perawatan berkala berhasil ditambahkan' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'Gagal menambahkan data', variant: 'destructive' });
    },
  });
};

export const useUpdatePerawatanBerkala = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<PerawatanBerkalaItem>) => {
      if (!id) throw new Error('ID is required');
      const { data: result, error } = await supabase
        .from('perawatan_berkala')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        console.error('PerawatanBerkala Update Error:', error);
        throw new Error(error.message || 'Gagal mengupdate data');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perawatan-berkala'] });
      toast({ title: 'Berhasil', description: 'Data perawatan berkala berhasil diperbarui' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'Gagal memperbarui data', variant: 'destructive' });
    },
  });
};

export const useDeletePerawatanBerkala = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('perawatan_berkala')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perawatan-berkala'] });
      toast({ title: 'Berhasil', description: 'Data perawatan berkala berhasil dihapus' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'Gagal menghapus data', variant: 'destructive' });
    },
  });
};
