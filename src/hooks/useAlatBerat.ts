import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import type { AlatBerat } from '@/types';
import { DEMO_MODE } from '@/contexts/AuthContext';

// API base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';


// Helper function to convert camelCase to snake_case for database
const camelToSnake = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(camelToSnake);
  }
  
  const result: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      result[snakeKey] = camelToSnake(obj[key]);
    }
  }
  return result;
};

// Mock data for testing without backend
const MOCK_ALAT_BERAT: AlatBerat[] = [
  {
    id: '1',
    no_lambung: 'LB-001',
    nama_alat: 'Excavator CAT 320',
    jenis_alat: 'Excavator',
    tahun_perolehan: 2020,
    lokasi: 'Site A',
    status: 'aktif',
  },
  {
    id: '2',
    no_lambung: 'LB-002',
    nama_alat: 'Dozer Komatsu D65',
    jenis_alat: 'Bulldozer',
    tahun_perolehan: 2019,
    lokasi: 'Site B',
    status: 'aktif',
  },
  {
    id: '3',
    no_lambung: 'LB-003',
    nama_alat: 'Wheel Loader Volvo',
    jenis_alat: 'Wheel Loader',
    tahun_perolehan: 2021,
    lokasi: 'Site C',
    status: 'maintenance',
  },
];

export const useAlatBerat = () => {
  return useQuery<AlatBerat[], Error>({
    queryKey: ['alat-berat'],
    queryFn: async () => {
      if (DEMO_MODE) {
        return MOCK_ALAT_BERAT;
      }

      console.log('Fetching alat berat data from backend...');

      try {
        const response = await fetch(`${API_URL}/api/alat_berat?order=created_at&ascending=false`);
        const result = await response.json();
        
        if (!response.ok) {
          console.error('Error fetching alat berat:', result.error);
          throw new Error(result.error?.message || 'Failed to fetch alat berat');
        }

        console.log('Raw data from backend:', result.data);

        if (!result.data || result.data.length === 0) {
          console.warn('No data returned from alat_berat table');
          return [];
        }

        // Map the data to match our frontend types
        return result.data.map((item: any) => ({
          id: item.id,
          no_lambung: item.no_lambung || '',
          nama_alat: item.nama_alat || '',
          jenis_alat: item.jenis_alat || undefined,
          tahun_perolehan: item.tahun_perolehan || undefined,
          nilai_perolehan: item.nilai_perolehan || undefined,
          lokasi: item.lokasi_saat_ini || item.lokasi || undefined,
          lokasi_saat_ini: item.lokasi_saat_ini || item.lokasi || undefined,
          lokasi_sebelum: item.lokasi_sebelum || item.lokasi_sebelumnya || undefined,
          lokasi_sebelumnya: item.lokasi_sebelum || item.lokasi_sebelumnya || undefined,
          kepemilikan: item.kepemilikan || undefined,
          status: item.status || 'aktif',
          keterangan: item.keterangan || undefined,
          merk: item.merk || undefined,
          tipe: item.tipe || undefined,
          noSeri: item.no_seri || item.noSeri || undefined,
          kondisi: item.kondisi || undefined,
          serviceTerakhir: item.service_terakhir || item.serviceTerakhir || undefined,
          serviceBerikutnya: item.service_berikutnya || item.serviceBerikutnya || undefined,
          foto: item.foto || item.gambar || null,
          harga_sewa: item.harga_sewa || undefined,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }));
      } catch (error) {
        console.error('Error in fetchAlatBerat:', error);
        console.warn('Backend connection failed, using mock data for demo');
        // Return mock data as fallback
        return MOCK_ALAT_BERAT;
      }
    },
  });
};

export const useAddAlatBerat = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<AlatBerat, Error, Omit<AlatBerat, 'id' | 'created_at' | 'updated_at'>>({
    mutationFn: async (data) => {
      // Convert camelCase to snake_case for database
      const dbData = camelToSnake(data);
      const response = await fetch(`${API_URL}/api/alat_berat?single=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbData),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'Failed to add alat berat');
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alat-berat'] });
      toast({ title: 'Success', description: 'Alat berat berhasil ditambahkan' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateAlatBerat = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<AlatBerat, Error, AlatBerat>({
    mutationFn: async (data) => {
      if (!data.id) throw new Error('ID is required');
      // Convert camelCase to snake_case for database
      const dbData = camelToSnake(data);
      const response = await fetch(`${API_URL}/api/alat_berat?eq=${JSON.stringify({ id: data.id })}&single=true`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbData),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'Failed to update alat berat');
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alat-berat'] });
      toast({ title: 'Success', description: 'Alat berat berhasil diperbarui' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteAlatBerat = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const response = await fetch(`${API_URL}/api/alat_berat?eq=${JSON.stringify({ id })}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'Failed to delete alat berat');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alat-berat'] });
      toast({ title: 'Success', description: 'Alat berat berhasil dihapus' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};
