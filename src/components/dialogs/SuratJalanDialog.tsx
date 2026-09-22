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
import { Plus, Trash2, Printer, Save, Truck, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  useSuratJalanBySewaAlat,
  useAddSuratJalan,
  useUpdateSuratJalan,
  type SuratJalan,
  type SuratJalanItem,
} from '@/hooks/UseSuratJalan';

interface SewaAlatContext {
  id?: string;
  nama_alat: string;
  vendor: string;
  lokasi_proyek: string;
}

interface SuratJalanDialogProps {
  open: boolean;
  onClose: () => void;
  sewaAlat: SewaAlatContext | null;
}

const emptyItem = (): SuratJalanItem => ({ nama_barang: '', banyaknya: '', keterangan: '' });

const todayISO = () => new Date().toISOString().split('T')[0];

export function SuratJalanDialog({ open, onClose, sewaAlat }: SuratJalanDialogProps) {
  const { toast } = useToast();
  const sewaAlatId = sewaAlat?.id;

  const { data: existing, isLoading } = useSuratJalanBySewaAlat(open ? sewaAlatId : undefined);
  const addSuratJalan = useAddSuratJalan();
  const updateSuratJalan = useUpdateSuratJalan();

  const [form, setForm] = useState<SuratJalan>({
    sewa_alat_internal_id: sewaAlatId || null,
    no_urut: '',
    nomor: '',
    tanggal: todayISO(),
    dari_proyek: '',
    untuk_proyek: '',
    items: [emptyItem()],
    mengetahui_nama: '',
    yang_menerima_nama: '',
    yang_menyerahkan_nama: '',
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Prefill setiap kali dialog dibuka untuk sewa alat tertentu
  useEffect(() => {
    if (!open || !sewaAlat) return;

    if (existing) {
      setForm(existing);
      setHasUnsavedChanges(false);
    } else {
      const newForm = {
        sewa_alat_internal_id: sewaAlat.id || null,
        no_urut: '',
        nomor: '',
        tanggal: todayISO(),
        dari_proyek: '',
        untuk_proyek: sewaAlat.lokasi_proyek || '',
        items: [{ nama_barang: sewaAlat.nama_alat || '', banyaknya: '1', keterangan: '' }],
        mengetahui_nama: '',
        yang_menerima_nama: '',
        yang_menyerahkan_nama: '',
      };
      setForm(newForm);
      setHasUnsavedChanges(false);
    }
  }, [open, sewaAlat, existing]);

  const handleFieldChange = (field: keyof SuratJalan, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleItemChange = (index: number, field: keyof SuratJalanItem, value: string) => {
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
    if (!form.untuk_proyek) {
      toast({
        title: 'Error',
        description: 'Untuk Proyek wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    const hasValidItem = form.items.some((it) => it.nama_barang.trim());
    if (!hasValidItem) {
      toast({
        title: 'Error',
        description: 'Isi minimal satu Nama Barang/Alat',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (form.id) {
        await updateSuratJalan.mutateAsync(form);
      } else {
        const saved = await addSuratJalan.mutateAsync(form);
        setForm(saved);
      }
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Gagal menyimpan surat jalan:', error);
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

    const rowsNeeded = Math.max(form.items.length, 6);
    const itemRows = Array.from({ length: rowsNeeded }).map((_, i) => {
      const it = form.items[i];
      return `
        <tr>
          <td class="center">${it ? i + 1 : ''}</td>
          <td>${it?.nama_barang || ''}</td>
          <td class="center">${it?.banyaknya || ''}</td>
          <td>${it?.keterangan || ''}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Surat Jalan ${form.nomor || ''}</title>
          <style>
            @page { size: A4; margin: 1.2cm; }
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #1a1a1a; }
            .top { display: flex; justify-content: flex-start; align-items: flex-start; margin-bottom: 10px; gap: 12px; }
            .company-logo { width: 50px; height: 50px; object-fit: contain; }
            .company-info { flex: 1; }
            .company-name { font-size: 15px; font-weight: bold; color: #1e3a8a; }
            .company-sub { font-size: 10.5px; color: #64748b; margin-top: 2px; }
            .company-address { font-size: 10px; color: #64748b; margin-top: 2px; }
            .doc-meta { margin-top: 6px; font-size: 11px; }
            .doc-meta div { margin-top: 2px; }

            .title { text-align: center; font-size: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.4px; margin: 18px 0 16px 0; border-top: 2px solid #1e293b; border-bottom: 2px solid #1e293b; padding: 8px 0; }

            .proyek-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 12px; margin-bottom: 14px; }
            .proyek-row { display: flex; gap: 6px; border-bottom: 1px dotted #94a3b8; padding-bottom: 3px; }
            .proyek-label { font-weight: bold; white-space: nowrap; }
            .proyek-val { flex: 1; }

            table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 12px; }
            th { background: #1e293b; color: #fff; padding: 7px 8px; border: 1px solid #1e293b; text-align: left; font-size: 11px; }
            td { padding: 10px 8px; border: 1px solid #94a3b8; height: 26px; vertical-align: top; }
            td.center, th.center { text-align: center; }

            .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 46px; text-align: center; page-break-inside: avoid; }
            .sig-box { display: flex; flex-direction: column; justify-content: space-between; height: 95px; }
            .sig-title { font-size: 11.5px; }
            .sig-line { border-top: 1px solid #334155; width: 85%; margin: 0 auto; padding-top: 4px; font-size: 11px; font-weight: 600; }
            .sig-role { font-size: 10.5px; color: #475569; margin-top: 2px; }

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
                <div><strong>Nomor</strong> : ${form.nomor || '-'}</div>
                <div><strong>Tanggal</strong> : ${tanggalText}</div>
              </div>
            </div>
          </div>

          <div class="title">Tanda Pengeluaran Barang / Alat di Proyek</div>

          <div class="proyek-grid">
            <div class="proyek-row"><span class="proyek-label">Dari Proyek :</span><span class="proyek-val">${form.dari_proyek || '-'}</span></div>
            <div class="proyek-row"><span class="proyek-label">Untuk Proyek :</span><span class="proyek-val">${form.untuk_proyek || '-'}</span></div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px;" class="center">No</th>
                <th>Nama Barang</th>
                <th style="width: 90px;" class="center">Banyaknya</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <div class="signatures">
            <div class="sig-box">
              <div class="sig-title">Mengetahui,</div>
              <div>
                <div class="sig-line">${form.mengetahui_nama || '&nbsp;'}</div>
                <div class="sig-role">( Site Manager )</div>
              </div>
            </div>
            <div class="sig-box">
              <div class="sig-title">Yang Menerima,</div>
              <div>
                <div class="sig-line">${form.yang_menerima_nama || '&nbsp;'}</div>
                <div class="sig-role">( Sopir )</div>
              </div>
            </div>
            <div class="sig-box">
              <div class="sig-title">Yang Menyerahkan,</div>
              <div>
                <div class="sig-line">${form.yang_menyerahkan_nama || '&nbsp;'}</div>
                <div class="sig-role">( Logistik )</div>
              </div>
            </div>
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

  const isSaving = addSuratJalan.isPending || updateSuratJalan.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" /> Surat Jalan {sewaAlat ? `- ${sewaAlat.nama_alat}` : ''}
            {hasUnsavedChanges && (
              <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Belum disimpan
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Tanda Pengeluaran Barang / Alat di Proyek. Isi, simpan, lalu cetak bila sudah lengkap.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Memuat data surat jalan...</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sj_nomor">Nomor</Label>
                <Input
                  id="sj_nomor"
                  value={form.nomor}
                  onChange={(e) => handleFieldChange('nomor', e.target.value)}
                  placeholder="cth. 50743"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sj_tanggal">Tanggal</Label>
                <Input
                  id="sj_tanggal"
                  type="date"
                  value={form.tanggal}
                  onChange={(e) => handleFieldChange('tanggal', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sj_dari_proyek">Dari Proyek</Label>
                <Input
                  id="sj_dari_proyek"
                  value={form.dari_proyek}
                  onChange={(e) => handleFieldChange('dari_proyek', e.target.value)}
                  placeholder="Asal alat/barang"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sj_untuk_proyek">Untuk Proyek</Label>
              <Input
                id="sj_untuk_proyek"
                value={form.untuk_proyek}
                onChange={(e) => handleFieldChange('untuk_proyek', e.target.value)}
                placeholder="Tujuan alat/barang"
                required
              />
            </div>

            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Daftar Barang / Alat</Label>
                <Button type="button" size="sm" variant="outline" onClick={handleAddItem}>
                  <Plus className="h-4 w-4 mr-1" /> Tambah Baris
                </Button>
              </div>
              <div className="space-y-2">
                {form.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-[1fr_90px_1fr_auto] gap-2 items-center">
                    <Input
                      placeholder="Nama Barang"
                      value={item.nama_barang}
                      onChange={(e) => handleItemChange(index, 'nama_barang', e.target.value)}
                    />
                    <Input
                      placeholder="Banyaknya"
                      value={item.banyaknya}
                      onChange={(e) => handleItemChange(index, 'banyaknya', e.target.value)}
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
              Tanda tangan (Site Manager, Sopir, Logistik) tidak diisi di sini — akan tercetak sebagai kolom kosong pada dokumen untuk ditandatangani manual.
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