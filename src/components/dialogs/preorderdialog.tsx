import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Printer, Save, ClipboardList, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  usePreOrderBySewaAlatEksternal,
  useAddPreOrder,
  useUpdatePreOrder,
  type PreOrder,
  type PreOrderItem,
} from '@/hooks/usepreoder';

interface SewaAlatEksternalContext {
  id?: string;
  nama_alat: string;
  vendor: string;
  lokasi_proyek: string;
}

interface PreOrderDialogProps {
  open: boolean;
  onClose: () => void;
  sewaAlat: SewaAlatEksternalContext | null;
}

const emptyItem = (): PreOrderItem => ({ nama_barang: '', volume: '', estimasi_harga_satuan: '', keterangan: '' });

const todayISO = () => new Date().toISOString().split('T')[0];

export function PreOrderDialog({ open, onClose, sewaAlat }: PreOrderDialogProps) {
  const { toast } = useToast();
  const sewaAlatId = sewaAlat?.id;

  const { data: existing, isLoading } = usePreOrderBySewaAlatEksternal(open ? sewaAlatId : undefined);
  const addPreOrder = useAddPreOrder();
  const updatePreOrder = useUpdatePreOrder();

  const [form, setForm] = useState<PreOrder>({
    sewa_alat_eksternal_id: sewaAlatId || null,
    nomor_urut: '',
    tanggal: todayISO(),
    kode_pi: '',
    pekerjaan: '',
    items: [emptyItem()],
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Prefill setiap kali dialog dibuka untuk sewa alat eksternal tertentu
  useEffect(() => {
    if (!open || !sewaAlat) return;

    if (existing) {
      setForm(existing);
      setHasUnsavedChanges(false);
    } else {
      const newForm = {
        sewa_alat_eksternal_id: sewaAlat.id || null,
        nomor_urut: '',
        tanggal: todayISO(),
        kode_pi: '',
        pekerjaan: sewaAlat.lokasi_proyek || '',
        items: [{ nama_barang: sewaAlat.nama_alat || '', volume: '1', estimasi_harga_satuan: '', keterangan: '' }],
      };
      setForm(newForm);
      setHasUnsavedChanges(false);
    }
  }, [open, sewaAlat, existing]);

  const handleFieldChange = (field: keyof PreOrder, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleItemChange = (index: number, field: keyof PreOrderItem, value: string) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
    setHasUnsavedChanges(true);
  };

  const handleAddItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  };

  const handleRemoveItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((_, i) => i !== index) : prev.items,
    }));
  };

  const handleSave = async () => {
    if (!form.pekerjaan) {
      toast({
        title: 'Error',
        description: 'Pekerjaan wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    const hasValidItem = form.items.some((it) => it.nama_barang.trim());
    if (!hasValidItem) {
      toast({
        title: 'Error',
        description: 'Isi minimal satu Nama Barang',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (form.id) {
        await updatePreOrder.mutateAsync(form);
      } else {
        const saved = await addPreOrder.mutateAsync(form);
        setForm(saved);
      }
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Gagal menyimpan pre-order:', error);
    }
  };

  const handlePrint = () => {
    if (hasUnsavedChanges && !form.id) {
      if (!confirm('Data belum disimpan. Apakah Anda yakin ingin mencetak? Data yang dicetak adalah data terbaru yang belum disimpan.')) {
        return;
      }
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'Error',
        description: 'Gagal membuka jendela print. Pastikan pop-up diizinkan.',
        variant: 'destructive',
      });
      return;
    }

    const tanggalText = form.tanggal
      ? new Date(form.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      : '-';

    const rowsNeeded = Math.max(form.items.length, 10);
    const itemRows = Array.from({ length: rowsNeeded }).map((_, i) => {
      const it = form.items[i];
      return `
        <tr>
          <td class="center">${it ? i + 1 : ''}</td>
          <td>${it?.nama_barang || ''}</td>
          <td class="center">${it?.volume || ''}</td>
          <td class="center">${it?.estimasi_harga_satuan || ''}</td>
          <td>${it?.keterangan || ''}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pre-Order ${form.nomor_urut || ''}</title>
          <style>
            @page { size: A4; margin: 1.2cm; }
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #1a1a1a; }
            .top { display: flex; justify-content: flex-start; align-items: flex-start; margin-bottom: 8px; border-bottom: 2px solid #1e293b; padding-bottom: 10px; gap: 12px; }
            .company-logo { width: 50px; height: 50px; object-fit: contain; }
            .company-info { flex: 1; }
            .company-name { font-size: 16px; font-weight: bold; color: #1e3a8a; letter-spacing: 0.3px; }
            .company-sub { font-size: 10.5px; color: #64748b; margin-top: 2px; }
            .company-address { font-size: 10px; color: #64748b; margin-top: 2px; }
            .doc-meta { font-size: 11px; text-align: right; }
            .doc-meta div { margin-top: 3px; }
            .doc-meta .lbl { display: inline-block; width: 90px; font-weight: bold; text-align: left; }

            .title { text-align: center; font-size: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.4px; margin: 16px 0 12px 0; }

            .pekerjaan-row { display: flex; gap: 6px; font-size: 12px; margin-bottom: 12px; border-bottom: 1px dotted #94a3b8; padding-bottom: 4px; }
            .pekerjaan-label { font-weight: bold; white-space: nowrap; }
            .pekerjaan-val { flex: 1; }

            table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 11.5px; }
            th { background: #1e293b; color: #fff; padding: 7px 6px; border: 1px solid #1e293b; text-align: left; font-size: 10.5px; }
            td { padding: 9px 6px; border: 1px solid #94a3b8; height: 24px; vertical-align: top; }
            td.center, th.center { text-align: center; }

            .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 44px; text-align: center; page-break-inside: avoid; }
            .sig-title { font-size: 11.5px; margin-bottom: 60px; }
            .sig-line { font-size: 11px; }
            .sig-line .blank { display: inline-block; border-bottom: 1px solid #334155; width: 60%; }

            .legend { margin-top: 26px; font-size: 10px; color: #475569; display: flex; gap: 22px; }

            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="top">
            <img src="/images/logo.png" alt="PT. REKA UTAMA PERSADA" class="company-logo" onerror="this.style.display='none'" />
            <div class="company-info">
              <div class="company-name">PT. REKA UTAMA PERSADA</div>
              <div class="company-sub">Divisi Peralatan &amp; Logistik</div>
              <div class="company-address">Jl. Pangkalan No. 31 RT. 003/RW. 001, Kel. Bantargebang, Kec. Bantar Gebang, Kota Bekasi 17151</div>
            </div>
            <div class="doc-meta">
              <div><span class="lbl">Nomor Urut</span> : ${form.nomor_urut || '-'}</div>
              <div><span class="lbl">Tanggal</span> : ${tanggalText}</div>
              <div><span class="lbl">Kode PI</span> : ${form.kode_pi || '-'}</div>
            </div>
          </div>

          <div class="title">Order Material, Alat dan Lain-lain</div>

          <div class="pekerjaan-row">
            <span class="pekerjaan-label">Pekerjaan :</span><span class="pekerjaan-val">${form.pekerjaan || '-'}</span>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 36px;" class="center">No.</th>
                <th>Nama Barang</th>
                <th style="width: 80px;" class="center">Volume</th>
                <th style="width: 130px;" class="center">Estimasi Harga Satuan (*)</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <div class="signatures">
            <div>
              <div class="sig-title">Mengetahui,</div>
              <div class="sig-line">( <span class="blank">&nbsp;</span> )</div>
            </div>
            <div>
              <div class="sig-title">Yang Menerima,</div>
              <div class="sig-line">( <span class="blank">&nbsp;</span> )</div>
            </div>
            <div>
              <div class="sig-title">Yang Meminta,</div>
              <div class="sig-line">( <span class="blank">&nbsp;</span> )</div>
            </div>
          </div>

          <div class="legend">
            <span>&#9633; Putih : Logistik</span>
            <span>&#9633; Merah : Yang Meminta</span>
            <span>&#9633; Kuning : Yang Menerima</span>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.onafterprint = function() { window.close(); };
              }, 250);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const isSaving = addPreOrder.isPending || updatePreOrder.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" /> Pre-Order {sewaAlat ? `- ${sewaAlat.nama_alat}` : ''}
            {hasUnsavedChanges && (
              <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Belum disimpan
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Order Material, Alat dan Lain-lain. Isi, simpan, lalu cetak bila sudah lengkap.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Memuat data pre-order...</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="po_nomor_urut">Nomor Urut</Label>
                <Input
                  id="po_nomor_urut"
                  value={form.nomor_urut}
                  onChange={(e) => handleFieldChange('nomor_urut', e.target.value)}
                  placeholder="cth. 001"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="po_tanggal">Tanggal</Label>
                <Input
                  id="po_tanggal"
                  type="date"
                  value={form.tanggal}
                  onChange={(e) => handleFieldChange('tanggal', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="po_kode_pi">Kode PI</Label>
                <Input
                  id="po_kode_pi"
                  value={form.kode_pi}
                  onChange={(e) => handleFieldChange('kode_pi', e.target.value)}
                  placeholder="cth. PI-0012"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="po_pekerjaan">Pekerjaan</Label>
              <Input
                id="po_pekerjaan"
                value={form.pekerjaan}
                onChange={(e) => handleFieldChange('pekerjaan', e.target.value)}
                placeholder="Nama pekerjaan / proyek"
                required
              />
            </div>

            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Daftar Barang</Label>
                <Button type="button" size="sm" variant="outline" onClick={handleAddItem}>
                  <Plus className="h-4 w-4 mr-1" /> Tambah Baris
                </Button>
              </div>
              <div className="space-y-2">
                {form.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-[1.4fr_80px_130px_1fr_auto] gap-2 items-center">
                    <Input
                      placeholder="Nama Barang"
                      value={item.nama_barang}
                      onChange={(e) => handleItemChange(index, 'nama_barang', e.target.value)}
                    />
                    <Input
                      placeholder="Volume"
                      value={item.volume}
                      onChange={(e) => handleItemChange(index, 'volume', e.target.value)}
                    />
                    <Input
                      placeholder="Est. Harga Satuan"
                      value={item.estimasi_harga_satuan}
                      onChange={(e) => handleItemChange(index, 'estimasi_harga_satuan', e.target.value)}
                    />
                    <Input
                      placeholder="Keterangan"
                      value={item.keterangan}
                      onChange={(e) => handleItemChange(index, 'keterangan', e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      onClick={() => handleRemoveItem(index)}
                      disabled={form.items.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Tanda tangan (Mengetahui, Yang Menerima, Yang Meminta) tidak diisi di sini — akan tercetak sebagai kolom kosong pada dokumen untuk ditandatangani manual.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <div className="flex gap-2">
                <Button type="button" onClick={handleSave} disabled={isSaving} className="flex-1">
                  <Save className="h-4 w-4 mr-2" /> {isSaving ? 'Menyimpan...' : 'Simpan'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrint}
                  className="flex-1"
                >
                  <Printer className="h-4 w-4 mr-2" /> Cetak
                </Button>
              </div>
              {hasUnsavedChanges && !form.id && (
                <p className="text-xs text-muted-foreground text-center">
                  Data belum disimpan. Tombol Cetak akan menampilkan konfirmasi sebelum mencetak.
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}