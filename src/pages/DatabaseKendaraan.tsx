import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Printer, Trash, Download, FileText, Upload } from 'lucide-react';
import { AddKendaraanDialog } from '@/components/dialogs/AddKendaraanDialog';
import { ViewKendaraanDialog } from '@/components/dialogs/ViewKendaraanDialog';
import { EditKendaraanDialog } from '@/components/dialogs/EditKendaraanDialog';
import { useToast } from '@/components/ui/use-toast';
import { useKendaraan, useAddKendaraan, useDeleteKendaraan, useUpdateKendaraan } from '@/hooks/useKendaraan';
import { usePagePermission } from '@/hooks/usePagePermission';
import { exportToExcel, importFromExcel } from '@/lib/excelUtils';
import { SimplePagination, paginateData, getTotalPages } from '@/components/ui/SimplePagination';
import AlatDetailPopup from '@/components/AlatDetailPopup';
import { TableScrollWrapper } from '@/components/ui/TableScrollWrapper';
import JadwalPajakStnk from '@/pages/Jadwalpajakstnk';
import BiayaKendaraanTab from '@/pages/BiayaKendaraanTab';
import DashboardKendaraanTab from '@/pages/DashboardKendaraanTab';
import { formatDateDisplay, normalizeDateOnly } from '@/utils/dateUtils';

import type { Kendaraan } from '@/types';

/* ------------------------------------------------------------------ */
/* Helper format                                                       */
/* ------------------------------------------------------------------ */

/** yyyy-mm-dd -> dd-mm-yyyy (sesuai tampilan tabel). Kosong -> '' */
const formatTgl = (v?: string | null): string => {
  if (!v) return '';
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : formatDateDisplay(v);
};

const tampil = (v: unknown): string =>
  v === null || v === undefined || String(v).trim() === '' ? '-' : String(v);

const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/* ------------------------------------------------------------------ */
/* Definisi kolom: SATU sumber untuk tabel, print, PDF & Excel         */
/* ------------------------------------------------------------------ */

interface KolomDef {
  header: string;
  get: (k: Kendaraan) => string | number | null | undefined;
  cls?: string; // class tambahan untuk sel di tabel
}

const KOLOM: KolomDef[] = [
  { header: 'Nomor Polisi', get: (k) => k.noLambung, cls: 'font-bold whitespace-nowrap' },
  { header: 'Nama Pemilik', get: (k) => k.namaPemilik, cls: 'min-w-[130px] whitespace-normal' },
  { header: 'Alamat', get: (k) => k.alamatPemilik, cls: 'min-w-[200px] whitespace-normal' },
  { header: 'Merk', get: (k) => k.merk },
  { header: 'Type', get: (k) => k.tipe, cls: 'min-w-[110px] whitespace-normal' },
  { header: 'Jenis', get: (k) => k.jenisAlat, cls: 'min-w-[80px] whitespace-normal' },
  { header: 'Model', get: (k) => k.model, cls: 'min-w-[80px] whitespace-normal' },
  { header: 'Tahun Pembuatan', get: (k) => k.tahunPembuatan },
  { header: 'Isi Silinder', get: (k) => k.isiSilinder },
  { header: 'Nomor Rangka', get: (k) => k.nomorRangka },
  { header: 'Nomor Mesin', get: (k) => k.nomorMesin },
  { header: 'Warna TNKB', get: (k) => k.warnaTnkb, cls: 'min-w-[70px] whitespace-normal' },
  { header: 'Tahun Registrasi', get: (k) => k.tahunRegistrasi },
  { header: 'Nomor BPKB', get: (k) => k.nomorBpkb },
  { header: 'Tgl Berlaku STNK', get: (k) => formatTgl(k.tglBerlakuStnk), cls: 'whitespace-nowrap' },
  { header: 'Tgl Berlaku Pajak', get: (k) => formatTgl(k.tglBerlakuPajak), cls: 'whitespace-nowrap' },
  { header: 'Pengguna', get: (k) => k.pengguna, cls: 'min-w-[90px] whitespace-normal' },
];

/* ------------------------------------------------------------------ */
/* Helper import Excel                                                 */
/* ------------------------------------------------------------------ */

const normKey = (k: string): string =>
  String(k).trim().toLowerCase().replace(/[\s._-]+/g, ' ');

const ALIAS_NOPOL = ['Nomor Polisi', 'No Polisi', 'No. Polisi', 'No Lambung', 'No. Lambung', 'No. Lambung / Plat'];

const pick = (lookup: Map<string, unknown>, ...aliases: string[]): unknown => {
  for (const a of aliases) {
    const v = lookup.get(normKey(a));
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return undefined;
};

const txt = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

const intOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  const n = parseInt(String(v).replace(/[^\d]/g, ''), 10);
  return Number.isNaN(n) ? null : n;
};

/** Terima dd-mm-yyyy, dd/mm/yyyy, yyyy-mm-dd, objek Date, atau serial Excel -> yyyy-mm-dd */
const parseTanggal = (v: unknown): string | null => {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const mm = String(v.getMonth() + 1).padStart(2, '0');
    const dd = String(v.getDate()).padStart(2, '0');
    return `${v.getFullYear()}-${mm}-${dd}`;
  }
  if (typeof v === 'number') {
    const d = new Date(Math.round((Math.floor(v) - 25569) * 86400 * 1000));
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return normalizeDateOnly(s) || null;
};

/* ------------------------------------------------------------------ */
/* Halaman                                                             */
/* ------------------------------------------------------------------ */

const DatabaseKendaraanTab = () => {
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRowClick = useCallback((id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  }, []);

  const {
    can_create: canCreate,
    can_edit: canEdit,
    can_delete: canDelete,
    can_import: canImport,
    can_export_excel: canExportExcel,
    can_print: canPrint,
  } = usePagePermission('databaseKendaraan');
  const canShowActions = canEdit || canDelete;
  const totalKolom = KOLOM.length + (canShowActions ? 1 : 0);

  const { data: kendaraanData = [], isLoading } = useKendaraan();
  const addKendaraanMutation = useAddKendaraan();
  const updateKendaraanMutation = useUpdateKendaraan();
  const deleteKendaraanMutation = useDeleteKendaraan();

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleAddKendaraan = async (data: any) => {
    await addKendaraanMutation.mutateAsync(data);
  };

  const handleUpdate = async (data: any) => {
    try {
      await updateKendaraanMutation.mutateAsync(data);
      toast({
        title: 'Berhasil',
        description: 'Data kendaraan berhasil diupdate',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Gagal mengupdate data kendaraan',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (confirm('Apakah Anda yakin ingin menghapus data kendaraan ini?')) {
      try {
        await deleteKendaraanMutation.mutateAsync(id);
        toast({
          title: 'Berhasil',
          description: 'Data kendaraan berhasil dihapus',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Gagal menghapus data kendaraan',
          variant: 'destructive',
        });
      }
    }
  };

  /** Pencarian mencakup semua kolom yang tampil + nama kendaraan */
  const filteredData = useMemo((): Kendaraan[] => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return kendaraanData;
    return kendaraanData.filter((item: Kendaraan) =>
      [item.namaAlat, ...KOLOM.map((c) => c.get(item))].some(
        (v) => v !== null && v !== undefined && String(v).toLowerCase().includes(query)
      )
    );
  }, [kendaraanData, searchQuery]);

  /* ---------------------------- PRINT ---------------------------- */
  const handlePrint = useCallback((): void => {
    if (filteredData.length === 0) {
      toast({
        title: 'Tidak ada data',
        description: 'Tidak ada data yang bisa dicetak.',
        variant: 'destructive' as const,
      });
      return;
    }

    setIsPrinting(true);

    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Gagal membuka jendela cetak');
      }

      const currentDate = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const headRow = KOLOM.map((c) => `<th>${esc(c.header)}</th>`).join('');
      const tableRows = filteredData
        .map(
          (item) =>
            `<tr>${KOLOM.map((c) => `<td>${esc(tampil(c.get(item)))}</td>`).join('')}</tr>`
        )
        .join('');

      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Cetak Database Kendaraan</title>
            <style>
              @page { size: A4 landscape; margin: 0.8cm; }
              body { font-family: Arial, sans-serif; margin: 0; padding: 12px; color: #333; }
              .header { text-align: left; margin-bottom: 12px; border-bottom: 2px solid #000; padding-bottom: 8px; }
              .company-name { font-weight: bold; font-size: 14px; margin-bottom: 2px; }
              .company-division { font-size: 12px; }
              .title-section { text-align: center; margin-bottom: 10px; }
              h1 { text-align: center; margin: 0 0 6px 0; color: #1a1a1a; font-size: 16px; }
              .print-date { color: #666; font-size: 11px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 7px; table-layout: auto; }
              th { background-color: #1e293b; color: #fff; text-align: left; font-weight: bold; padding: 3px; border: 1px solid #999; }
              td { padding: 3px; border: 1px solid #ccc; vertical-align: top; word-break: break-word; }
              tr:nth-child(even) { background-color: #f9f9f9; }
              .footer { margin-top: 12px; text-align: right; font-size: 11px; color: #666; }
              th, td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="company-name">PT. REKA UTAMA PERSADA</div>
              <div class="company-division">Divisi Infrastruktur - Peralatan</div>
            </div>
            <div class="title-section">
              <h1>Database Kendaraan</h1>
              <div class="print-date">Dicetak pada: ${esc(currentDate)}</div>
            </div>

            <table>
              <thead><tr>${headRow}</tr></thead>
              <tbody>${tableRows}</tbody>
            </table>

            <div class="footer">Total Data: ${filteredData.length}</div>

            <script>
              window.onload = function() {
                try {
                  setTimeout(function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                  }, 500);
                } catch (e) {
                  console.error('Print error:', e);
                  window.close();
                }
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();

      printWindow.onafterprint = function () {
        printWindow.close();
        setIsPrinting(false);
        toast({
          title: 'Pencetakan selesai',
          description: 'Dokumen berhasil dicetak.',
          variant: 'default' as const,
        });
      };
    } catch (error) {
      console.error('Error saat mencetak:', error);
      setIsPrinting(false);
      toast({
        title: 'Gagal mencetak',
        description: 'Terjadi kesalahan saat mencetak dokumen. Pastikan pop-up diizinkan.',
        variant: 'destructive' as const,
      });
    }
  }, [filteredData, toast]);

  /* -------------------------- EXPORT PDF -------------------------- */
  const handleExportPDF = useCallback(async () => {
    if (filteredData.length === 0) {
      toast({
        title: 'Tidak ada data',
        description: 'Tidak ada data yang bisa diekspor.',
        variant: 'destructive' as const,
      });
      return;
    }

    setIsExporting(true);

    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      // 17 kolom -> pakai A3 landscape agar tetap terbaca
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('PT. REKA UTAMA PERSADA', 14, 15);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Peralatan', 14, 22);

      doc.setLineWidth(0.5);
      doc.line(14, 26, pageWidth - 14, 26);

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Database Kendaraan', pageWidth / 2, 35, { align: 'center' });

      const currentDate = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text(`Dicetak pada: ${currentDate}`, pageWidth / 2, 42, { align: 'center' });

      autoTable(doc, {
        head: [KOLOM.map((c) => c.header)],
        body: filteredData.map((item) => KOLOM.map((c) => tampil(c.get(item)))),
        startY: 50,
        theme: 'grid',
        styles: { fontSize: 6.5, cellPadding: 1.5, overflow: 'linebreak' },
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
        margin: { left: 14, right: 14 },
      });

      doc.save(`Database_Kendaraan_${new Date().toISOString().split('T')[0]}.pdf`);

      toast({
        title: 'Ekspor Berhasil',
        description: 'Data kendaraan berhasil diekspor ke PDF',
        variant: 'default' as const,
      });
    } catch (error) {
      console.error('Error saat ekspor PDF:', error);
      toast({
        title: 'Gagal Ekspor',
        description: 'Terjadi kesalahan saat mengekspor data ke PDF.',
        variant: 'destructive' as const,
      });
    } finally {
      setIsExporting(false);
    }
  }, [filteredData, toast]);

  /* ------------------------- EXPORT EXCEL ------------------------- */
  const handleExportToExcel = useCallback(() => {
    if (filteredData.length === 0) {
      toast({
        title: 'Tidak ada data',
        description: 'Tidak ada data yang bisa diekspor.',
        variant: 'destructive' as const,
      });
      return;
    }

    try {
      const exportData = filteredData.map((item) => {
        const row: Record<string, string | number> = {};
        // 17 kolom utama (sama persis dengan tabel)
        KOLOM.forEach((c) => {
          row[c.header] = c.get(item) ?? '';
        });
        // kolom tambahan agar file bisa di-import ulang tanpa kehilangan data
        row['Nama Kendaraan'] = item.namaAlat || '';
        row['Lokasi'] = item.lokasi || '';
        row['Kondisi'] = item.kondisi || '';
        row['Status'] = item.status || '';
        row['Service Terakhir'] = formatTgl(item.serviceTerakhir);
        row['Service Berikutnya'] = formatTgl(item.serviceBerikutnya);
        row['Keterangan'] = item.keterangan || '';
        return row;
      });

      exportToExcel(exportData, `Database_Kendaraan_${new Date().toISOString().split('T')[0]}`);

      toast({
        title: 'Berhasil',
        description: 'Data kendaraan berhasil diekspor ke Excel',
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: 'Error',
        description: 'Gagal mengekspor data ke Excel',
        variant: 'destructive' as const,
      });
    }
  }, [filteredData, toast]);

  /* ------------------------- IMPORT EXCEL ------------------------- */
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const importedData: Record<string, unknown>[] = await importFromExcel(file);

      if (!importedData || importedData.length === 0) {
        toast({
          title: 'File kosong',
          description: 'Tidak ada baris data yang ditemukan di file Excel.',
          variant: 'destructive' as const,
        });
        return;
      }

      // Validasi: kolom Nomor Polisi wajib ada
      const headers = new Set(Object.keys(importedData[0]).map(normKey));
      if (!ALIAS_NOPOL.some((a) => headers.has(normKey(a)))) {
        toast({
          title: 'Error: Kolom Tidak Ditemukan',
          description: 'Kolom wajib "Nomor Polisi" tidak ada. Pastikan file Excel menggunakan header yang benar.',
          variant: 'destructive' as const,
        });
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      let firstError = '';

      for (let i = 0; i < importedData.length; i++) {
        try {
          const lk = new Map<string, unknown>(
            Object.entries(importedData[i]).map(([k, v]) => [normKey(k), v])
          );

          const noLambung = txt(pick(lk, ...ALIAS_NOPOL));
          if (!noLambung) throw new Error('Kolom "Nomor Polisi" kosong');

          const newKendaraan: Omit<Kendaraan, 'id'> = {
            noLambung,
            namaAlat: txt(pick(lk, 'Nama Kendaraan', 'Nama Alat')) || '', // kosong -> otomatis Merk + Type
            namaPemilik: txt(pick(lk, 'Nama Pemilik')),
            alamatPemilik: txt(pick(lk, 'Alamat', 'Alamat Pemilik')),
            merk: txt(pick(lk, 'Merk')),
            tipe: txt(pick(lk, 'Type', 'Tipe')),
            jenisAlat: txt(pick(lk, 'Jenis', 'Jenis Alat')),
            model: txt(pick(lk, 'Model')),
            tahunPembuatan: intOrNull(pick(lk, 'Tahun Pembuatan')),
            isiSilinder: intOrNull(pick(lk, 'Isi Silinder')),
            nomorRangka: txt(pick(lk, 'Nomor Rangka', 'No Rangka')),
            nomorMesin: txt(pick(lk, 'Nomor Mesin', 'No Mesin')),
            warnaTnkb: txt(pick(lk, 'Warna TNKB')),
            tahunRegistrasi: intOrNull(pick(lk, 'Tahun Registrasi')),
            nomorBpkb: txt(pick(lk, 'Nomor BPKB', 'No BPKB')),
            tglBerlakuStnk: parseTanggal(pick(lk, 'Tgl Berlaku STNK', 'Tanggal Berlaku STNK')),
            tglBerlakuPajak: parseTanggal(pick(lk, 'Tgl Berlaku Pajak', 'Tanggal Berlaku Pajak')),
            pengguna: txt(pick(lk, 'Pengguna')),
            lokasi: txt(pick(lk, 'Lokasi')),
            kondisi: txt(pick(lk, 'Kondisi')) || 'Baik',
            status: (txt(pick(lk, 'Status')) || 'aktif').toLowerCase(),
            keterangan: txt(pick(lk, 'Keterangan')),
            serviceTerakhir: parseTanggal(pick(lk, 'Service Terakhir', 'Service Berkala Terakhir')),
            serviceBerikutnya: parseTanggal(pick(lk, 'Service Berikutnya', 'Service Berkala Berikutnya')),
          };

          await addKendaraanMutation.mutateAsync(newKendaraan);
          successCount++;
        } catch (error: any) {
          errorCount++;
          if (!firstError) firstError = `Baris ${i + 2}: ${error?.message || 'gagal'}`;
          console.error(`Error processing row ${i + 1}:`, error);
        }
      }

      toast({
        title: successCount > 0 ? 'Import Selesai' : 'Import Gagal',
        description:
          `${successCount} data berhasil diimpor, ${errorCount} gagal.` +
          (firstError ? ` Contoh error — ${firstError}` : ''),
        variant: errorCount > 0 && successCount === 0 ? 'destructive' : 'default',
      });
    } catch (error) {
      console.error('Error importing Excel:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal mengimpor data dari Excel',
        variant: 'destructive' as const,
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      e.target.value = '';
    }
  };

  /* ----------------------------- RENDER ----------------------------- */
  if (isLoading) {
    return (
      <div>
        <div className="container mx-auto py-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-lg">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto w-full max-w-[1800px] px-4 py-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Database Kendaraan</h1>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            {canCreate && (
              <AddKendaraanDialog
                onSubmit={handleAddKendaraan}
                className="h-8 bg-emerald-600 text-white hover:bg-emerald-700 text-xs"
              />
            )}
            {canExportExcel && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportToExcel}
                className="h-8 gap-1 text-xs border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100"
              >
                <Download className="h-3.5 w-3.5" />
                Export Excel
              </Button>
            )}
            {canPrint && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={isExporting}
                className="h-8 gap-1 text-xs border-red-400 bg-red-50 text-red-600 hover:bg-red-100"
              >
                <FileText className="h-3.5 w-3.5" />
                {isExporting ? 'Mengekspor...' : 'Export PDF'}
              </Button>
            )}
            {canImport && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleImportClick}
                disabled={isImporting}
                className="h-8 gap-1 text-xs border-cyan-400 bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
              >
                <Upload className="h-3.5 w-3.5" />
                {isImporting ? 'Mengimpor...' : 'Import Excel'}
              </Button>
            )}
            {canPrint && (
              <Button
                size="sm"
                onClick={handlePrint}
                disabled={isPrinting}
                className="h-8 gap-1 text-xs bg-slate-500 text-white hover:bg-slate-600"
              >
                <Printer className="h-3.5 w-3.5" />
                {isPrinting ? 'Mencetak...' : 'Print'}
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-4">
          <Input
            placeholder="Cari nomor polisi, pemilik, rangka, mesin, pengguna..."
            value={searchQuery}
            onChange={handleSearch}
            className="max-w-md"
          />
        </div>

        <TableScrollWrapper className="border rounded-lg bg-white">
          <Table>
            <TableHeader className="!bg-slate-900">
              <TableRow className="!bg-slate-900 hover:!bg-slate-900 border-slate-800">
                {KOLOM.map((c) => (
                  <TableHead
                    key={c.header}
                    className="h-auto px-2 py-2 text-xs font-bold leading-tight !bg-slate-900 !text-white align-middle"
                  >
                    {c.header}
                  </TableHead>
                ))}
                {canShowActions && (
                  <TableHead className="h-auto px-2 py-2 text-xs font-bold leading-tight !bg-slate-900 !text-white align-middle">
                    Aksi
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginateData(filteredData, currentPage, pageSize).map((item: Kendaraan) => (
                <React.Fragment key={item.id}>
                  <TableRow className={expandedRowId === item.id ? 'bg-blue-50/40' : ''}>
                    {KOLOM.map((c, i) => (
                      <TableCell
                        key={c.header}
                        className={`px-2 py-2 text-xs align-top ${c.cls ?? ''} ${i === 0 ? 'cursor-pointer hover:text-blue-600 hover:underline' : ''
                          }`}
                        onClick={i === 0 ? () => handleRowClick(item.id) : undefined}
                        title={i === 0 ? 'Klik untuk melihat detail' : undefined}
                      >
                        {tampil(c.get(item))}
                      </TableCell>
                    ))}
                    {canShowActions && (
                      <TableCell className="px-2 py-2 align-top">
                        <div className="flex items-center gap-1">
                          <ViewKendaraanDialog kendaraan={item} />
                          {canEdit && <EditKendaraanDialog kendaraan={item} onSubmit={handleUpdate} />}
                          {canDelete && (
                            <Button
                              size="sm"
                              title="Hapus"
                              onClick={() => handleDelete(item.id)}
                              disabled={deleteKendaraanMutation.isPending}
                              className="h-7 gap-1 px-2 text-xs bg-red-500 text-white hover:bg-red-600"
                            >
                              <Trash className="h-3 w-3" />
                              Hapus
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
                      colSpan={totalKolom}
                      onClose={() => setExpandedRowId(null)}
                    />
                  )}
                </React.Fragment>
              ))}
              {filteredData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={totalKolom} className="text-center py-4">
                    {searchQuery ? 'Tidak ada data yang sesuai dengan pencarian' : 'Belum ada data kendaraan'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <SimplePagination
            currentPage={currentPage}
            totalPages={getTotalPages(filteredData.length, pageSize)}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            totalItems={filteredData.length}
          />
        </TableScrollWrapper>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Halaman dengan tab                                                  */
/* ------------------------------------------------------------------ */

type TabKey = 'dashboard' | 'database' | 'biaya' | 'jadwal';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'database', label: 'Database Kendaraan' },
  { key: 'biaya', label: 'Database Pengeluaran Biaya Kendaraan' },
  { key: 'jadwal', label: 'Jadwal Perpanjangan Pajak dan STNK' },
];

const DatabaseKendaraan = () => {
  const [tab, setTab] = useState<TabKey>('dashboard');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-[1800px] px-4 pt-4">
        <div role="tablist" aria-label="Menu kendaraan" className="flex flex-wrap gap-1 border-b border-slate-200">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`tab-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls={`panel-${t.key}`}
              onClick={() => setTab(t.key)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm transition-colors ${tab === t.key
                ? 'border-blue-600 font-medium text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Keempat tab tetap ter-mount agar pencarian/halaman tidak reset saat berpindah tab */}
      <div role="tabpanel" id="panel-dashboard" aria-labelledby="tab-dashboard" hidden={tab !== 'dashboard'}>
        <DashboardKendaraanTab />
      </div>
      <div role="tabpanel" id="panel-database" aria-labelledby="tab-database" hidden={tab !== 'database'}>
        <DatabaseKendaraanTab />
      </div>
      <div role="tabpanel" id="panel-biaya" aria-labelledby="tab-biaya" hidden={tab !== 'biaya'}>
        <BiayaKendaraanTab />
      </div>
      <div role="tabpanel" id="panel-jadwal" aria-labelledby="tab-jadwal" hidden={tab !== 'jadwal'}>
        <JadwalPajakStnk />
      </div>
    </div>
  );
};

export default DatabaseKendaraan;