import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Trash, FileDown, CheckCircle2, Activity, AlertTriangle, Printer, Edit, Upload, Calendar } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { exportToExcel, importFromExcel, validateImportedData } from '@/lib/excelUtils';
import { useAlatBerat, useAddAlatBerat, useUpdateAlatBerat, useDeleteAlatBerat } from '@/hooks/useAlatBerat';
import { useSilo, SiloDokumen } from '@/hooks/useSilo';
import { AddAlatBeratDialog } from '@/components/dialogs/AddAlatBeratDialog';
import { EditAlatBeratDialog } from '@/components/dialogs/EditAlatBeratDialog';
import { ViewAlatBeratDialog } from '@/components/dialogs/ViewAlatBeratDialog';
import ExcelImportButton from '@/components/ui/ExcelImportButton';
import { usePagePermission } from '@/hooks/usePagePermission';
import { SimplePagination, paginateData, getTotalPages } from '@/components/ui/SimplePagination';
import { formatDateDisplay, normalizeDateOnly } from '@/utils/dateUtils';
import AlatDetailPopup from '@/components/AlatDetailPopup';
import { TableScrollWrapper } from '@/components/ui/TableScrollWrapper';
import FotoViewerModal from '@/components/FotoViewerModal';
import { parseFotoList } from '@/utils/fotoUtils';

// Import the AlatBerat type from shared types
import type { AlatBerat } from '@/types';

// Create a local type that extends the shared type to ensure consistency
type LocalAlatBerat = Omit<AlatBerat, 'noSeri'> & {
  noSeri?: string;
  noLambung?: string;
  namaAlat?: string;
  merk?: string;
  tipe?: string;
  tahunPembuatan?: string | number;
  lokasi?: string;
  lokasi_saat_ini?: string;
  lokasi_sebelum?: string;
  lokasi_sebelumnya?: string;
  kepemilikan?: string;
  kondisi?: string;
  serviceTerakhir?: string;
  serviceBerikutnya?: string;
  foto?: string | null;
  harga_sewa?: number;
};

const DataAlatBerat = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [fotoModal, setFotoModal] = useState<{ src: string | string[]; alt: string } | null>(null);
  const { toast } = useToast();

  const handleRowClick = useCallback((id: string) => {
    setExpandedRowId(prev => (prev === id ? null : id));
  }, []);


  // State untuk data alat berat
  const { data: alatBeratData = [], isLoading } = useAlatBerat();
  const { data: allSilo = [] } = useSilo();
  const { mutateAsync: addAlatBerat } = useAddAlatBerat();
  const { mutateAsync: updateAlatBerat } = useUpdateAlatBerat();
  const { mutateAsync: deleteAlatBerat, isPending: isDeleting } = useDeleteAlatBerat();

  const siloByNoLambung = useMemo(() => {
    const map = new Map<string, SiloDokumen>();
    for (const s of allSilo) {
      if (s.no_lambung) {
        const key = s.no_lambung.trim().toUpperCase();
        if (!map.has(key)) {
          map.set(key, s);
        }
      }
    }
    return map;
  }, [allSilo]);

  const getSisaHariBadge = (sisaHari: number | undefined | null) => {
    if (sisaHari === undefined || sisaHari === null) return null;
    if (sisaHari < 0) {
      return { text: `Lewat ${Math.abs(sisaHari)} hari`, className: 'text-rose-700 bg-rose-50 border-rose-200' };
    }
    if (sisaHari <= 30) {
      return { text: `⚠️ Sisa ${sisaHari} hari`, className: 'text-amber-800 bg-amber-50 border-amber-300' };
    }
    if (sisaHari <= 60) {
      return { text: `Sisa ${sisaHari} hari`, className: 'text-yellow-700 bg-yellow-50 border-yellow-200' };
    }
    return { text: `Sisa ${sisaHari} hari`, className: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  };

  // Role-based access control (membaca dari user_permissions database)
  const { can_create: canCreate, can_edit: canEdit, can_delete: canDelete, can_export_excel: canExportExcel, can_import: canImport, can_print: canPrint } = usePagePermission('dataAlatBerat');
  const canShowActions = canEdit || canDelete;

  // State untuk data yang difilter
  const [filteredData, setFilteredData] = useState<LocalAlatBerat[]>([]);

  // Pastikan data yang difilter kompatibel dengan LocalAlatBerat
  const normalizedData = (data: AlatBerat[]): LocalAlatBerat[] => {
    return data.map(item => ({
      id: item.id,
      no_lambung: item.no_lambung || '',
      nama_alat: item.nama_alat || '',
      noLambung: item.no_lambung || '',
      namaAlat: item.nama_alat || '',
      noSeri: item.noSeri || '',
      merk: item.merk || '',
      tipe: item.tipe || '',
      tahunPembuatan: item.tahun_perolehan || '',
      lokasi: item.lokasi_saat_ini || item.lokasi || '',
      lokasi_saat_ini: item.lokasi_saat_ini || item.lokasi || '',
      lokasi_sebelum: item.lokasi_sebelum || item.lokasi_sebelumnya || '',
      lokasi_sebelumnya: item.lokasi_sebelum || item.lokasi_sebelumnya || '',
      kepemilikan: item.kepemilikan || '',
      kondisi: item.kondisi || '',
      serviceTerakhir: item.serviceTerakhir || '',
      serviceBerikutnya: item.serviceBerikutnya || '',
      jenis_alat: item.jenis_alat,
      nilai_perolehan: item.nilai_perolehan,
      status: item.status,
      keterangan: item.keterangan,
      foto: item.foto || null,
      harga_sewa: item.harga_sewa,
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
  };

  // Initialize filtered data when component mounts or when alatBeratData changes
  useEffect(() => {
    if (alatBeratData.length > 0) {
      const normalized = normalizedData(alatBeratData);
      setFilteredData(normalized);

      // Update stats
      const total = normalized.length;
      const baik = normalized.filter(item => item.kondisi === 'Baik').length;
      const maintenance = normalized.filter(item => item.kondisi === 'Maintenance').length;
      const rusak = normalized.filter(item => item.kondisi === 'Rusak').length;

      setStats({ total, baik, maintenance, rusak });
    }
  }, [alatBeratData]);

  // State untuk statistik
  const [stats, setStats] = useState({
    total: 0,
    baik: 0,
    maintenance: 0,
    rusak: 0
  });

  // Expose handleSearch and handleExportToExcel to be used in the UI
  const searchInputRef = useRef<HTMLInputElement>(null);

  // State untuk dialog edit
  const [editDialogOpen, setEditDialogOpen] = useState<AlatBerat | null>(null);

  const [isPrinting, setIsPrinting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize search functionality
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Handle print functionality
  const handlePrint = useCallback(() => {
    if (filteredData.length === 0) {
      toast({
        title: "Tidak ada data",
        description: "Tidak ada data yang bisa dicetak.",
        variant: "destructive" as const,
      });
      return;
    }

    setIsPrinting(true);

    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Gagal membuka jendela cetak');
      }

      // Get current date
      const currentDate = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      // Create table rows
      const tableRows = filteredData.map((item: LocalAlatBerat) => {
        const silo = item.noLambung ? siloByNoLambung.get(item.noLambung.trim().toUpperCase()) : undefined;
        let siloText = '-';
        if (silo) {
          const sisa = silo.sisa_hari !== undefined && silo.sisa_hari !== null
            ? silo.sisa_hari
            : (silo.tanggal_selesai ? Math.ceil((new Date(silo.tanggal_selesai).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)) : undefined);
          const badge = getSisaHariBadge(sisa);
          const badgeText = badge ? `(${badge.text})` : '';
          siloText = `${formatDateDisplay(silo.tanggal_berlaku)} s/d ${formatDateDisplay(silo.tanggal_selesai)} ${badgeText}`.trim();
        }

        return `
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">${item.noLambung || '-'}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${item.namaAlat || '-'}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${item.merk || '-'}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${item.tipe || '-'}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${item.noSeri || '-'}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${item.tahunPembuatan || '-'}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${item.kepemilikan || '-'}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${item.harga_sewa ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.harga_sewa) : '-'}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${item.lokasi_saat_ini || item.lokasi || '-'}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${item.lokasi_sebelum || item.lokasi_sebelumnya || '-'}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${item.kondisi ? item.kondisi.charAt(0).toUpperCase() + item.kondisi.slice(1).toLowerCase() : '-'}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase() : 'Aktif'}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${item.serviceTerakhir ? formatDateDisplay(item.serviceTerakhir) : '-'}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${item.serviceBerikutnya ? formatDateDisplay(item.serviceBerikutnya) : '-'}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${siloText}</td>
          </tr>
        `;
      }).join('');

      // Create the HTML content
      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              @page { 
                size: A4 landscape;
                margin: 1cm;
              }
              body { 
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                color: #333;
              }
              .header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 20px;
                border-bottom: 2px solid #000;
                padding-bottom: 10px;
              }
              .company-logo {
                width: 50px;
                height: 50px;
                object-fit: contain;
              }
              .company-info {
                flex: 1;
              }
              .company-name {
                font-weight: bold;
                font-size: 14px;
                margin-bottom: 2px;
                color: #1e3a8a;
              }
              .company-division {
                font-size: 12px;
                color: #4b5563;
                margin-bottom: 2px;
              }
              .company-address {
                font-size: 10px;
                color: #64748b;
              }
              .title-section {
                text-align: center;
                margin-bottom: 20px;
              }
              h1 { 
                text-align: center;
                margin: 0 0 10px 0;
                color: #1a1a1a;
                font-size: 16px;
              }
              .print-date {
                color: #666;
                margin-bottom: 10px;
                font-size: 11px;
              }
              table { 
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
                font-size: 14px;
              }
              th { 
                background-color: #f5f5f5;
                text-align: left;
                font-weight: bold;
                padding: 8px;
                border: 1px solid #ddd;
              }
              td { 
                padding: 8px;
                border: 1px solid #ddd;
              }
              tr:nth-child(even) {
                background-color: #f9f9f9;
              }
              .footer {
                margin-top: 20px;
                text-align: right;
                font-size: 12px;
                color: #666;
              }
              @media print {
                @page { 
                margin: 1cm;
                size: A4 landscape;
              }
              body { 
                margin: 0;
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${import.meta.env.VITE_API_URL}/images/logo.png" alt="PT. REKA UTAMA PERSADA" class="company-logo" onerror="this.style.display='none'" />
            <div class="company-info">
              <div class="company-name">PT. REKA UTAMA PERSADA</div>
              <div class="company-division">Divisi Peralatan & Logistik</div>
              <div class="company-address">Jl. Pangkalan No. 31 RT. 003/RW. 001, Kel. Bantargebang, Kec. Bantar Gebang, Kota Bekasi 17151</div>
            </div>
          </div>
          <div class="title-section">
            <h1>LAPORAN DATA ALAT BERAT</h1>
            <div class="print-date">Dicetak pada: ${currentDate}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>No. Lambung</th>
                <th>Nama Alat</th>
                <th>Merk</th>
                <th>Tipe</th>
                <th>No. Seri</th>
                <th>Tahun</th>
                <th>Kepemilikan</th>
                <th>Harga Sewa</th>
                <th>Lokasi Saat Ini</th>
                <th>Lokasi Sebelumnya</th>
                <th>Kondisi</th>
                <th>Status</th>
                <th>Service Terakhir</th>
                <th>Service Berikutnya</th>
                <th>Masa Aktif SILO</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
            
            <div class="footer">
              Total Data: ${filteredData.length}
            </div>
            
            <script>
              // Auto-print when the window loads
              window.onload = function() {
                try {
                  setTimeout(function() {
                    window.print();
                    // Close the window after printing
                    setTimeout(function() {
                      window.close();
                    }, 500);
                  }, 500);
                } catch (e) {
                  console.error('Print error:', e);
                  window.close();
                }
              };
              
              // Close the window if user cancels print
              const beforeUnloadHandler = function(e) {
                e.preventDefault();
                // For modern browsers
                e.returnValue = '';
                return '';
              };
              window.addEventListener('beforeunload', beforeUnloadHandler, { capture: true });
            </script>
          </body>
        </html>
      `;

      // Write the content to the new window
      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();

      // Handle print completion
      printWindow.onafterprint = function () {
        printWindow.close();
        setIsPrinting(false);
        toast({
          title: "Pencetakan selesai",
          description: "Dokumen berhasil dicetak.",
          variant: "default" as const,
        });
      };

    } catch (error) {
      console.error('Error saat mencetak:', error);
      setIsPrinting(false);
      toast({
        title: "Gagal mencetak",
        description: "Terjadi kesalahan saat mencetak dokumen. Pastikan pop-up diizinkan.",
        variant: "destructive" as const,
      });
    }
  }, [filteredData, toast]);

  // Filter data berdasarkan search query
  useEffect(() => {
    if (alatBeratData && alatBeratData.length > 0) {
      const normalized = normalizedData(alatBeratData);
      const filtered = normalized.filter(item => {
        const searchLower = searchQuery.toLowerCase();
        return (
          item.noLambung?.toLowerCase().includes(searchLower) ||
          item.namaAlat?.toLowerCase().includes(searchLower) ||
          item.merk?.toLowerCase().includes(searchLower) ||
          item.noSeri?.toLowerCase().includes(searchLower) ||
          item.tipe?.toLowerCase().includes(searchLower) ||
          item.lokasi_saat_ini?.toLowerCase().includes(searchLower) ||
          item.lokasi?.toLowerCase().includes(searchLower) ||
          item.lokasi_sebelum?.toLowerCase().includes(searchLower) ||
          item.kepemilikan?.toLowerCase().includes(searchLower) ||
          item.kondisi?.toLowerCase().includes(searchLower)
        );
      });
      setFilteredData(filtered);

      // Update statistik
      const baik = filtered.filter(item => item.kondisi?.toLowerCase() === 'baik').length;
      const maintenance = filtered.filter(item => item.kondisi?.toLowerCase() === 'maintenance').length;
      const rusak = filtered.filter(item => item.kondisi?.toLowerCase() === 'rusak').length;

      setStats({
        total: filtered.length,
        baik,
        maintenance,
        rusak
      });
    }
  }, [searchQuery, alatBeratData]);

  // Fungsi untuk mendapatkan ikon status
  const getStatusIcon = useCallback((status: string = '') => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'baik':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'maintenance':
        return <Activity className="h-4 w-4 text-yellow-500" />;
      case 'rusak':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  }, []);

  // Fungsi untuk mendapatkan warna status
  const getStatusColor = useCallback((status: string = '') => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'baik':
        return 'text-green-600';
      case 'maintenance':
        return 'text-yellow-600';
      case 'rusak':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  }, []);

  // Fungsi untuk menangani import data
  const handleImport = async (data: any[]) => {
    try {
      if (!data || data.length === 0) {
        toast({
          title: "Error",
          description: "Data kosong, tidak ada yang diimpor",
          variant: "destructive" as const,
        });
        return;
      }

      // Validate expected columns (hanya kolom wajib)
      const expectedColumns = ['No. Lambung', 'Nama Alat'];

      const validation = validateImportedData(data, expectedColumns);
      if (!validation.valid) {
        toast({
          title: "Error",
          description: `Kolom yang hilang: ${validation.missingColumns.join(', ')}`,
          variant: "destructive" as const,
        });
        return;
      }

      // Process imported data
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < data.length; i++) {
        try {
          const item = data[i];

          // Validate required fields
          if (!item['No. Lambung'] && !item['No Lambung']) {
            throw new Error('No. Lambung harus diisi');
          }
          if (!item['Nama Alat']) {
            throw new Error('Nama Alat harus diisi');
          }

          // Map imported data to AlatBerat structure
          const tahun = item['Tahun'] || item['Tahun Pembuatan'] || '';
          const lokasiSaatIni = String(item['Lokasi Saat Ini'] || item['Lokasi'] || '').trim() || '-';
          const lokasiSebelum = String(item['Lokasi Sebelumnya'] || item['Lokasi Sebelum'] || '').trim();
          const kepemilikan = String(item['Kepemilikan'] || '').trim();

          const newAlatBerat: Omit<AlatBerat, 'id'> = {
            no_lambung: String(item['No. Lambung'] || item['No Lambung'] || '').trim(),
            nama_alat: String(item['Nama Alat'] || '').trim(),
            noSeri: String(item['No. Seri'] || item['No Seri'] || '').trim(),
            merk: String(item['Merk'] || '').trim() || '-',
            tipe: String(item['Tipe'] || '').trim() || '-',
            tahun_perolehan: tahun ? Number(tahun) : undefined,
            lokasi: lokasiSaatIni,
            lokasi_saat_ini: lokasiSaatIni,
            lokasi_sebelum: lokasiSebelum || undefined,
            kepemilikan: kepemilikan || undefined,
            serviceTerakhir: item['Service Terakhir'] ? normalizeDateOnly(item['Service Terakhir'] as any) : '',
            serviceBerikutnya: item['Service Berikutnya'] ? normalizeDateOnly(item['Service Berikutnya'] as any) : '',
            kondisi: String(item['Kondisi'] || 'Baik').trim(),
            status: String(item['Status'] || 'aktif').trim(),
          };

          // Add to database
          await addAlatBerat(newAlatBerat);

          successCount++;
        } catch (error) {
          errorCount++;
          const errorMsg = `Baris ${i + 2}: ${error instanceof Error ? error.message : 'Error tidak diketahui'}`;
          errors.push(errorMsg);
          console.error(`Error processing row ${i + 1}:`, error);
        }
      }

      // Show result message
      let message = `Import selesai: ${successCount} berhasil`;
      if (errorCount > 0) {
        message += `, ${errorCount} gagal`;
      }

      toast({
        title: successCount > 0 ? 'Import Berhasil' : 'Import Gagal',
        description: message,
        variant: successCount > 0 ? 'default' : 'destructive',
      });

      if (errors.length > 0 && errors.length <= 5) {
        console.log('Import errors:', errors);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Gagal mengimpor data",
        variant: "destructive" as const,
      });
    }
  };

  // Fungsi untuk menambahkan data alat berat
  const handleAddAlat = useCallback(async (data: Omit<AlatBerat, 'id'>) => {
    try {
      await addAlatBerat(data);
      toast({
        title: "Sukses",
        description: "Data berhasil ditambahkan",
        variant: "default" as const,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menambahkan data",
        variant: "destructive" as const,
      });
    }
  }, [addAlatBerat]);

  // Fungsi untuk menangani update data alat berat
  const handleUpdateAlat = useCallback(async (data: AlatBerat) => {
    if (!editDialogOpen?.id) return;

    try {
      // Pastikan semua field yang diperlukan ada
      const updateData: AlatBerat = {
        ...editDialogOpen,
        ...data,
        id: editDialogOpen.id,
        noSeri: data.noSeri || '',
        serviceTerakhir: normalizeDateOnly(data.serviceTerakhir) || '',
        serviceBerikutnya: normalizeDateOnly(data.serviceBerikutnya) || ''
      };

      await updateAlatBerat(updateData);

      toast({
        title: "Sukses",
        description: "Data berhasil diperbarui",
        variant: "default" as const,
      });
    } catch (error) {
      console.error('Error updating data:', error);
      toast({
        title: "Error",
        description: "Gagal memperbarui data",
        variant: "destructive" as const,
      });
    } finally {
      setEditDialogOpen(null);
    }
  }, [editDialogOpen, updateAlatBerat]);

  // Fungsi untuk menangani pencarian
  const handleSearch = useCallback((query: string) => {
    try {
      setSearchQuery(query);
      setCurrentPage(1);

      // If search query is empty, reset to show all data
      if (!query.trim()) {
        const allData = normalizedData(alatBeratData);
        setFilteredData(allData);

        // Update stats with all data
        const total = allData.length;
        const baik = allData.filter(item => item.kondisi === 'Baik').length;
        const maintenance = allData.filter(item => item.kondisi === 'Maintenance').length;
        const rusak = allData.filter(item => item.kondisi === 'Rusak').length;

        setStats({ total, baik, maintenance, rusak });
        return;
      }

      // Perform search
      const lowerQuery = query.toLowerCase();
      const filtered = alatBeratData.filter((item: AlatBerat) =>
      (item.no_lambung?.toLowerCase().includes(lowerQuery) ||
        item.nama_alat?.toLowerCase().includes(lowerQuery) ||
        item.noSeri?.toLowerCase().includes(lowerQuery) ||
        item.merk?.toLowerCase().includes(lowerQuery) ||
        item.tipe?.toLowerCase().includes(lowerQuery) ||
        item.lokasi_saat_ini?.toLowerCase().includes(lowerQuery) ||
        item.lokasi?.toLowerCase().includes(lowerQuery) ||
        item.lokasi_sebelum?.toLowerCase().includes(lowerQuery) ||
        item.kepemilikan?.toLowerCase().includes(lowerQuery))
      );

      const normalizedFiltered = normalizedData(filtered);
      setFilteredData(normalizedFiltered);

      // Update stats based on filtered data
      const total = normalizedFiltered.length;
      const baik = normalizedFiltered.filter(item => item.kondisi === 'Baik').length;
      const maintenance = normalizedFiltered.filter(item => item.kondisi === 'Maintenance').length;
      const rusak = normalizedFiltered.filter(item => item.kondisi === 'Rusak').length;

      setStats({ total, baik, maintenance, rusak });
    } catch (error) {
      console.error('Error in handleSearch:', error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat melakukan pencarian",
        variant: "destructive" as const,
      });
    }
  }, [alatBeratData, toast]);

  // Add search input handler
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleSearch(e.target.value);
  };

  // Fungsi untuk menangani perubahan dialog edit


  // Fungsi untuk menangani hapus data alat berat
  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data ini?')) {
      try {
        await deleteAlatBerat(id);
        toast({
          title: "Sukses",
          description: "Data berhasil dihapus",
          variant: "default" as const,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Gagal menghapus data",
          variant: "destructive" as const,
        });
      }
    }
  }, [deleteAlatBerat]);

  // Fungsi untuk menangani export data ke Excel
  const handleExportToExcel = useCallback(() => {
    try {
      if (!filteredData || filteredData.length === 0) {
        toast({
          title: "Tidak ada data",
          description: "Tidak ada data yang bisa diekspor",
          variant: "destructive" as const,
        });
        return;
      }

      const dataToExport = filteredData.map((item: LocalAlatBerat) => {
        const silo = item.noLambung ? siloByNoLambung.get(item.noLambung.trim().toUpperCase()) : undefined;
        let siloText = '-';
        if (silo) {
          const sisa = silo.sisa_hari !== undefined && silo.sisa_hari !== null
            ? silo.sisa_hari
            : (silo.tanggal_selesai ? Math.ceil((new Date(silo.tanggal_selesai).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)) : undefined);
          const badge = getSisaHariBadge(sisa);
          const badgeText = badge ? `(${badge.text})` : '';
          siloText = `${formatDateDisplay(silo.tanggal_berlaku)} s/d ${formatDateDisplay(silo.tanggal_selesai)} ${badgeText}`.trim();
        }

        return {
          'No. Lambung': item.noLambung || '-',
          'Nama Alat': item.namaAlat || '-',
          'Merk': item.merk || '-',
          'Tipe': item.tipe || '-',
          'No. Seri': item.noSeri || '-',
          'Tahun': item.tahunPembuatan || item.tahun_perolehan || '-',
          'Kepemilikan': item.kepemilikan || '-',
          'Lokasi Saat Ini': item.lokasi_saat_ini || item.lokasi || '-',
          'Lokasi Sebelumnya': item.lokasi_sebelum || item.lokasi_sebelumnya || '-',
          'Kondisi': item.kondisi ? item.kondisi.charAt(0).toUpperCase() + item.kondisi.slice(1).toLowerCase() : '-',
          'Status': item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase() : 'Aktif',
          'Service Terakhir': item.serviceTerakhir ? normalizeDateOnly(item.serviceTerakhir) : '-',
          'Service Berikutnya': item.serviceBerikutnya ? normalizeDateOnly(item.serviceBerikutnya) : '-',
          'Masa Aktif SILO': siloText,
        };
      });

      exportToExcel(dataToExport, 'data_alat_berat');

      toast({
        title: "Berhasil",
        description: "Data berhasil diekspor ke Excel",
        variant: "default" as const,
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: "Error",
        description: "Gagal mengekspor data ke Excel",
        variant: "destructive" as const,
      });
    }
  }, [filteredData, toast]);

  // Handle import button click
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // Handle file change and import
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const importedData = await importFromExcel(file);

      // Validate expected columns (hanya kolom wajib)
      const expectedColumns = ['No. Lambung', 'Nama Alat'];

      const validation = validateImportedData(importedData, expectedColumns);
      if (!validation.valid) {
        toast({
          title: "Error",
          description: `Kolom yang hilang: ${validation.missingColumns.join(', ')}`,
          variant: "destructive" as const,
        });
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Process imported data
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < importedData.length; i++) {
        try {
          const item = importedData[i];

          // Validate required fields
          if (!item['No. Lambung'] && !item['No Lambung']) {
            throw new Error('No. Lambung harus diisi');
          }
          if (!item['Nama Alat']) {
            throw new Error('Nama Alat harus diisi');
          }

          // Map imported data to AlatBerat structure
          const tahun = item['Tahun'] || item['Tahun Pembuatan'] || '';
          const newAlatBerat: Omit<AlatBerat, 'id'> = {
            no_lambung: String(item['No. Lambung'] || item['No Lambung'] || '').trim(),
            nama_alat: String(item['Nama Alat'] || '').trim(),
            noSeri: String(item['No. Seri'] || item['No Seri'] || '').trim(),
            merk: String(item['Merk'] || '').trim() || '-',
            tipe: String(item['Tipe'] || '').trim() || '-',
            tahun_perolehan: tahun ? Number(tahun) : undefined,
            lokasi: String(item['Lokasi'] || '').trim() || '-',
            serviceTerakhir: item['Service Terakhir'] ? normalizeDateOnly(item['Service Terakhir'] as any) : '',
            serviceBerikutnya: item['Service Berikutnya'] ? normalizeDateOnly(item['Service Berikutnya'] as any) : '',
            kondisi: String(item['Kondisi'] || 'Baik').trim(),
            status: String(item['Status'] || 'aktif').trim(),
          };

          // Add to database
          await addAlatBerat(newAlatBerat);

          successCount++;
        } catch (error) {
          errorCount++;
          const errorMsg = `Baris ${i + 2}: ${error instanceof Error ? error.message : 'Error tidak diketahui'}`;
          errors.push(errorMsg);
          console.error(`Error processing row ${i + 1}:`, error);
        }
      }

      // Show result message
      let message = `Import selesai: ${successCount} berhasil`;
      if (errorCount > 0) {
        message += `, ${errorCount} gagal`;
      }

      toast({
        title: successCount > 0 ? 'Import Berhasil' : 'Import Gagal',
        description: message,
        variant: successCount > 0 ? 'default' : 'destructive',
      });

      if (errors.length > 0 && errors.length <= 5) {
        console.log('Import errors:', errors);
      }
    } catch (error) {
      console.error('Error importing Excel:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Gagal mengimpor data dari Excel",
        variant: "destructive" as const,
      });
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      e.target.value = '';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold">Manajemen Alat Berat</h1>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari alat berat..."
              className="w-full appearance-none bg-background pl-8 shadow-none"
              value={searchQuery}
              onChange={handleSearchInputChange}
              ref={searchInputRef}
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
          {canImport && (
            <Button
              onClick={handleImportClick}
              variant="outline"
              disabled={isImporting}
              className="w-full sm:w-auto"
            >
              <Upload className="mr-2 h-4 w-4" />
              {isImporting ? 'Mengimpor...' : 'Import Excel'}
            </Button>
          )}
          {canExportExcel && (
            <Button onClick={() => handleExportToExcel()} variant="outline" className="w-full sm:w-auto">
              <FileDown className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Alat Berat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Jumlah keseluruhan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Baik</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.baik}</div>
            <p className="text-xs text-muted-foreground">Dalam kondisi baik</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.maintenance}</div>
            <p className="text-xs text-muted-foreground">Sedang perbaikan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rusak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rusak}</div>
            <p className="text-xs text-muted-foreground">Dalam perbaikan</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold">Data Alat Berat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 mb-6">
            {/* Row 1: Cetak & Tambah Alat (Stacked, same length) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {canPrint && (
                <Button
                  onClick={handlePrint}
                  disabled={filteredData.length === 0 || isPrinting}
                  className="w-full justify-center text-xs sm:text-sm h-10"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  {isPrinting ? 'Mencetak...' : 'Cetak'}
                </Button>
              )}
              {canCreate && (
                <AddAlatBeratDialog
                  onSubmit={handleAddAlat}
                  className="w-full justify-center text-xs sm:text-sm h-10"
                />
              )}
            </div>

            {/* Row 2: Import & Export Excel (Berdampingan) */}
            <div className="grid grid-cols-2 gap-2">
              {canImport && (
                <ExcelImportButton
                  onDataParsed={handleImport}
                  className="w-full justify-center text-xs sm:text-sm h-10"
                />
              )}
              {canExportExcel && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center text-xs sm:text-sm h-10"
                  onClick={handleExportToExcel}
                  disabled={filteredData.length === 0}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Ekspor Excel
                </Button>
              )}
            </div>

            {/* Row 3: Pencarian (Dibawah import ekspor) */}
            <div className="relative w-full max-w-md mt-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari alat berat..."
                className="pl-8 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <TableScrollWrapper className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Lambung</TableHead>
                  <TableHead>Nama Alat</TableHead>
                  <TableHead>Merk</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>No. Seri</TableHead>
                  <TableHead>Tahun</TableHead>
                  <TableHead>Kepemilikan</TableHead>
                  <TableHead>Harga Sewa</TableHead>
                  <TableHead>Lokasi Saat Ini</TableHead>
                  <TableHead>Lokasi Sebelumnya</TableHead>
                  <TableHead>Kondisi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Service Terakhir</TableHead>
                  <TableHead>Service Berikutnya</TableHead>
                  <TableHead>Masa Aktif SILO</TableHead>
                  <TableHead>Foto</TableHead>
                  {canShowActions && <TableHead className="text-right">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={canShowActions ? 17 : 16} className="text-center py-4">
                      Memuat data...
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canShowActions ? 17 : 16} className="text-center py-4">
                      {searchQuery ? 'Tidak ada data yang cocok dengan pencarian' : 'Tidak ada data alat berat'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginateData(filteredData, currentPage, pageSize).map((item: LocalAlatBerat) => (
                    <React.Fragment key={item.id}>
                      <TableRow
                        className={expandedRowId === item.id ? 'bg-blue-50/40' : ''}
                      >
                        <TableCell
                          className="cursor-pointer hover:text-blue-600 hover:underline font-mono text-sm"
                          onClick={() => handleRowClick(item.id)}
                          title="Klik untuk melihat detail alat"
                        >
                          {item.noLambung || '-'}
                        </TableCell>
                        <TableCell
                          className="font-medium cursor-pointer hover:text-blue-600 hover:underline"
                          onClick={() => handleRowClick(item.id)}
                          title="Klik untuk melihat detail alat"
                        >
                          {item.namaAlat}
                        </TableCell>
                        <TableCell>{item.merk || '-'}</TableCell>
                        <TableCell>{item.tipe || '-'}</TableCell>
                        <TableCell>{item.noSeri || '-'}</TableCell>
                        <TableCell>{item.tahunPembuatan || '-'}</TableCell>
                        <TableCell>{item.kepemilikan || '-'}</TableCell>
                        <TableCell>
                          {item.harga_sewa ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.harga_sewa) : '-'}
                        </TableCell>
                        <TableCell>{item.lokasi_saat_ini || item.lokasi || '-'}</TableCell>
                        <TableCell>{item.lokasi_sebelum || item.lokasi_sebelumnya || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(item.kondisi || '')}
                            <span className={getStatusColor(item.kondisi || '')}>
                              {item.kondisi ? item.kondisi.charAt(0).toUpperCase() + item.kondisi.slice(1).toLowerCase() : '-'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${item.status === 'sedang digunakan'
                              ? 'bg-blue-100 text-blue-800'
                              : item.status === 'non-aktif' || item.status === 'Non-aktif'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                            {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase() : 'Aktif'}
                          </span>
                        </TableCell>
                        <TableCell>{item.serviceTerakhir ? formatDateDisplay(item.serviceTerakhir) : '-'}</TableCell>
                        <TableCell>{item.serviceBerikutnya ? formatDateDisplay(item.serviceBerikutnya) : '-'}</TableCell>
                        <TableCell>
                          {(() => {
                            const silo = item.noLambung ? siloByNoLambung.get(item.noLambung.trim().toUpperCase()) : undefined;
                            if (!silo) {
                              return <span className="text-slate-400 text-xs italic">-</span>;
                            }
                            const sisa = silo.sisa_hari !== undefined && silo.sisa_hari !== null
                              ? silo.sisa_hari
                              : (silo.tanggal_selesai ? Math.ceil((new Date(silo.tanggal_selesai).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)) : undefined);
                            const badge = getSisaHariBadge(sisa);
                            return (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-[11px] text-slate-700 whitespace-nowrap">
                                  <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                                  <span>{formatDateDisplay(silo.tanggal_berlaku)}</span>
                                  <span className="text-slate-400">s/d</span>
                                  <span className="font-medium">{formatDateDisplay(silo.tanggal_selesai)}</span>
                                </div>
                                {badge && (
                                  <div>
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border inline-block ${badge.className}`}>
                                      {badge.text}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const fotos = parseFotoList(item.foto);
                            if (fotos.length === 0) {
                              return <span className="text-slate-400 text-xs italic">—</span>;
                            }
                            return (
                              <button
                                onClick={() => setFotoModal({ src: fotos, alt: item.namaAlat || item.noLambung || 'Foto Alat' })}
                                className="group relative block h-10 w-10 rounded-md overflow-hidden border border-slate-200 hover:border-blue-400 hover:ring-2 hover:ring-blue-300 transition-all shadow-sm cursor-pointer"
                                title={`Klik untuk melihat galeri (${fotos.length} Foto)`}
                              >
                                <img
                                  src={fotos[0]}
                                  alt={item.namaAlat || 'Foto Alat'}
                                  className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                                />
                                {fotos.length > 1 ? (
                                  <span className="absolute bottom-0 right-0 bg-blue-600 text-white text-[9px] font-bold px-1 rounded-tl shadow">
                                    +{fotos.length - 1}
                                  </span>
                                ) : (
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                    <span className="opacity-0 group-hover:opacity-100 text-white text-[9px] font-bold">🔍</span>
                                  </div>
                                )}
                              </button>
                            );
                          })()}
                        </TableCell>
                        {canShowActions && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <ViewAlatBeratDialog alatBerat={item} />
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    // Find original AlatBerat item to preserve complete types
                                    const originalItem = alatBeratData.find(a => a.id === item.id) || (item as unknown as AlatBerat);
                                    setEditDialogOpen(originalItem);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(item.id)}
                                  disabled={isDeleting}
                                >
                                  <Trash className="h-4 w-4 text-red-600" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                      {expandedRowId === item.id && (
                        <AlatDetailPopup
                          key={`detail-${item.id}`}
                          noLambung={item.noLambung || ''}
                          namaAlat={item.namaAlat || ''}
                          colSpan={canShowActions ? 16 : 15}
                          onClose={() => setExpandedRowId(null)}
                        />
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </TableScrollWrapper>

          {/* Foto Lightbox */}
          {fotoModal && (
            <FotoViewerModal
              src={fotoModal.src}
              alt={fotoModal.alt}
              onClose={() => setFotoModal(null)}
            />
          )}
          <SimplePagination
            currentPage={currentPage}
            totalPages={getTotalPages(filteredData.length, pageSize)}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            totalItems={filteredData.length}
          />
        </CardContent>
      </Card>

      {/* Print content will be generated dynamically */}



      {/* Edit Dialog */}
      {editDialogOpen && (
        <EditAlatBeratDialog
          alatBerat={editDialogOpen}
          open={!!editDialogOpen}
          onOpenChange={(isOpen) => {
            if (!isOpen) setEditDialogOpen(null);
          }}
          onSubmit={handleUpdateAlat}
        />
      )}
    </div>
  );
};

export default DataAlatBerat;
