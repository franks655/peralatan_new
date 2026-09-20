import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Printer, Trash, Download } from 'lucide-react';
import { AddBiayaKendaraanDialog } from '@/components/dialogs/AddBiayaKendaraanDialog';
import { ViewBiayaKendaraanDialog } from '@/components/dialogs/ViewBiayaKendaraanDialog';
import { EditBiayaKendaraanDialog } from '@/components/dialogs/EditBiayaKendaraanDialog';
import { useToast } from '@/components/ui/use-toast';
import {
  useBiayaKendaraan,
  useAddBiayaKendaraan,
  useUpdateBiayaKendaraan,
  useDeleteBiayaKendaraan,
} from '@/hooks/useBiayaKendaraan';
import { useKendaraan } from '@/hooks/useKendaraan';
import { usePagePermission } from '@/hooks/usePagePermission';
import { exportToExcel } from '@/lib/excelUtils';
import { SimplePagination, paginateData, getTotalPages } from '@/components/ui/SimplePagination';
import { TableScrollWrapper } from '@/components/ui/TableScrollWrapper';
import { formatDateDisplay } from '@/utils/dateUtils';

import type { BiayaKendaraan } from '@/types';

/* ------------------------------------------------------------------ */
/* Helper format                                                       */
/* ------------------------------------------------------------------ */

const formatTgl = (v?: string | null): string => {
  if (!v) return '';
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : formatDateDisplay(v);
};

const tampil = (v: unknown): string =>
  v === null || v === undefined || String(v).trim() === '' ? '-' : String(v);

const rupiah = (v: unknown): string => {
  const n = Number(v);
  return v === null || v === undefined || !Number.isFinite(n) ? '-' : `Rp ${n.toLocaleString('id-ID')}`;
};

const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/* ------------------------------------------------------------------ */
/* Definisi kolom: satu sumber untuk tabel, print & Excel               */
/* ------------------------------------------------------------------ */

interface KolomDef {
  header: string;
  get: (b: BiayaKendaraan) => string | number | null | undefined;
  cls?: string;
}

const KOLOM: KolomDef[] = [
  { header: 'Nomor Polisi', get: (b) => b.noLambung, cls: 'font-bold whitespace-nowrap' },
  { header: 'Tanggal', get: (b) => formatTgl(b.tanggal), cls: 'whitespace-nowrap' },
  { header: 'Jenis Perawatan', get: (b) => b.jenisPerawatan, cls: 'min-w-[110px] whitespace-normal' },
  { header: 'Nama Barang/Jasa', get: (b) => b.namaBarangJasa, cls: 'min-w-[160px] whitespace-normal' },
  { header: 'Volume', get: (b) => b.volume, cls: 'text-right whitespace-nowrap' },
  { header: 'Satuan', get: (b) => b.satuan, cls: 'whitespace-nowrap' },
  { header: 'Harga Satuan', get: (b) => rupiah(b.hargaSatuan), cls: 'text-right whitespace-nowrap' },
  { header: 'Total', get: (b) => rupiah(b.total ?? b.volume * b.hargaSatuan), cls: 'text-right font-bold whitespace-nowrap' },
  { header: 'Tempat', get: (b) => b.tempat, cls: 'min-w-[110px] whitespace-normal' },
];

/* ------------------------------------------------------------------ */
/* Halaman                                                             */
/* ------------------------------------------------------------------ */

const BiayaKendaraanTab = () => {
  const { toast } = useToast();

  const [selectedNoPol, setSelectedNoPol] = useState<string>('semua');
  const [appliedNoPol, setAppliedNoPol] = useState<string>('semua');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [isPrinting, setIsPrinting] = useState(false);

  const {
    can_create: canCreate,
    can_edit: canEdit,
    can_delete: canDelete,
    can_export_excel: canExportExcel,
    can_print: canPrint,
  } = usePagePermission('biayaKendaraan');
  const canShowActions = canEdit || canDelete || true; // "Lihat" selalu tampil
  const totalKolom = KOLOM.length + 1; // +1 kolom Aksi

  const { data: biayaData = [], isLoading } = useBiayaKendaraan();
  const { data: kendaraanData = [] } = useKendaraan();
  const addMutation = useAddBiayaKendaraan();
  const updateMutation = useUpdateBiayaKendaraan();
  const deleteMutation = useDeleteBiayaKendaraan();

  /** Opsi dropdown filter: gabungan nomor polisi dari data kendaraan + data biaya */
  const opsiNoPol = useMemo(() => {
    const set = new Set<string>();
    kendaraanData.forEach((k) => k.noLambung && set.add(k.noLambung));
    biayaData.forEach((b) => b.noLambung && set.add(b.noLambung));
    return Array.from(set).sort();
  }, [kendaraanData, biayaData]);

  const handleAdd = async (data: any) => {
    await addMutation.mutateAsync(data);
  };

  const handleUpdate = async (data: BiayaKendaraan) => {
    try {
      await updateMutation.mutateAsync(data);
      toast({ title: 'Berhasil', description: 'Data biaya kendaraan berhasil diupdate' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Gagal mengupdate data biaya kendaraan',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (confirm('Apakah Anda yakin ingin menghapus data biaya kendaraan ini?')) {
      try {
        await deleteMutation.mutateAsync(id);
        toast({ title: 'Berhasil', description: 'Data biaya kendaraan berhasil dihapus' });
      } catch {
        toast({
          title: 'Error',
          description: 'Gagal menghapus data biaya kendaraan',
          variant: 'destructive',
        });
      }
    }
  };

  const filteredData = useMemo((): BiayaKendaraan[] => {
    if (appliedNoPol === 'semua') return biayaData;
    return biayaData.filter((b) => b.noLambung === appliedNoPol);
  }, [biayaData, appliedNoPol]);

  const totalKeseluruhan = useMemo(
    () => filteredData.reduce((sum, b) => sum + (b.total ?? b.volume * b.hargaSatuan), 0),
    [filteredData]
  );

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
      if (!printWindow) throw new Error('Gagal membuka jendela cetak');

      const currentDate = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const headRow = KOLOM.map((c) => `<th>${esc(c.header)}</th>`).join('');
      const tableRows = filteredData
        .map((item) => `<tr>${KOLOM.map((c) => `<td>${esc(tampil(c.get(item)))}</td>`).join('')}</tr>`)
        .join('');

      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Cetak Database Pengeluaran Biaya Kendaraan</title>
            <style>
              @page { size: A4 landscape; margin: 0.8cm; }
              body { font-family: Arial, sans-serif; margin: 0; padding: 12px; color: #333; }
              .header { text-align: left; margin-bottom: 12px; border-bottom: 2px solid #000; padding-bottom: 8px; }
              .company-name { font-weight: bold; font-size: 14px; margin-bottom: 2px; }
              .company-division { font-size: 12px; }
              .title-section { text-align: center; margin-bottom: 10px; }
              h1 { text-align: center; margin: 0 0 6px 0; color: #1a1a1a; font-size: 16px; }
              .print-date { color: #666; font-size: 11px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9px; table-layout: auto; }
              th { background-color: #1e293b; color: #fff; text-align: left; font-weight: bold; padding: 4px; border: 1px solid #999; }
              td { padding: 4px; border: 1px solid #ccc; vertical-align: top; word-break: break-word; }
              tr:nth-child(even) { background-color: #f9f9f9; }
              .footer { margin-top: 12px; text-align: right; font-size: 11px; color: #666; }
              .grand-total { margin-top: 4px; text-align: right; font-size: 13px; font-weight: bold; color: #111; }
              th, td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="company-name">PT. REKA UTAMA PERSADA</div>
              <div class="company-division">Divisi Infrastruktur - Peralatan</div>
            </div>
            <div class="title-section">
              <h1>Database Pengeluaran Biaya Kendaraan</h1>
              <div class="print-date">
                Filter Nomor Polisi: ${esc(appliedNoPol === 'semua' ? 'Semua' : appliedNoPol)} &middot;
                Dicetak pada: ${esc(currentDate)}
              </div>
            </div>

            <table>
              <thead><tr>${headRow}</tr></thead>
              <tbody>${tableRows}</tbody>
            </table>

            <div class="grand-total">Total Keseluruhan: ${esc(rupiah(totalKeseluruhan))}</div>
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
  }, [filteredData, appliedNoPol, totalKeseluruhan, toast]);

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
        KOLOM.forEach((c) => {
          row[c.header] = c.get(item) ?? '';
        });
        row['Keterangan'] = item.keterangan || '';
        return row;
      });

      exportToExcel(exportData, `Database_Biaya_Kendaraan_${new Date().toISOString().split('T')[0]}`);

      toast({ title: 'Berhasil', description: 'Data biaya kendaraan berhasil diekspor ke Excel' });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: 'Error',
        description: 'Gagal mengekspor data ke Excel',
        variant: 'destructive',
      });
    }
  }, [filteredData, toast]);

  /* ----------------------------- RENDER ----------------------------- */
  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto w-full max-w-[1800px] px-4 py-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Database Pengeluaran Biaya Kendaraan</h1>
          <div className="flex flex-wrap items-center gap-2">
            {canCreate && (
              <AddBiayaKendaraanDialog
                onSubmit={handleAdd}
                daftarKendaraan={kendaraanData}
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

        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 max-w-xs space-y-1">
            <label className="text-sm text-gray-600">Filter Nomor Polisi</label>
            <select
              value={selectedNoPol}
              onChange={(e) => setSelectedNoPol(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="semua">Semua</option>
              {opsiNoPol.map((nopol) => (
                <option key={nopol} value={nopol}>
                  {nopol}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={() => {
              setAppliedNoPol(selectedNoPol);
              setCurrentPage(1);
            }}
            className="h-10 bg-blue-600 text-white hover:bg-blue-700"
          >
            Filter
          </Button>
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
              {paginateData(filteredData, currentPage, pageSize).map((item: BiayaKendaraan) => (
                <TableRow key={item.id}>
                  {KOLOM.map((c) => (
                    <TableCell key={c.header} className={`px-2 py-2 text-xs align-top ${c.cls ?? ''}`}>
                      {tampil(c.get(item))}
                    </TableCell>
                  ))}
                  {canShowActions && (
                    <TableCell className="px-2 py-2 align-top">
                      <div className="flex items-center gap-1">
                        <ViewBiayaKendaraanDialog biaya={item} />
                        {canEdit && (
                          <EditBiayaKendaraanDialog
                            biaya={item}
                            onSubmit={handleUpdate}
                            daftarKendaraan={kendaraanData}
                          />
                        )}
                        {canDelete && (
                          <Button
                            size="sm"
                            title="Hapus"
                            onClick={() => handleDelete(item.id)}
                            disabled={deleteMutation.isPending}
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
              ))}
              {filteredData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={totalKolom} className="text-center py-4">
                    Belum ada data pengeluaran biaya kendaraan
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

        {filteredData.length > 0 && (
          <div className="flex justify-end">
            <div className="rounded-md bg-slate-50 border border-slate-200 px-4 py-2">
              <span className="text-sm text-slate-500 mr-2">Total Keseluruhan:</span>
              <span className="text-sm font-bold text-slate-800">{rupiah(totalKeseluruhan)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BiayaKendaraanTab;
