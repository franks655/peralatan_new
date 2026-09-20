import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/api/client';
import { toast } from 'sonner';
import type { Invoice } from '@/types';

// API base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
      const response = await fetch(`${API_URL}/api/invoice?order=created_at&ascending=false`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to fetch invoices');
      }

      return result.data || [];
    },
  });
};

export const useAddInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation<Invoice, Error, Omit<Invoice, 'id' | 'created_at' | 'updated_at'>>({
    mutationFn: async (data) => {
      const invoiceId = generateUUID();
      
      const payload = {
        ...data,
        id: invoiceId,
      };

      const response = await fetch(`${API_URL}/api/invoice?single=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to create invoice');
      }

      return result.data;
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

      const response = await fetch(`${API_URL}/api/invoice?eq=${JSON.stringify({ id: data.id })}&single=true`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to update invoice');
      }

      return result.data;
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
      const response = await fetch(`${API_URL}/api/invoice?eq=${JSON.stringify({ id })}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to delete invoice');
      }
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

  console.log('Fetching timesheet for:', {
    noLambung,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  });

  try {
    // Use backend API to fetch timesheet data
    const response = await fetch(
      `${API_URL}/api/timesheet?eq=${JSON.stringify({ no_lambung })}&gte=${JSON.stringify({ tanggal: startDate.toISOString().split('T')[0] })}&lte=${JSON.stringify({ tanggal: endDate.toISOString().split('T')[0] })}`
    );
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('Error fetching timesheet:', result.error);
      return 0;
    }

    const timesheetData = result.data || [];
    console.log('Timesheet data found:', timesheetData.length, 'records');
    console.log('Timesheet records:', timesheetData);

    const totalJam = timesheetData.reduce((sum: number, item: any) => {
      const jam = Number(item.total_jam) || 0;
      console.log(`Record: ${item.tanggal}, total_jam: ${jam}`);
      return sum + jam;
    }, 0);

    console.log('Total jam calculated:', totalJam);
    return totalJam;
  } catch (error) {
    console.error('Error fetching timesheet:', error);
    return 0;
  }
};
