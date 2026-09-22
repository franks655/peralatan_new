import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/api/client';
import { useToast } from '@/components/ui/use-toast';
import { withTimeout } from '@/utils/withTimeout';
import { useAddSparepartTransaction } from './useSparepartTransactions';

export interface PerbaikanAlatItemDetail {
  id: string;
  perbaikan_alat_id: string;
  jenis_perbaikan: string;
  nama_sparepart: string;
  quantity: number;
  stock: number;
  harga_satuan: number;
  total_harga?: number;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at?: string;
  updated_at?: string;
}

const EXCLUDED_SERVICE_TYPES = ['service jasa ringan', 'service jasa berat'];

// Helper function to find sparepart by name
const findSparepartByName = async (namaSparepart: string) => {
  console.log('Searching for sparepart with name:', namaSparepart);
  
  // Try exact match first
  const { data: exactMatch, error: exactError } = await supabase
    .from('sparepart')
    .select('*')
    .eq('nama_sparepart', namaSparepart)
    .single();

  if (!exactError && exactMatch) {
    console.log('Found exact match:', exactMatch);
    return exactMatch;
  }

  console.log('No exact match, trying case-insensitive search');
  
  // Try case-insensitive match
  const { data: caseMatch, error: caseError } = await supabase
    .from('sparepart')
    .select('*')
    .ilike('nama_sparepart', namaSparepart)
    .single();

  if (!caseError && caseMatch) {
    console.log('Found case-insensitive match:', caseMatch);
    return caseMatch;
  }

  console.log('No case-insensitive match, trying partial match');
  
  // Try partial match (contains)
  const { data: partialMatch, error: partialError } = await supabase
    .from('sparepart')
    .select('*')
    .ilike('nama_sparepart', `%${namaSparepart}%`)
    .limit(1);

  if (!partialError && partialMatch && partialMatch.length > 0) {
    console.log('Found partial match:', partialMatch[0]);
    return partialMatch[0];
  }

  console.error('No sparepart found for:', namaSparepart);
  console.log('Errors - Exact:', exactError, 'Case:', caseError, 'Partial:', partialError);
  return null;
};

// Helper function to update sparepart stock
const updateSparepartStock = async (sparepartId: string, quantity: number) => {
  const { data: currentSparepart, error: fetchError } = await supabase
    .from('sparepart')
    .select('sisa_stock')
    .eq('id', sparepartId)
    .single();

  if (fetchError) {
    console.error('Error fetching current stock:', fetchError);
    throw new Error('Gagal mengambil stock saat ini');
  }

  const newStock = Math.max(0, (currentSparepart.sisa_stock || 0) - quantity);

  const { error: updateError } = await supabase
    .from('sparepart')
    .update({ sisa_stock: newStock })
    .eq('id', sparepartId);

  if (updateError) {
    console.error('Error updating stock:', updateError);
    throw new Error('Gagal mengupdate stock sparepart');
  }

  return newStock;
};

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
  const addTransaction = useAddSparepartTransaction();

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

      // Check if this is a service type that should not reduce stock
      const isExcludedService = EXCLUDED_SERVICE_TYPES.some(
        type => item.nama_sparepart.toLowerCase().includes(type)
      );

      console.log('Adding SPK item:', item.nama_sparepart, 'Excluded service:', isExcludedService);

      // Find sparepart and update stock if not excluded service
      if (!isExcludedService) {
        console.log('Finding sparepart:', item.nama_sparepart);
        const sparepart = await findSparepartByName(item.nama_sparepart);
        
        console.log('Found sparepart:', sparepart);
        
        if (sparepart) {
          const quantity = Number(item.quantity) || 1;
          console.log('Updating stock for sparepart:', sparepart.id, 'quantity:', quantity);
          
          try {
            const newStock = await updateSparepartStock(sparepart.id, quantity);
            console.log('Stock updated successfully. New stock:', newStock);

            // Create transaction record (without perbaikan context for now to avoid errors)
            try {
              await addTransaction.mutateAsync({
                sparepart_id: sparepart.id,
                tanggal: new Date().toISOString(),
                jenis: 'keluar',
                jumlah: quantity,
                satuan: sparepart.satuan || '',
                keterangan: `Pemakaian untuk SPK Perbaikan Alat`,
              });
              console.log('Transaction created successfully');
            } catch (transactionError) {
              console.error('Error creating transaction:', transactionError);
              // Don't throw error for transaction, just log it
            }
          } catch (stockError) {
            console.error('Error updating stock:', stockError);
            throw new Error('Gagal mengupdate stock sparepart: ' + (stockError as Error).message);
          }
        } else {
          console.log('Sparepart not found in database:', item.nama_sparepart);
        }
      } else {
        console.log('Skipping stock update for excluded service type');
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
      queryClient.invalidateQueries({ queryKey: ['sparepart'] });
      queryClient.invalidateQueries({ queryKey: ['sparepartTransactions'] });
      // Force refetch sparepart data to ensure UI shows updated stock
      queryClient.refetchQueries({ queryKey: ['sparepart'] });
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

export const useApprovePerbaikanAlatItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, approved_by, rejection_reason }: { id: string; approved_by: string; rejection_reason?: string }) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/perbaikan_alat_items/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by, rejection_reason }),
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perbaikan-alat-items'] });
      toast({ title: 'Berhasil', description: 'Perintah kerja disetujui' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message || 'Gagal menyetujui', variant: 'destructive' });
    },
  });
};

export const useRejectPerbaikanAlatItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, approved_by, rejection_reason }: { id: string; approved_by: string; rejection_reason: string }) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/perbaikan_alat_items/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by, rejection_reason }),
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perbaikan-alat-items'] });
      toast({ title: 'Berhasil', description: 'Perintah kerja ditolak' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message || 'Gagal menolak', variant: 'destructive' });
    },
  });
};
