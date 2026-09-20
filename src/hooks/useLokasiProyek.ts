import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/api/client';
import type { LokasiProyek } from '@/types';

export const useLokasiProyek = () => {
  return useQuery({
    queryKey: ['lokasi-proyek'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lokasi_proyek')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((item: any) => ({
        id: item.id,
        namaProyek: item.nama_proyek,
        lokasi: item.lokasi,
        tanggalMulaiProyek: item.tanggal_mulai_proyek || null,
        kepalaProyek: item.kepala_proyek || null,
        keterangan: item.keterangan || null,
        status: item.status || 'aktif',
        created_at: item.created_at,
        updated_at: item.updated_at,
      })) as LokasiProyek[];
    },
  });
};

export const useAddLokasiProyek = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<LokasiProyek, 'id'>) => {
      if (!data.namaProyek?.trim()) {
        throw new Error('Nama Proyek tidak boleh kosong');
      }
      if (!data.lokasi?.trim()) {
        throw new Error('Lokasi Proyek tidak boleh kosong');
      }

      const { error } = await supabase
        .from('lokasi_proyek')
        .insert({
          nama_proyek: data.namaProyek.trim(),
          lokasi: data.lokasi.trim(),
          tanggal_mulai_proyek: data.tanggalMulaiProyek || null,
          kepala_proyek: data.kepalaProyek ? data.kepalaProyek.trim() : null,
          keterangan: data.keterangan ? data.keterangan.trim() : null,
          status: data.status || 'aktif',
        });

      if (error) {
        console.error('Error in useAddLokasiProyek:', error);
        throw new Error(error.message || 'Gagal menambahkan lokasi proyek');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lokasi-proyek'] });
    },
  });
};

export const useUpdateLokasiProyek = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: LokasiProyek) => {
      if (!data.namaProyek?.trim()) {
        throw new Error('Nama Proyek tidak boleh kosong');
      }
      if (!data.lokasi?.trim()) {
        throw new Error('Lokasi Proyek tidak boleh kosong');
      }

      const { error } = await supabase
        .from('lokasi_proyek')
        .update({
          nama_proyek: data.namaProyek.trim(),
          lokasi: data.lokasi.trim(),
          tanggal_mulai_proyek: data.tanggalMulaiProyek || null,
          kepala_proyek: data.kepalaProyek ? data.kepalaProyek.trim() : null,
          keterangan: data.keterangan ? data.keterangan.trim() : null,
          status: data.status || 'aktif',
        })
        .eq('id', id);

      if (error) {
        console.error('Error in useUpdateLokasiProyek:', error);
        throw new Error(error.message || 'Gagal memperbarui lokasi proyek');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lokasi-proyek'] });
    },
  });
};

export const useDeleteLokasiProyek = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lokasi_proyek')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error in useDeleteLokasiProyek:', error);
        throw new Error(error.message || 'Gagal menghapus lokasi proyek');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lokasi-proyek'] });
    },
  });
};
