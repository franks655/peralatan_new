import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/api/client';
import { toast } from 'sonner';
import type { Invoice } from '@/types';

// Helper function to generate UUID
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const useInvoice = () => {
  return useQuery<Invoice[], Error>({
    queryKey: ['invoice'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch items for each invoice
      const invoicesWithItems = await Promise.all(
        (data || []).map(async (invoice: any) => {
          const { data: items, error: itemsError } = await supabase
            .from('invoice_items')
            .select('*')
            .eq('invoice_id', invoice.id);

          if (itemsError) {
            console.error('Error fetching invoice items:', itemsError);
            return {
              ...invoice,
              items: []
            } as Invoice;
          }

          return {
            ...invoice,
            items: items || []
          } as Invoice;
        })
      );

      return invoicesWithItems;
    },
  });
};

export const useAddInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation<Invoice, Error, Omit<Invoice, 'id' | 'created_at' | 'updated_at'>>({
    mutationFn: async (data) => {
      const invoiceId = generateUUID();
      
      // Insert invoice header
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoice')
        .insert({
          id: invoiceId,
          no_invoice: data.no_invoice,
          tanggal: data.tanggal,
          nama_penyewa: data.nama_penyewa,
          nama_perusahaan: data.nama_perusahaan,
          lokasi_proyek_id: data.lokasi_proyek_id || null,
          periode_bulan: data.periode_bulan,
          periode_tahun: data.periode_tahun,
          lampiran: data.lampiran || null,
          keterangan: data.keterangan || null,
          total_invoice: data.total_invoice,
          status: data.status || 'draft',
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Insert invoice items
      if (data.items && data.items.length > 0) {
        const itemsToInsert = data.items.map((item) => ({
          id: generateUUID(),
          invoice_id: invoiceId,
          alat_berat_id: item.alat_berat_id,
          no_lambung: item.no_lambung,
          nama_alat: item.nama_alat,
          qty: item.qty,
          satuan: item.satuan,
          harga_sewa: item.harga_sewa,
          lama_sewa_jam: item.lama_sewa_jam,
          satuan_lama_sewa: item.satuan_lama_sewa,
          keterangan: item.keterangan || null,
          total_item: item.total_item,
        }));

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      return {
        ...invoiceData,
        items: data.items || []
      } as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice'] });
      toast.success('Invoice berhasil dibuat');
    },
    onError: (error) => {
      toast.error(error.message || 'Gagal membuat invoice');
    },
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation<Invoice, Error, Invoice>({
    mutationFn: async (data) => {
      if (!data.id) throw new Error('Invoice ID is required');

      // Update invoice header
      const { error: invoiceError } = await supabase
        .from('invoice')
        .update({
          no_invoice: data.no_invoice,
          tanggal: data.tanggal,
          nama_penyewa: data.nama_penyewa,
          nama_perusahaan: data.nama_perusahaan,
          lokasi_proyek_id: data.lokasi_proyek_id || null,
          periode_bulan: data.periode_bulan,
          periode_tahun: data.periode_tahun,
          lampiran: data.lampiran || null,
          keterangan: data.keterangan || null,
          total_invoice: data.total_invoice,
          status: data.status,
        })
        .eq('id', data.id);

      if (invoiceError) throw invoiceError;

      // Delete existing items
      await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', data.id);

      // Insert new items
      if (data.items && data.items.length > 0) {
        const itemsToInsert = data.items.map((item) => ({
          id: generateUUID(),
          invoice_id: data.id,
          alat_berat_id: item.alat_berat_id,
          no_lambung: item.no_lambung,
          nama_alat: item.nama_alat,
          qty: item.qty,
          satuan: item.satuan,
          harga_sewa: item.harga_sewa,
          lama_sewa_jam: item.lama_sewa_jam,
          satuan_lama_sewa: item.satuan_lama_sewa,
          keterangan: item.keterangan || null,
          total_item: item.total_item,
        }));

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice'] });
      toast.success('Invoice berhasil diperbarui');
    },
    onError: (error) => {
      toast.error(error.message || 'Gagal memperbarui invoice');
    },
  });
};

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('invoice')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice'] });
      toast.success('Invoice berhasil dihapus');
    },
    onError: (error) => {
      toast.error(error.message || 'Gagal menghapus invoice');
    },
  });
};

// Helper function to get total jam from timesheet for a specific alat and periode
export const getTotalJamFromTimesheet = async (
  noLambung: string,
  bulan: number,
  tahun: number
): Promise<number> => {
  const startDate = new Date(tahun, bulan - 1, 1);
  const endDate = new Date(tahun, bulan, 0);

  const { data, error } = await supabase
    .from('timesheet')
    .select('total_jam')
    .eq('no_lambung', noLambung)
    .gte('tanggal', startDate.toISOString().split('T')[0])
    .lte('tanggal', endDate.toISOString().split('T')[0]);

  if (error) {
    console.error('Error fetching timesheet:', error);
    return 0;
  }

  const totalJam = data?.reduce((sum: number, item: any) => sum + (Number(item.total_jam) || 0), 0) || 0;
  return totalJam;
};
