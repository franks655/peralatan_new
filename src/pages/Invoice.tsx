import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Printer, Save, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useInvoice, useAddInvoice, useUpdateInvoice, useDeleteInvoice, getTotalJamFromTimesheet } from '@/hooks/useInvoice';
import { useAlatBerat } from '@/hooks/useAlatBerat';
import { useLokasiProyek } from '@/hooks/useLokasiProyek';
import { ComboboxLokasiProyek } from '@/components/ComboboxLokasiProyek';
import { SelectAlatBeratSearchable } from '@/components/SelectAlatBeratSearchable';
import type { Invoice, InvoiceItem } from '@/types';

const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const Invoice = () => {
  const { toast } = useToast();
  const { data: invoices = [], isLoading } = useInvoice();
  const { data: alatBeratData = [] } = useAlatBerat();
  const { data: lokasiProyekData = [] } = useLokasiProyek();
  const { mutateAsync: addInvoice } = useAddInvoice();
  const { mutateAsync: updateInvoice } = useUpdateInvoice();
  const { mutateAsync: deleteInvoice } = useDeleteInvoice();

  const [isEditing, setIsEditing] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState<Omit<Invoice, 'id' | 'created_at' | 'updated_at'>>({
    no_invoice: '',
    tanggal: new Date().toISOString().split('T')[0],
    nama_penyewa: '',
    nama_perusahaan: '',
    pekerjaan: '',
    lokasi_proyek_id: '',
    lokasi: '',
    periode_bulan: new Date().getMonth() + 1,
    periode_tahun: new Date().getFullYear(),
    lampiran: '',
    keterangan: '',
    total_invoice: 0,
    status: 'draft',
    items: [],
  });

  const [selectedAlat, setSelectedAlat] = useState<string>('');
  const [itemForm, setItemForm] = useState<Partial<InvoiceItem>>({
    qty: 1,
    satuan: 'Unit',
    satuan_lama_sewa: 'Jam',
  });

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const resetForm = () => {
    setFormData({
      no_invoice: '',
      tanggal: new Date().toISOString().split('T')[0],
      nama_penyewa: '',
      nama_perusahaan: '',
      pekerjaan: '',
      lokasi_proyek_id: '',
      lokasi: '',
      periode_bulan: new Date().getMonth() + 1,
      periode_tahun: new Date().getFullYear(),
      lampiran: '',
      keterangan: '',
      total_invoice: 0,
      status: 'draft',
      items: [],
    });
    setIsEditing(false);
    setCurrentInvoice(null);
    setSelectedAlat('');
    setItemForm({
      qty: 1,
      satuan: 'Unit',
      satuan_lama_sewa: 'Jam',
    });
    setUploadedFiles([]);
  };

  const handleEdit = (invoice: Invoice) => {
    setCurrentInvoice(invoice);
    setFormData(invoice);
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus invoice ini?')) {
      deleteInvoice(id);
    }
  };

  const handleAddItem = async () => {
    if (!selectedAlat) {
      toast({
        title: 'Error',
        description: 'Pilih alat terlebih dahulu',
        variant: 'destructive',
      });
      return;
    }

    const alat = alatBeratData.find((a) => a.id === selectedAlat);
    if (!alat) {
      toast({
        title: 'Error',
        description: 'Alat tidak ditemukan',
        variant: 'destructive',
      });
      return;
    }

    console.log('Adding item for alat:', {
      no_lambung: alat.no_lambung,
      nama_alat: alat.nama_alat,
      harga_sewa: alat.harga_sewa,
      periode_bulan: formData.periode_bulan,
      periode_tahun: formData.periode_tahun
    });

    // Get total jam from timesheet
    const totalJam = await getTotalJamFromTimesheet(
      alat.no_lambung,
      formData.periode_bulan,
      formData.periode_tahun
    );

    console.log('Total jam from timesheet:', totalJam);

    const hargaSewa = alat.harga_sewa || 0;
    const qty = itemForm.qty || 1;
    const totalItem = qty * hargaSewa * totalJam;

    console.log('Calculation:', {
      hargaSewa,
      qty,
      totalJam,
      totalItem
    });

    const newItem: InvoiceItem = {
      alat_berat_id: alat.id,
      no_lambung: alat.no_lambung,
      nama_alat: alat.nama_alat,
      qty: qty,
      satuan: itemForm.satuan || 'Unit',
      harga_sewa: hargaSewa,
      lama_sewa_jam: totalJam,
      satuan_lama_sewa: itemForm.satuan_lama_sewa || 'Jam',
      keterangan: itemForm.keterangan || '',
      total_item: totalItem,
    };

    const updatedItems = [...(formData.items || []), newItem];
    const totalInvoice = updatedItems.reduce((sum, item) => sum + item.total_item, 0);

    setFormData({
      ...formData,
      items: updatedItems,
      total_invoice: totalInvoice,
    });

    setSelectedAlat('');
    setItemForm({
      qty: 1,
      satuan: 'Unit',
      satuan_lama_sewa: 'Jam',
    });
    setUploadedFiles([]);

    toast({
      title: 'Alat ditambahkan',
      description: `${alat.nama_alat} ditambahkan dengan lama sewa ${totalJam} jam`,
    });
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = formData.items?.filter((_, i) => i !== index) || [];
    const totalInvoice = updatedItems.reduce((sum, item) => sum + item.total_item, 0);

    setFormData({
      ...formData,
      items: updatedItems,
      total_invoice: totalInvoice,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.no_invoice || !formData.nama_penyewa || !formData.nama_perusahaan) {
      toast({
        title: 'Error',
        description: 'No. Invoice, Nama Penyewa, dan Nama Perusahaan wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Upload files first if any
      let lampiranPaths = formData.lampiran || '';
      if (uploadedFiles.length > 0) {
        console.log('Uploading files:', uploadedFiles.map(f => f.name));
        const filePromises = uploadedFiles.map(async (file) => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
              try {
                const base64 = reader.result as string;
                console.log('Uploading file:', file.name, 'Size:', base64.length);
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/invoice/upload`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    files: [{
                      name: file.name,
                      data: base64,
                      type: file.type
                    }]
                  })
                });
                const result = await response.json();
                console.log('Upload response:', result);
                if (result.error) throw new Error(result.error.message);
                resolve(result.data.files[0].filePath);
              } catch (err) {
                console.error('Upload error for file:', file.name, err);
                reject(err);
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        });

        const filePaths = await Promise.all(filePromises);
        lampiranPaths = filePaths.join(', ');
        console.log('All files uploaded. Paths:', lampiranPaths);
      }

      const invoiceData = {
        ...formData,
        lampiran: lampiranPaths,
      };

      if (isEditing && currentInvoice?.id) {
        await updateInvoice({ ...invoiceData, id: currentInvoice.id });
      } else {
        await addInvoice(invoiceData);
      }
      resetForm();
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal menyimpan invoice',
        variant: 'destructive',
      });
    }
  };

  const handlePrint = (invoice: Invoice) => {
    // Create print view
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'Error',
        description: 'Gagal membuka jendela print',
        variant: 'destructive',
      });
      return;
    }

    const lokasiProyek = lokasiProyekData.find((lp) => lp.id === invoice.lokasi_proyek_id);
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const periodeText = `${monthNames[invoice.periode_bulan - 1]} ${invoice.periode_tahun}`;

    console.log('Invoice data for print:', {
      lokasi_proyek_id: invoice.lokasi_proyek_id,
      lokasi: invoice.lokasi,
      lokasiProyekFromDB: lokasiProyek
    });

    const itemsHtml = invoice.items?.map((item, index) => `
      <tr>
        <td class="center">${index + 1}</td>
        <td>${item.no_lambung} - ${item.nama_alat}<br/><small style="color: #666;">Periode: 1-${invoice.periode_bulan} ${monthNames[invoice.periode_bulan - 1]} ${invoice.periode_tahun}</small></td>
        <td class="center">${item.qty}</td>
        <td>${item.satuan}</td>
        <td class="num">${formatRupiah(item.harga_sewa)}</td>
        <td class="center">${item.lama_sewa_jam}</td>
        <td>${item.satuan_lama_sewa}</td>
        <td>${item.keterangan || '-'}</td>
        <td class="num" style="font-weight: bold;">${formatRupiah(item.total_item)}</td>
      </tr>
    `).join('') || '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.no_invoice}</title>
          <style>
            @page { size: A4; margin: 1cm; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
            .company-name { font-size: 16px; font-weight: bold; color: #1e3a8a; letter-spacing: 0.5px; }
            .company-division { font-size: 11px; color: #4b5563; }
            .company-address { font-size: 10px; color: #64748b; margin-top: 4px; }
            .print-info { text-align: right; font-size: 10px; color: #64748b; }
            .title-box { text-align: center; margin-bottom: 16px; }
            .title { font-size: 15px; font-weight: bold; color: #111827; text-transform: uppercase; margin-bottom: 3px; letter-spacing: 0.5px; }
            .doc-num { font-size: 11px; color: #4b5563; }
            
            .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 11px; }
            .info-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 3px; }
            .info-label { color: #64748b; font-weight: 500; }
            .info-val { font-weight: 600; color: #0f172a; }

            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            th, td { border: 1px solid #94a3b8; padding: 6px 8px; text-align: left; vertical-align: middle; }
            th { background: #f1f5f9; font-weight: bold; text-align: center; font-size: 10.5px; color: #1e293b; }
            td.num { text-align: right; }
            td.center { text-align: center; }
            tfoot tr { background: #f8fafc; font-weight: bold; }
            tfoot td { border-top: 2px solid #64748b; }

            .total-section { margin-top: 20px; text-align: right; }
            .total-label { font-size: 14px; font-weight: bold; }
            .total-value { font-size: 18px; font-weight: bold; color: #000; }
            .signatures { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 36px; text-align: center; page-break-inside: avoid; }
            .sig-box { display: flex; flex-direction: column; justify-content: space-between; height: 105px; }
            .sig-title { font-size: 10.5px; font-weight: 600; color: #475569; }
            .sig-line { border-top: 1px solid #334155; width: 80%; margin: 0 auto; padding-top: 4px; font-weight: 600; font-size: 11px; color: #0f172a; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 10px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company-name">PT. REKA UTAMA PERSADA</div>
              <div class="company-division">Divisi Peralatan & Logistik</div>
              <div class="company-address">Jl. Pangkalan No. 31 RT. 003/RW. 001, Kel. Bantargebang, Kec. Bantar Gebang, Kota Bekasi 17151</div>
            </div>
            <div class="print-info">
              <div>Status: <strong>${invoice.status === 'paid' ? 'Lunas (Paid)' : invoice.status === 'sent' ? 'Terkirim (Sent)' : 'Draft'}</strong></div>
            </div>
          </div>

          <div class="title-box">
            <div class="title">INVOICE SEWA ALAT</div>
            <div class="doc-num">No. Invoice: <strong>${invoice.no_invoice}</strong></div>
          </div>

          <div class="info-grid">
            <div class="info-row"><span class="info-label">Tanggal:</span><span class="info-val">${new Date(invoice.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
            <div class="info-row"><span class="info-label">Periode:</span><span class="info-val">${periodeText}</span></div>
            <div class="info-row"><span class="info-label">Nama Penyewa:</span><span class="info-val">${invoice.nama_penyewa}</span></div>
            <div class="info-row"><span class="info-label">Nama Perusahaan:</span><span class="info-val">${invoice.nama_perusahaan}</span></div>
            <div class="info-row"><span class="info-label">Pekerjaan:</span><span class="info-val">${invoice.pekerjaan || '-'}</span></div>
            <div class="info-row"><span class="info-label">Lokasi Pekerjaan:</span><span class="info-val">${invoice.lokasi || lokasiProyek?.lokasi || '-'}</span></div>
            <div class="info-row"><span class="info-label">Lampiran:</span><span class="info-val">${invoice.lampiran ? invoice.lampiran.split(',').map(path => `<a href="${import.meta.env.VITE_API_URL}${path}" target="_blank" style="color: #0066cc;">${path.split('/').pop()}</a>`).join(', ') : '-'}</span></div>
            <div class="info-row"><span class="info-label">Keterangan:</span><span class="info-val">${invoice.keterangan || '-'}</span></div>
          </div>

          <h3 style="text-align: center; margin: 25px 0 15px 0; font-size: 14px; font-weight: bold; color: #333;">DESKRIPSI ALAT</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">No</th>
                <th>Deskripsi Alat</th>
                <th style="width: 60px;">QTY</th>
                <th style="width: 80px;">Satuan</th>
                <th style="width: 100px;">Harga Sewa</th>
                <th style="width: 60px;">Lama Sewa</th>
                <th style="width: 80px;">Satuan</th>
                <th>Ket</th>
                <th style="width: 120px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-label">Total Keseluruhan Biaya:</div>
            <div class="total-value">${formatRupiah(invoice.total_invoice)}</div>
          </div>

          ${invoice.keterangan ? `
          <div style="font-size: 10.5px; margin-bottom: 16px; background: #fff; border: 1px solid #e2e8f0; padding: 6px 10px; border-radius: 4px;">
            <strong>Catatan Tambahan:</strong> ${invoice.keterangan}
          </div>
          ` : ''}

          <div class="signatures">
            <div class="sig-box">
              <div class="sig-title">Mengetahui:</div>
              <div class="sig-line">( Manajer Peralatan )</div>
            </div>
            <div class="sig-box">
              <div class="sig-title">Menyetujui:</div>
              <div class="sig-line">( Project Manager )</div>
            </div>
            <div class="sig-box">
              <div class="sig-title">Koordinator:</div>
              <div class="sig-line">( Koordinator Project )</div>
            </div>
            <div class="sig-box">
              <div class="sig-title">Kepala Divisi:</div>
              <div class="sig-line">( Kepala Divisi Infrastruktur )</div>
            </div>
          </div>

          <div class="footer">
            <div>Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            <div style="margin-top: 5px;">Dokumen ini dicetak otomatis dari Sistem Informasi Peralatan PT. REKA UTAMA PERSADA</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Invoice Sewa Alat</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Invoice Header */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="no_invoice">No. Invoice</Label>
                <Input
                  id="no_invoice"
                  value={formData.no_invoice}
                  onChange={(e) => setFormData({ ...formData, no_invoice: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tanggal">Tanggal</Label>
                <Input
                  id="tanggal"
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nama_penyewa">Nama Penyewa</Label>
                <Input
                  id="nama_penyewa"
                  value={formData.nama_penyewa}
                  onChange={(e) => setFormData({ ...formData, nama_penyewa: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nama_perusahaan">Nama Perusahaan</Label>
                <Input
                  id="nama_perusahaan"
                  value={formData.nama_perusahaan}
                  onChange={(e) => setFormData({ ...formData, nama_perusahaan: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pekerjaan">Pekerjaan</Label>
                <Input
                  id="pekerjaan"
                  value={formData.pekerjaan || ''}
                  onChange={(e) => setFormData({ ...formData, pekerjaan: e.target.value })}
                  placeholder="Nama pekerjaan/proyek"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lokasi_proyek">Lokasi Proyek</Label>
                <ComboboxLokasiProyek
                  value={formData.lokasi_proyek_id || ''}
                  onChange={(value) => {
                    setFormData({ ...formData, lokasi_proyek_id: value });
                    // Auto-fill lokasi when lokasi_proyek is selected
                    const selectedLokasi = lokasiProyekData.find((lp) => lp.id === value);
                    if (selectedLokasi) {
                      setFormData({ ...formData, lokasi_proyek_id: value, lokasi: selectedLokasi.lokasi });
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lokasi">Lokasi Pekerjaan</Label>
              <Input
                id="lokasi"
                value={formData.lokasi || ''}
                onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                placeholder="Lokasi pekerjaan (otomatis dari Lokasi Proyek atau input manual)"
              />
            </div>
              <div className="space-y-2">
                <Label htmlFor="lampiran">Lampiran (Upload File)</Label>
                <div className="space-y-2">
                  <Input
                    id="lampiran_files"
                    type="file"
                    multiple
                    ref={(input) => {
                      if (input) {
                        // Store ref to access click method
                        (input as any).fileInputRef = input;
                      }
                    }}
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setUploadedFiles(files);
                    }}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    style={{ display: 'none' }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const fileInput = document.getElementById('lampiran_files') as HTMLInputElement;
                      if (fileInput) {
                        fileInput.click();
                      }
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Pilih File Lampiran
                  </Button>
                  {uploadedFiles.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      {uploadedFiles.length} file(s) dipilih: {uploadedFiles.map(f => f.name).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="periode_bulan">Periode Bulan</Label>
                <select
                  id="periode_bulan"
                  value={formData.periode_bulan}
                  onChange={(e) => setFormData({ ...formData, periode_bulan: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleDateString('id-ID', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="periode_tahun">Periode Tahun</Label>
                <Input
                  id="periode_tahun"
                  type="number"
                  value={formData.periode_tahun}
                  onChange={(e) => setFormData({ ...formData, periode_tahun: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keterangan">Keterangan</Label>
              <Textarea
                id="keterangan"
                value={formData.keterangan}
                onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                rows={3}
              />
            </div>

            {/* Add Invoice Items */}
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold">Tambah Alat ke Invoice</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2 col-span-2">
                  <SelectAlatBeratSearchable
                    value={selectedAlat}
                    onChange={setSelectedAlat}
                    alatBeratData={alatBeratData}
                    placeholder="-- Pilih Alat --"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qty">QTY</Label>
                  <Input
                    id="qty"
                    type="number"
                    value={itemForm.qty}
                    onChange={(e) => setItemForm({ ...itemForm, qty: parseInt(e.target.value) || 1 })}
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="satuan">Satuan</Label>
                  <Input
                    id="satuan"
                    value={itemForm.satuan}
                    onChange={(e) => setItemForm({ ...itemForm, satuan: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="keterangan_item">Keterangan</Label>
                  <Input
                    id="keterangan_item"
                    value={itemForm.keterangan}
                    onChange={(e) => setItemForm({ ...itemForm, keterangan: e.target.value })}
                    placeholder="Timesheet, Lump sum, dll"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="button" onClick={handleAddItem} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Alat
                  </Button>
                </div>
              </div>
            </div>

            {/* Invoice Items Table */}
            {formData.items && formData.items.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-4">Daftar Alat dalam Invoice</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deskripsi Alat</TableHead>
                      <TableHead className="text-center">QTY</TableHead>
                      <TableHead>Satuan</TableHead>
                      <TableHead className="text-right">Harga Sewa</TableHead>
                      <TableHead className="text-center">Lama Sewa (Jam)</TableHead>
                      <TableHead>Ket</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.no_lambung} - {item.nama_alat}</TableCell>
                        <TableCell className="text-center">{item.qty}</TableCell>
                        <TableCell>{item.satuan}</TableCell>
                        <TableCell className="text-right">{formatRupiah(item.harga_sewa)}</TableCell>
                        <TableCell className="text-center">{item.lama_sewa_jam}</TableCell>
                        <TableCell>{item.keterangan || '-'}</TableCell>
                        <TableCell className="text-right">{formatRupiah(item.total_item)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 text-right">
                  <strong>Total Invoice: {formatRupiah(formData.total_invoice)}</strong>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex gap-2">
              <Button type="submit" className="px-8 py-6 text-base">
                <Save className="h-5 w-5 mr-2" />
                {isEditing ? 'Update Invoice' : 'Simpan Invoice'}
              </Button>
              {isEditing && (
                <Button type="button" variant="outline" onClick={resetForm} className="px-8 py-6 text-base">
                  Batal
                </Button>
              )}
            </div>
          </form>

          {/* Invoice List */}
          <div className="mt-8">
            <h3 className="font-semibold mb-4">Daftar Invoice</h3>
            {isLoading ? (
              <p>Memuat data...</p>
            ) : invoices.length === 0 ? (
              <p>Belum ada invoice</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Invoice</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Nama Penyewa</TableHead>
                    <TableHead>Nama Perusahaan</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{invoice.no_invoice}</TableCell>
                      <TableCell>{new Date(invoice.tanggal).toLocaleDateString('id-ID')}</TableCell>
                      <TableCell>{invoice.nama_penyewa}</TableCell>
                      <TableCell>{invoice.nama_perusahaan}</TableCell>
                      <TableCell>
                        {new Date(invoice.periode_tahun, invoice.periode_bulan - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                      </TableCell>
                      <TableCell>{formatRupiah(invoice.total_invoice)}</TableCell>
                      <TableCell>{invoice.status}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => handlePrint(invoice)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => handleEdit(invoice)}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDelete(invoice.id!)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Invoice;
