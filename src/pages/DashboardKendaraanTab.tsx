import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useBiayaKendaraan } from '@/hooks/useBiayaKendaraan';
import { useKendaraan } from '@/hooks/useKendaraan';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { parseFotoList, SLOT_LABELS } from '@/utils/fotoUtils';

/* ------------------------------------------------------------------ */
/* Helper format                                                       */
/* ------------------------------------------------------------------ */

const formatTgl = (v?: string | null): string => {
  if (!v) return '-';
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : v;
};

const tampil = (v: unknown): string =>
  v === null || v === undefined || String(v).trim() === '' ? '-' : String(v);

const rupiah = (v: unknown): string => {
  const n = Number(v);
  return v === null || v === undefined || !Number.isFinite(n) ? '-' : `Rp ${n.toLocaleString('id-ID')}`;
};

/* ------------------------------------------------------------------ */
/* Halaman                                                             */
/* ------------------------------------------------------------------ */

const DashboardKendaraanTab = () => {
  const { toast } = useToast();
  const [selectedNoPol, setSelectedNoPol] = useState<string>('');

  const { data: biayaData = [], isLoading: biayaLoading } = useBiayaKendaraan();
  const { data: kendaraanData = [], isLoading: kendaraanLoading } = useKendaraan();

  // Get unique vehicle plates from both datasets
  const opsiNoPol = useMemo(() => {
    const set = new Set<string>();
    kendaraanData.forEach((k) => k.noLambung && set.add(k.noLambung));
    biayaData.forEach((b) => b.noLambung && set.add(b.noLambung));
    return Array.from(set).sort();
  }, [kendaraanData, biayaData]);

  // Set default selection if not set
  useEffect(() => {
    if (!selectedNoPol && opsiNoPol.length > 0) {
      setSelectedNoPol(opsiNoPol[0]);
    }
  }, [opsiNoPol, selectedNoPol]);

  // Get selected vehicle data
  const selectedKendaraan = useMemo(() => {
    if (!selectedNoPol) return null;
    return kendaraanData.find((k) => k.noLambung === selectedNoPol) || null;
  }, [kendaraanData, selectedNoPol]);

  // Parse foto list for selected vehicle
  const fotoList = useMemo(() => {
    if (!selectedKendaraan) return [];
    
    // Parse foto field (the main field used by the form)
    const fotos = parseFotoList(selectedKendaraan.foto);
    
    // If no fotos from foto field, try gambar field for backward compatibility
    if (fotos.length === 0 && selectedKendaraan.gambar) {
      const gambarFotos = parseFotoList(selectedKendaraan.gambar);
      return gambarFotos;
    }
    
    return fotos;
  }, [selectedKendaraan]);

  // Filter biaya data for selected vehicle
  const filteredBiaya = useMemo(() => {
    if (!selectedNoPol) return [];
    return biayaData.filter((b) => b.noLambung === selectedNoPol);
  }, [biayaData, selectedNoPol]);

  // Categorize biaya data
  const etollData = useMemo(() => 
    filteredBiaya.filter((b) => b.jenisPerawatan === 'E-toll'),
    [filteredBiaya]
  );

  const bbmData = useMemo(() => 
    filteredBiaya.filter((b) => b.jenisPerawatan === 'Biaya Pemakaian BBM'),
    [filteredBiaya]
  );

  const perbaikanData = useMemo(() => 
    filteredBiaya.filter((b) => b.jenisPerawatan === 'Biaya Perbaikan'),
    [filteredBiaya]
  );

  const handleExportPDF = async () => {
    if (!selectedKendaraan) {
      toast({
        title: 'Error',
        description: 'Pilih kendaraan terlebih dahulu',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('PT. REKA UTAMA PERSADA', 14, 15);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Divisi Infrastruktur - Peralatan', 14, 22);

      doc.setLineWidth(0.5);
      doc.line(14, 26, pageWidth - 14, 26);

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Dashboard Kendaraan', pageWidth / 2, 35, { align: 'center' });

      // Vehicle Info
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Nomor Polisi: ${selectedKendaraan.noLambung || '-'}`, 14, 45);
      doc.setFont('helvetica', 'normal');
      doc.text(`Nama: ${selectedKendaraan.namaAlat || '-'}`, 14, 52);

      let startY = 60;

      // E-Toll Table
      if (etollData.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Informasi Pemakaian E-Toll', 14, startY);
        startY += 5;

        autoTable(doc, {
          head: [['Tanggal', 'Gerbang Masuk', 'Gerbang Keluar', 'Biaya']],
          body: etollData.map((item) => [
            formatTgl(item.tanggal),
            tampil(item.gerbangMasuk),
            tampil(item.gerbangKeluar),
            rupiah(item.total ?? item.volume * item.hargaSatuan),
          ]),
          startY,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
          margin: { left: 14, right: 14 },
        });
        startY = (doc as any).lastAutoTable.finalY + 10;
      }

      // BBM Table
      if (bbmData.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Informasi Biaya Pemakaian BBM', 14, startY);
        startY += 5;

        autoTable(doc, {
          head: [['Tanggal', 'Keterangan', 'Volume', 'Total', 'Tempat']],
          body: bbmData.map((item) => [
            formatTgl(item.tanggal),
            tampil(item.namaBarangJasa),
            `${item.volume} ${item.satuan || ''}`,
            rupiah(item.total ?? item.volume * item.hargaSatuan),
            tampil(item.tempat),
          ]),
          startY,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
          margin: { left: 14, right: 14 },
        });
        startY = (doc as any).lastAutoTable.finalY + 10;
      }

      // Perbaikan Table
      if (perbaikanData.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Informasi Biaya Perbaikan', 14, startY);
        startY += 5;

        autoTable(doc, {
          head: [['Tanggal', 'Jenis', 'Barang/Jasa', 'Total', 'Tempat']],
          body: perbaikanData.map((item) => [
            formatTgl(item.tanggal),
            tampil(item.jenisPerawatan),
            tampil(item.namaBarangJasa),
            rupiah(item.total ?? item.volume * item.hargaSatuan),
            tampil(item.tempat),
          ]),
          startY,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
          margin: { left: 14, right: 14 },
        });
      }

      doc.save(`Dashboard_Kendaraan_${selectedKendaraan.noLambung}_${new Date().toISOString().split('T')[0]}.pdf`);

      toast({
        title: 'Berhasil',
        description: 'Dashboard berhasil diekspor ke PDF',
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: 'Error',
        description: 'Gagal mengekspor dashboard ke PDF',
        variant: 'destructive',
      });
    }
  };

  if (kendaraanLoading || biayaLoading) {
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
          <h1 className="text-2xl font-bold text-gray-800">Dashboard Kendaraan</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              className="h-8 gap-1 text-xs border-red-400 bg-red-50 text-red-600 hover:bg-red-100"
            >
              <FileText className="h-3.5 w-3.5" />
              Export PDF
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 max-w-xs space-y-1">
            <label className="text-sm text-gray-600">Pilih Kendaraan</label>
            <select
              value={selectedNoPol}
              onChange={(e) => setSelectedNoPol(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Pilih Kendaraan</option>
              {opsiNoPol.map((nopol) => (
                <option key={nopol} value={nopol}>
                  {nopol}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedKendaraan && (
          <div className="space-y-6">
            {/* Foto Kendaraan */}
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-bold mb-4">Foto Kendaraan</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {fotoList.length > 0 ? (
                  fotoList.map((fotoUrl, index) => (
                    <div key={index} className="text-center">
                      <div className="h-32 w-full bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border">
                        <img 
                          src={fotoUrl} 
                          alt={`Foto kendaraan ${index + 1}`}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const placeholder = document.createElement('div');
                            placeholder.className = 'text-gray-400 text-xs';
                            placeholder.innerText = 'Gagal memuat foto';
                            if (target.parentElement) {
                              target.parentElement.appendChild(placeholder);
                            }
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">{SLOT_LABELS[index] || `Foto ${index + 1}`}</p>
                    </div>
                  ))
                ) : (
                  <div className="col-span-5 text-center text-gray-400 py-8">
                    <div className="flex flex-col items-center justify-center">
                      <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm">Belum ada foto kendaraan</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Identitas Kendaraan */}
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-bold mb-4">Identitas Kendaraan</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Nomor Polisi</label>
                  <p className="text-sm font-semibold">{tampil(selectedKendaraan.noLambung)}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Nama Pemilik</label>
                  <p className="text-sm">{tampil(selectedKendaraan.namaPemilik)}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Alamat</label>
                  <p className="text-sm">{tampil(selectedKendaraan.alamatPemilik)}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Merk/Type</label>
                  <p className="text-sm">{tampil(selectedKendaraan.merk)} / {tampil(selectedKendaraan.tipe)}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Jenis/Model</label>
                  <p className="text-sm">{tampil(selectedKendaraan.jenisAlat)} / {tampil(selectedKendaraan.model)}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Tahun/CC</label>
                  <p className="text-sm">{tampil(selectedKendaraan.tahunPembuatan)} / {tampil(selectedKendaraan.isiSilinder)}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">No. Rangka</label>
                  <p className="text-sm">{tampil(selectedKendaraan.nomorRangka)}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">No. Mesin</label>
                  <p className="text-sm">{tampil(selectedKendaraan.nomorMesin)}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Warna TNKB</label>
                  <p className="text-sm">{tampil(selectedKendaraan.warnaTnkb)}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Tahun Registrasi</label>
                  <p className="text-sm">{tampil(selectedKendaraan.tahunRegistrasi)}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">No. BPKB</label>
                  <p className="text-sm">{tampil(selectedKendaraan.nomorBpkb)}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Pengguna</label>
                  <p className="text-sm">{tampil(selectedKendaraan.pengguna)}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">STNK Berlaku</label>
                  <p className="text-sm">{formatTgl(selectedKendaraan.tglBerlakuStnk)}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Pajak Berlaku</label>
                  <p className="text-sm">{formatTgl(selectedKendaraan.tglBerlakuPajak)}</p>
                </div>
              </div>
            </div>

            {/* Informasi Pemakaian E-Toll */}
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-bold mb-4">Informasi Pemakaian E-Toll</h2>
              {etollData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Gerbang Masuk</TableHead>
                      <TableHead>Gerbang Keluar</TableHead>
                      <TableHead>Biaya</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {etollData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{formatTgl(item.tanggal)}</TableCell>
                        <TableCell>{tampil(item.gerbangMasuk)}</TableCell>
                        <TableCell>{tampil(item.gerbangKeluar)}</TableCell>
                        <TableCell>{rupiah(item.total ?? item.volume * item.hargaSatuan)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-gray-500 text-center py-4">Tidak ada data</p>
              )}
            </div>

            {/* Informasi Biaya Pemakaian BBM */}
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-bold mb-4">Informasi Biaya Pemakaian BBM</h2>
              {bbmData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Keterangan</TableHead>
                      <TableHead>Volume</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Tempat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bbmData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{formatTgl(item.tanggal)}</TableCell>
                        <TableCell>{tampil(item.namaBarangJasa)}</TableCell>
                        <TableCell>{item.volume} {item.satuan || ''}</TableCell>
                        <TableCell>{rupiah(item.total ?? item.volume * item.hargaSatuan)}</TableCell>
                        <TableCell>{tampil(item.tempat)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-gray-500 text-center py-4">Tidak ada data</p>
              )}
            </div>

            {/* Informasi Biaya Perbaikan */}
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-bold mb-4">Informasi Biaya Perbaikan</h2>
              {perbaikanData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Barang/Jasa</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Tempat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {perbaikanData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{formatTgl(item.tanggal)}</TableCell>
                        <TableCell>{tampil(item.jenisPerawatan)}</TableCell>
                        <TableCell>{tampil(item.namaBarangJasa)}</TableCell>
                        <TableCell>{rupiah(item.total ?? item.volume * item.hargaSatuan)}</TableCell>
                        <TableCell>{tampil(item.tempat)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-gray-500 text-center py-4">Tidak ada data</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardKendaraanTab;
