import React, { useState, useMemo, useCallback } from 'react';
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
import { Printer, Trash, FileDown, MapPin, Calendar, User, Search, FolderKanban } from 'lucide-react';
import { AddLokasiProyekDialog } from '@/components/dialogs/AddLokasiProyekDialog';
import { EditLokasiProyekDialog } from '@/components/dialogs/EditLokasiProyekDialog';
import { ViewLokasiProyekDialog } from '@/components/dialogs/ViewLokasiProyekDialog';
import { LokasiProyekDetailDialog } from '@/components/dialogs/LokasiProyekDetailDialog';
import { useToast } from '@/components/ui/use-toast';
import {
  useLokasiProyek,
  useAddLokasiProyek,
  useUpdateLokasiProyek,
  useDeleteLokasiProyek,
} from '@/hooks/useLokasiProyek';
import { exportToExcel } from '@/lib/excelUtils';
import { SimplePagination, paginateData, getTotalPages } from '@/components/ui/SimplePagination';
import { TableScrollWrapper } from '@/components/ui/TableScrollWrapper';
import { formatDateDisplay } from '@/utils/dateUtils';
import type { LokasiProyek } from '@/types';

const LokasiProyekPage: React.FC = () => {
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedProyek, setSelectedProyek] = useState<LokasiProyek | null>(null);

  const { data: proyekList = [], isLoading } = useLokasiProyek();
  const addMutation = useAddLokasiProyek();
  const updateMutation = useUpdateLokasiProyek();
  const deleteMutation = useDeleteLokasiProyek();

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleAdd = async (data: Omit<LokasiProyek, 'id'>) => {
    await addMutation.mutateAsync(data);
  };

  const handleUpdate = async (data: LokasiProyek) => {
    try {
      await updateMutation.mutateAsync(data);
      toast({
        title: 'Berhasil',
        description: 'Data lokasi proyek berhasil diperbarui',
      });
    } catch (error: any) {
      toast({
        title: 'Gagal',
        description: error?.message || 'Gagal memperbarui data lokasi proyek',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleDelete = async (id: string, nama: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus data proyek "${nama}"?`)) {
      try {
        await deleteMutation.mutateAsync(id);
        toast({
          title: 'Berhasil',
          description: 'Data lokasi proyek berhasil dihapus',
        });
      } catch (error: any) {
        toast({
          title: 'Gagal',
          description: error?.message || 'Gagal menghapus data lokasi proyek',
          variant: 'destructive',
        });
      }
    }
  };

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return proyekList;
    const q = searchQuery.toLowerCase();
    return proyekList.filter(
      (p) =>
        p.namaProyek?.toLowerCase().includes(q) ||
        p.lokasi?.toLowerCase().includes(q) ||
        p.kepalaProyek?.toLowerCase().includes(q) ||
        p.keterangan?.toLowerCase().includes(q) ||
        p.status?.toLowerCase().includes(q)
    );
  }, [proyekList, searchQuery]);

  const stats = useMemo(() => {
    const total = proyekList.length;
    const aktif = proyekList.filter((p) => !p.status || p.status.toLowerCase() === 'aktif').length;
    const selesai = proyekList.filter((p) => p.status?.toLowerCase() === 'selesai').length;
    const ditunda = proyekList.filter((p) => p.status?.toLowerCase() === 'ditunda').length;
    return { total, aktif, selesai, ditunda };
  }, [proyekList]);

  // Export to Excel
  const handleExportToExcel = useCallback(() => {
    if (filteredData.length === 0) {
      toast({
        title: 'Tidak ada data',
        description: 'Tidak ada data yang bisa diekspor.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const dataToExport = filteredData.map((item, idx) => ({
        'No': idx + 1,
        'Nama Proyek': item.namaProyek,
        'Lokasi': item.lokasi,
        'Tanggal Mulai Proyek': item.tanggalMulaiProyek ? formatDateDisplay(item.tanggalMulaiProyek) : '-',
        'Kepala Proyek': item.kepalaProyek || '-',
        'Status': item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Aktif',
        'Keterangan': item.keterangan || '-',
      }));

      exportToExcel(dataToExport, `Data_Lokasi_Proyek_${new Date().toISOString().split('T')[0]}`);
      toast({
        title: 'Ekspor Berhasil',
        description: 'Data lokasi proyek berhasil diekspor ke Excel',
      });
    } catch (error) {
      console.error('Error export excel:', error);
      toast({
        title: 'Error',
        description: 'Gagal mengekspor data ke Excel',
        variant: 'destructive',
      });
    }
  }, [filteredData, toast]);

  // Export to PDF
  const handleExportPDF = useCallback(async () => {
    if (filteredData.length === 0) {
      toast({
        title: 'Tidak ada data',
        description: 'Tidak ada data yang bisa diekspor.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('PT. REKA UTAMA PERSADA', 14, 15);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Divisi Infrastruktur - Laporan Proyek', 14, 21);

      doc.setLineWidth(0.5);
      doc.line(14, 25, 283, 25);

      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text('DATA LOKASI PROYEK', 148, 33, { align: 'center' });

      const currentDate = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text(`Dicetak pada: ${currentDate}`, 148, 39, { align: 'center' });

      const tableColumn = ['No', 'Nama Proyek', 'Lokasi', 'Tgl Mulai Proyek', 'Kepala Proyek', 'Status', 'Keterangan'];
      const tableRows = filteredData.map((item, idx) => [
        idx + 1,
        item.namaProyek,
        item.lokasi,
        item.tanggalMulaiProyek ? formatDateDisplay(item.tanggalMulaiProyek) : '-',
        item.kepalaProyek || '-',
        item.status ? item.status.toUpperCase() : 'AKTIF',
        item.keterangan || '-',
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      });

      doc.save(`Data_Lokasi_Proyek_${new Date().toISOString().split('T')[0]}.pdf`);
      toast({
        title: 'Ekspor Berhasil',
        description: 'Data berhasil diekspor ke PDF',
      });
    } catch (error) {
      console.error('Error export PDF:', error);
      toast({
        title: 'Gagal Ekspor',
        description: 'Terjadi kesalahan saat mengekspor ke PDF',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  }, [filteredData, toast]);

  // Print function
  const handlePrint = useCallback(() => {
    if (filteredData.length === 0) {
      toast({
        title: 'Tidak ada data',
        description: 'Tidak ada data yang bisa dicetak.',
        variant: 'destructive',
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

      const tableRows = filteredData
        .map(
          (item, idx) => `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">${item.namaProyek}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.lokasi}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.tanggalMulaiProyek ? formatDateDisplay(item.tanggalMulaiProyek) : '-'
            }</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.kepalaProyek || '-'}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.status || 'Aktif'}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${item.keterangan || '-'}</td>
        </tr>
      `
        )
        .join('');

      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Cetak Data Lokasi Proyek</title>
            <style>
              @page { size: A4 landscape; margin: 1cm; }
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
              .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
              .company { font-weight: bold; font-size: 14px; }
              .division { font-size: 12px; color: #555; }
              h1 { text-align: center; margin: 10px 0; font-size: 18px; }
              .meta { text-align: center; font-size: 11px; color: #666; margin-bottom: 15px; }
              table { width: 100%; border-collapse: collapse; font-size: 12px; }
              th { background-color: #f1f5f9; padding: 8px; border: 1px solid #cbd5e1; text-align: left; }
              td { border: 1px solid #cbd5e1; padding: 8px; }
              tr:nth-child(even) { background-color: #f8fafc; }
              .footer { margin-top: 15px; text-align: right; font-size: 11px; color: #64748b; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="company">PT. REKA UTAMA PERSADA</div>
              <div class="division">Divisi Infrastruktur - Laporan Proyek</div>
            </div>
            <h1>DATA LOKASI PROYEK</h1>
            <div class="meta">Dicetak pada: ${currentDate}</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 40px; text-align: center;">No</th>
                  <th>Nama Proyek</th>
                  <th>Lokasi</th>
                  <th style="text-align: center;">Tgl Mulai</th>
                  <th>Kepala Proyek</th>
                  <th style="text-align: center;">Status</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
            <div class="footer">Total Data: ${filteredData.length} Proyek</div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  setTimeout(function() { window.close(); }, 500);
                }, 400);
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();
      setIsPrinting(false);
    } catch (err) {
      console.error('Print error:', err);
      setIsPrinting(false);
      toast({
        title: 'Gagal mencetak',
        description: 'Pastikan pop-up diizinkan pada browser Anda',
        variant: 'destructive',
      });
    }
  }, [filteredData, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="text-gray-500 text-sm">Memuat data lokasi proyek...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-6 space-y-6">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FolderKanban className="h-7 w-7 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-800">Lokasi Proyek</h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Daftar lokasi proyek, tanggal mulai pelaksanaan, dan penanggung jawab
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportToExcel}
              className="flex items-center gap-2"
            >
              <FileDown className="h-4 w-4" />
              Export Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex items-center gap-2"
            >
              <FileDown className="h-4 w-4" />
              {isExporting ? 'Mengekspor...' : 'Export PDF'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              {isPrinting ? 'Mencetak...' : 'Cetak'}
            </Button>
            <AddLokasiProyekDialog onSubmit={handleAdd} />
          </div>
        </div>

        {/* Statistic Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Proyek</h3>
            <p className="text-3xl font-extrabold text-slate-800 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Proyek Berjalan / Aktif</h3>
            <p className="text-3xl font-extrabold text-emerald-600 mt-1">{stats.aktif}</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Proyek Selesai</h3>
            <p className="text-3xl font-extrabold text-blue-600 mt-1">{stats.selesai}</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Proyek Ditunda</h3>
            <p className="text-3xl font-extrabold text-amber-600 mt-1">{stats.ditunda}</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari nama proyek, lokasi, kepala proyek..."
              value={searchQuery}
              onChange={handleSearch}
              className="pl-9 bg-white"
            />
          </div>
        </div>

        {/* Table */}
        <TableScrollWrapper className="border rounded-lg bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>Nama Proyek</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead>Tgl Mulai Proyek</TableHead>
                <TableHead>Kepala Proyek</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginateData(filteredData, currentPage, pageSize).map((item, idx) => {
                const rowIndex = (currentPage - 1) * pageSize + idx + 1;
                return (
                  <TableRow key={item.id} className="hover:bg-slate-50/60">
                    <TableCell className="text-center font-mono text-xs text-slate-500">{rowIndex}</TableCell>
                    <TableCell className="font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
                        <button
                          className="text-left hover:text-blue-700 hover:underline underline-offset-2 transition-colors cursor-pointer"
                          onClick={() => setSelectedProyek(item)}
                          title="Klik untuk melihat rincian biaya proyek"
                        >
                          {item.namaProyek}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell
                      className="text-slate-600 hover:text-blue-600 cursor-pointer hover:underline underline-offset-2 transition-colors"
                      onClick={() => setSelectedProyek(item)}
                      title="Klik untuk melihat rincian biaya proyek"
                    >
                      {item.lokasi}
                    </TableCell>
                    <TableCell className="text-slate-600 whitespace-nowrap">
                      {item.tanggalMulaiProyek ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{formatDateDisplay(item.tanggalMulaiProyek)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-700">
                      {item.kepalaProyek ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span>{item.kepalaProyek}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${item.status === 'selesai'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : item.status === 'ditunda'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                      >
                        {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Aktif'}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs max-w-xs truncate" title={item.keterangan || ''}>
                      {item.keterangan || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center space-x-1">
                        <ViewLokasiProyekDialog proyek={item} />
                        <EditLokasiProyekDialog proyek={item} onSubmit={handleUpdate} />
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Hapus Proyek"
                          onClick={() => handleDelete(item.id, item.namaProyek)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {filteredData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    {searchQuery ? 'Tidak ada lokasi proyek yang sesuai dengan pencarian' : 'Belum ada data lokasi proyek'}
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

      {/* Detail Dialog */}
      <LokasiProyekDetailDialog
        proyek={selectedProyek}
        open={selectedProyek !== null}
        onClose={() => setSelectedProyek(null)}
      />
    </div>
  );
};

export default LokasiProyekPage;


