import React, { useState, useMemo, useRef, useEffect, memo } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import {
  Search, Edit, Trash2, CheckCircle2, XCircle, Plus, Download, Printer,
  Calendar, X, Gauge, MapPin, ClipboardList
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  usePerawatanBerkala, useAddPerawatanBerkala, useUpdatePerawatanBerkala,
  useDeletePerawatanBerkala, PerawatanBerkalaItem
} from '@/hooks/usePerawatanBerkala';
import {
  usePerawatanBerkalaItems, useAddPerawatanBerkalaItem,
  useUpdatePerawatanBerkalaItem, useDeletePerawatanBerkalaItem,
  PerawatanBerkalaItemDetail
} from '@/hooks/usePerawatanBerkalaItems';
import { usePagePermission } from '@/hooks/usePagePermission';
import { SimplePagination, paginateData, getTotalPages } from '@/components/ui/SimplePagination';
import { formatDateDisplay, parseMySQLDate } from '@/utils/dateUtils';
import { useAlatBerat } from '@/hooks/useAlatBerat';
import { useAlatPendukung } from '@/hooks/useAlatPendukung';
import { TableScrollWrapper } from '@/components/ui/TableScrollWrapper';

/* ─────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────── */
export interface FormData {
  tanggal: string;
  no_dokumen: string;
  no_lambung: string;
  nama_alat: string;
  km_hm_terakhir: string;
  km_hm_saat_ini: string;
  lokasi: string;
  keterangan: string;
}

export type AssetItem = { id: string; namaAlat: string; noLambung: string };

export const emptyForm = (): FormData => ({
  tanggal: format(new Date(), 'yyyy-MM-dd'),
  no_dokumen: '',
  no_lambung: '',
  nama_alat: '',
  km_hm_terakhir: '',
  km_hm_saat_ini: '',
  lokasi: '',
  keterangan: '',
});

/* ─────────────────────────────────────────────────────────────────
   Sub-components defined OUTSIDE parent to avoid re-mount on render
───────────────────────────────────────────────────────────────── */

const StatusBadge = memo(({ status }: { status: string }) => {
  const cls: Record<string, string> = {
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
  };
  const label: Record<string, string> = { approved: 'Disetujui', rejected: 'Ditolak', pending: 'Menunggu' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls[status] ?? cls.pending}`}>
      {label[status] ?? 'Menunggu'}
    </span>
  );
});

const AssetDropdown = memo(({ assets, onSelect }: {
  assets: AssetItem[];
  onSelect: (a: AssetItem) => void;
}) => (
  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-52 overflow-y-auto">
    {assets.length === 0
      ? <div className="px-3 py-2 text-sm text-gray-500">Tidak ditemukan</div>
      : assets.map(asset => (
        <button key={asset.id} type="button"
          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors"
          onMouseDown={e => { e.preventDefault(); onSelect(asset); }}>
          <span className="font-medium text-gray-900">{asset.namaAlat}</span>
          <span className="text-xs text-gray-500 ml-2">({asset.noLambung})</span>
        </button>
      ))
    }
  </div>
));

interface FormBodyProps {
  data: FormData;
  onChange: (d: FormData) => void;
  filteredName: AssetItem[];
  filteredLambung: AssetItem[];
  isNameOpen: boolean;
  setNameOpen: (v: boolean) => void;
  isLambungOpen: boolean;
  setLambungOpen: (v: boolean) => void;
  formRef: React.RefObject<HTMLDivElement>;
}

const FormBody = memo(({
  data, onChange,
  filteredName, filteredLambung,
  isNameOpen, setNameOpen,
  isLambungOpen, setLambungOpen,
  formRef,
}: FormBodyProps) => (
  <div ref={formRef} className="grid gap-4 py-4">
    {/* Row 1: Tanggal + No. Dokumen */}
    <div className="grid grid-cols-2 gap-4">
      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-gray-700">Tanggal <span className="text-red-500">*</span></label>
        <Input type="date" value={data.tanggal}
          onChange={e => onChange({ ...data, tanggal: e.target.value })} />
      </div>
      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-gray-700">No. Dokumen</label>
        <Input value={data.no_dokumen}
          onChange={e => onChange({ ...data, no_dokumen: e.target.value })}
          placeholder="Contoh: PWB-001" />
      </div>
    </div>

    {/* No. Lambung */}
    <div className="grid gap-1.5">
      <label className="text-sm font-medium text-gray-700">No. Lambung <span className="text-red-500">*</span></label>
      <div className="relative">
        <Input
          value={data.no_lambung}
          onChange={e => { onChange({ ...data, no_lambung: e.target.value }); setLambungOpen(true); setNameOpen(false); }}
          onFocus={() => { setLambungOpen(true); setNameOpen(false); }}
          placeholder="Ketik nomor lambung…" autoComplete="off"
        />
        {isLambungOpen && (
          <AssetDropdown assets={filteredLambung} onSelect={a => {
            onChange({ ...data, no_lambung: a.noLambung, nama_alat: a.namaAlat });
            setLambungOpen(false);
          }} />
        )}
      </div>
    </div>

    {/* Nama Alat */}
    <div className="grid gap-1.5">
      <label className="text-sm font-medium text-gray-700">Nama Alat <span className="text-red-500">*</span></label>
      <div className="relative">
        <Input
          value={data.nama_alat}
          onChange={e => { onChange({ ...data, nama_alat: e.target.value }); setNameOpen(true); setLambungOpen(false); }}
          onFocus={() => { setNameOpen(true); setLambungOpen(false); }}
          placeholder="Ketik nama alat…" autoComplete="off"
        />
        {isNameOpen && (
          <AssetDropdown assets={filteredName} onSelect={a => {
            onChange({ ...data, nama_alat: a.namaAlat, no_lambung: a.noLambung });
            setNameOpen(false);
          }} />
        )}
      </div>
    </div>

    {/* KM/HM */}
    <div className="grid grid-cols-2 gap-4">
      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-gray-700">KM/HM Terakhir</label>
        <div className="relative">
          <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input type="number" className="pl-9" value={data.km_hm_terakhir}
            onChange={e => onChange({ ...data, km_hm_terakhir: e.target.value })}
            placeholder="0" min="0" step="0.01" />
        </div>
      </div>
      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-gray-700">KM/HM Saat Ini</label>
        <div className="relative">
          <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input type="number" className="pl-9" value={data.km_hm_saat_ini}
            onChange={e => onChange({ ...data, km_hm_saat_ini: e.target.value })}
            placeholder="0" min="0" step="0.01" />
        </div>
      </div>
    </div>

    {/* Lokasi */}
    <div className="grid gap-1.5">
      <label className="text-sm font-medium text-gray-700">Lokasi</label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <Input className="pl-9" value={data.lokasi}
          onChange={e => onChange({ ...data, lokasi: e.target.value })}
          placeholder="Lokasi alat" />
      </div>
    </div>

    {/* Keterangan */}
    <div className="grid gap-1.5">
      <label className="text-sm font-medium text-gray-700">Keterangan</label>
      <textarea
        className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
        value={data.keterangan}
        onChange={e => onChange({ ...data, keterangan: e.target.value })}
        placeholder="Keterangan tambahan (opsional)"
        rows={2}
      />
    </div>
  </div>
));

/* ─────────────────────────────────────────────────────────────────
   SPK Form & Items Component (Bentuk seperti Timesheet)
───────────────────────────────────────────────────────────────── */
export interface SPKFormData {
  tanggal: string;
  nama_mekanik: string;
  rencana_perawatan: string;
  jenis_perawatan: string;
  quantity: string;
  harga: string;
}

export const emptySPKForm = (): SPKFormData => ({
  tanggal: format(new Date(), 'yyyy-MM-dd'),
  nama_mekanik: '',
  rencana_perawatan: '',
  jenis_perawatan: '',
  quantity: '1',
  harga: '',
});

interface SPKSectionProps {
  selectedItem: PerawatanBerkalaItem;
  onClose: () => void;
  form: SPKFormData;
  onChangeForm: (f: SPKFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  isEditing: boolean;
  onCancelEdit: () => void;
  isSaving: boolean;
  items: PerawatanBerkalaItemDetail[];
  isLoadingItems: boolean;
  onEditItem: (item: PerawatanBerkalaItemDetail) => void;
  onDeleteItem: (id: string) => void;
  deletingId: string | null;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPrint: boolean;
}

const SPKSection = memo(({
  selectedItem, onClose, form, onChangeForm, onSubmit,
  isEditing, onCancelEdit, isSaving, items, isLoadingItems,
  onEditItem, onDeleteItem, deletingId,
  canCreate, canEdit, canDelete, canPrint
}: SPKSectionProps) => {
  const canSubmitForm = isEditing ? canEdit : canCreate;
  const totalBiaya = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.total_harga) || (Number(it.quantity) * Number(it.harga)) || 0), 0);
  }, [items]);

  const handlePrintSPK = () => {
    if (!items.length) {
      toast({ title: 'Info', description: 'Belum ada item perintah kerja untuk dicetak' });
      return;
    }
    const win = window.open('', '', 'width=950,height=700');
    if (!win) {
      toast({ title: 'Error', description: 'Gagal membuka jendela print', variant: 'destructive' });
      return;
    }

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Surat Perintah Kerja (SPK) - ${selectedItem.no_dokumen || selectedItem.no_lambung}</title>
  <style>
    @page { size: A4 portrait; margin: 1.2cm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 10px; font-size: 11px; color: #1f2937; line-height: 1.4; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 14px; }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .company-logo { width: 50px; height: 50px; object-fit: contain; }
    .company-info { flex: 1; }
    .company { font-size: 16px; font-weight: bold; color: #1e3a8a; letter-spacing: 0.5px; }
    .divisi { font-size: 11px; color: #4b5563; }
    .address { font-size: 10px; color: #64748b; margin-top: 2px; }
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

    .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 36px; text-align: center; page-break-inside: avoid; }
    .sig-box { display: flex; flex-direction: column; justify-content: space-between; height: 105px; }
    .sig-title { font-size: 10.5px; font-weight: 600; color: #475569; }
    .sig-line { border-top: 1px solid #334155; width: 80%; margin: 0 auto; padding-top: 4px; font-weight: 600; font-size: 11px; color: #0f172a; }
    
    .footer { margin-top: 20px; font-size: 9px; color: #94a3b8; text-align: right; border-top: 1px solid #e2e8f0; padding-top: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <img src="${import.meta.env.VITE_API_URL}/images/logo.png" alt="PT. REKA UTAMA PERSADA" class="company-logo" onerror="this.style.display='none'" />
      <div class="company-info">
        <div class="company">PT. REKA UTAMA PERSADA</div>
        <div class="divisi">Divisi Peralatan & Logistik</div>
        <div class="address">Jl. Pangkalan No. 31 RT. 003/RW. 001, Kel. Bantargebang, Kec. Bantar Gebang, Kota Bekasi 17151</div>
      </div>
    </div>
    <div style="text-align: right; font-size: 10px; color: #64748b;">
      <div>Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
      <div>Status: <strong>Disetujui (Approved)</strong></div>
    </div>
  </div>

  <div class="title-box">
    <div class="title">SURAT PERINTAH KERJA (SPK) PERAWATAN BERKALA</div>
    <div class="doc-num">No. Dokumen: <strong>${selectedItem.no_dokumen || '-'}</strong></div>
  </div>

  <div class="info-grid">
    <div class="info-row"><span class="info-label">Nomor Lambung:</span><span class="info-val">${selectedItem.no_lambung}</span></div>
    <div class="info-row"><span class="info-label">Tanggal Pengajuan:</span><span class="info-val">${formatDateDisplay(selectedItem.tanggal)}</span></div>
    <div class="info-row"><span class="info-label">Nama Alat:</span><span class="info-val">${selectedItem.nama_alat}</span></div>
    <div class="info-row"><span class="info-label">Lokasi:</span><span class="info-val">${selectedItem.lokasi || '-'}</span></div>
    <div class="info-row"><span class="info-label">KM/HM Terakhir:</span><span class="info-val">${selectedItem.km_hm_terakhir != null ? selectedItem.km_hm_terakhir.toLocaleString('id-ID') : '-'}</span></div>
    <div class="info-row"><span class="info-label">KM/HM Saat Ini:</span><span class="info-val">${selectedItem.km_hm_saat_ini != null ? selectedItem.km_hm_saat_ini.toLocaleString('id-ID') : '-'}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 25px;">No</th>
        <th style="width: 75px;">Tanggal</th>
        <th style="width: 110px;">Nama Mekanik</th>
        <th>Rencana Perawatan</th>
        <th>Jenis Perawatan</th>
        <th style="width: 45px;">Qty</th>
        <th style="width: 90px;">Harga Satuan</th>
        <th style="width: 105px;">Total Harga</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((it, idx) => {
      const lineTotal = Number(it.total_harga) || (Number(it.quantity) * Number(it.harga)) || 0;
      return `<tr>
          <td class="center">${idx + 1}</td>
          <td class="center">${it.tanggal ? formatDateDisplay(it.tanggal) : '-'}</td>
          <td>${it.nama_mekanik || '-'}</td>
          <td><strong>${it.rencana_perawatan}</strong></td>
          <td>${it.jenis_perawatan}</td>
          <td class="num">${Number(it.quantity).toLocaleString('id-ID')}</td>
          <td class="num">Rp ${Number(it.harga).toLocaleString('id-ID')}</td>
          <td class="num" style="font-weight: 600;">Rp ${lineTotal.toLocaleString('id-ID')}</td>
        </tr>`;
    }).join('')}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="7" style="text-align: right; font-weight: bold; padding-right: 12px;">Total Keseluruhan Biaya:</td>
        <td class="num" style="font-weight: bold; color: #1e3a8a;">Rp ${totalBiaya.toLocaleString('id-ID')}</td>
      </tr>
    </tfoot>
  </table>

  ${selectedItem.keterangan ? `
    <div style="font-size: 10.5px; margin-bottom: 16px; background: #fff; border: 1px solid #e2e8f0; padding: 6px 10px; border-radius: 4px;">
      <strong>Catatan Tambahan:</strong> ${selectedItem.keterangan}
    </div>
  ` : ''}

  <div class="signatures">
    <div class="sig-box">
      <div class="sig-title">Dikerjakan Oleh:</div>
      <div class="sig-line">( Mekanik )</div>
    </div>
    <div class="sig-box">
      <div class="sig-title">Diperiksa Oleh:</div>
      <div class="sig-line">( Kepala Mekanik )</div>
    </div>
    <div class="sig-box">
      <div class="sig-title">Disetujui Oleh:</div>
      <div class="sig-line">( Manajer Peralatan )</div>
    </div>
  </div>

  <div class="footer">
    Dokumen ini dicetak otomatis dari Sistem Informasi Peralatan PT REKA UTAMA PERSADA 
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        window.onafterprint = function() { window.close(); };
      }, 400);
    };
  </script>
</body>
</html>`);
    win.document.close();
  };

  return (
    <div className="mb-6 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/70 to-slate-50 p-5 shadow-sm space-y-5 transition-all">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-600 text-white shadow-sm flex-shrink-0">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-gray-900">
                Form Perintah Kerja (SPK)
              </h3>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                {selectedItem.no_dokumen || 'Tanpa No. Dok'}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              Unit: <strong className="text-gray-900">{selectedItem.no_lambung}</strong> — {selectedItem.nama_alat} | Lokasi: {selectedItem.lokasi || '-'} | KM/HM Saat Ini: <strong className="text-gray-900">{selectedItem.km_hm_saat_ini ?? '-'}</strong>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {canPrint && items.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrintSPK}
              className="h-8 px-2.5 text-xs flex items-center gap-1.5 bg-white border-blue-200 hover:bg-blue-50 text-blue-700 shadow-sm font-medium"
              title="Cetak Surat Perintah Kerja (SPK)"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Cetak SPK</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-700 hover:bg-white/80 rounded-full"
            title="Tutup Form Perintah Kerja"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Form dengan Field Tanggal, Nama Mekanik, Rencana Perawatan, Jenis Perawatan, Quantity, Harga */}
      {canSubmitForm && <form onSubmit={onSubmit} className="space-y-4" id="spkForm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="spk_tanggal" className="text-xs font-semibold text-gray-700">
              Tanggal <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              id="spk_tanggal"
              value={form.tanggal}
              onChange={e => onChangeForm({ ...form, tanggal: e.target.value })}
              required
              className="bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nama_mekanik" className="text-xs font-semibold text-gray-700">
              Nama Mekanik <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nama_mekanik"
              value={form.nama_mekanik}
              onChange={e => onChangeForm({ ...form, nama_mekanik: e.target.value })}
              placeholder="Nama teknisi / mekanik"
              required
              className="bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rencana_perawatan" className="text-xs font-semibold text-gray-700">
              Rencana Perawatan Berkala <span className="text-red-500">*</span>
            </Label>
            <Input
              id="rencana_perawatan"
              value={form.rencana_perawatan}
              onChange={e => onChangeForm({ ...form, rencana_perawatan: e.target.value })}
              placeholder="Contoh: Service 250 Jam"
              required
              className="bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="jenis_perawatan" className="text-xs font-semibold text-gray-700">
              Jenis Perawatan <span className="text-red-500">*</span>
            </Label>
            <Input
              id="jenis_perawatan"
              value={form.jenis_perawatan}
              onChange={e => onChangeForm({ ...form, jenis_perawatan: e.target.value })}
              placeholder="Contoh: Ganti Oli Mesin"
              required
              className="bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="quantity" className="text-xs font-semibold text-gray-700">
              Quantity <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              step="any"
              min="0"
              id="quantity"
              value={form.quantity}
              onChange={e => onChangeForm({ ...form, quantity: e.target.value })}
              placeholder="1"
              required
              className="bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="harga" className="text-xs font-semibold text-gray-700">
              Harga (Rp)
            </Label>
            <Input
              type="number"
              step="any"
              min="0"
              id="harga"
              value={form.harga}
              onChange={e => onChangeForm({ ...form, harga: e.target.value })}
              placeholder="Contoh: 150000"
              className="bg-white"
            />
          </div>
        </div>

        {/* Tombol Simpan bentuknya seperti di Timesheet */}
        <div className="flex gap-2 pt-1">
          <Button type="submit" className="flex-1" disabled={isSaving}>
            {isEditing ? (
              <><Edit className="w-4 h-4 mr-2" />{isSaving ? 'Menyimpan…' : 'Update Data'}</>
            ) : (
              <><Plus className="w-4 h-4 mr-2" />{isSaving ? 'Menyimpan…' : 'Simpan Data'}</>
            )}
          </Button>
          {isEditing && (
            <Button type="button" variant="outline" onClick={onCancelEdit}>
              Batal
            </Button>
          )}
        </div>
      </form>}

      {/* Tabel Item Perintah Kerja */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
            Daftar Item Perintah Kerja
            <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold">
              {items.length}
            </span>
          </h4>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <div className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                Total Biaya: Rp {totalBiaya.toLocaleString('id-ID')}
              </div>
            )}
            {canPrint && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrintSPK}
              disabled={items.length === 0}
              className="h-7 px-2.5 text-xs flex items-center gap-1.5 bg-white border-gray-300 hover:bg-gray-50 text-gray-700 shadow-sm"
              title="Cetak Surat Perintah Kerja (SPK)"
            >
              <Printer className="h-3.5 w-3.5 text-blue-600" />
              <span>Cetak Hasil SPK</span>
            </Button>
            )}
          </div>
        </div>

        {isLoadingItems ? (
          <div className="text-center py-4 text-xs text-gray-500 bg-white rounded-lg border">Memuat item…</div>
        ) : items.length === 0 ? (
          <div className="text-center py-5 bg-white/80 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500">
            Belum ada item perintah kerja. Silakan isi form di atas lalu klik <strong>Simpan Data</strong>.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 border-b">
                <tr>
                  <th className="py-2.5 px-3 text-center w-10">No</th>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Nama Mekanik</th>
                  <th className="py-2.5 px-3">Rencana Perawatan</th>
                  <th className="py-2.5 px-3">Jenis Perawatan</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                  <th className="py-2.5 px-3 text-right">Total Harga</th>
                  {(canEdit || canDelete) && <th className="py-2.5 px-3 text-center w-20">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((it, idx) => {
                  const lineTotal = Number(it.total_harga) || (Number(it.quantity) * Number(it.harga)) || 0;
                  return (
                    <tr key={it.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-2 px-3 text-center text-gray-500">{idx + 1}</td>
                      <td className="py-2 px-3 whitespace-nowrap text-gray-700">
                        {it.tanggal ? formatDateDisplay(it.tanggal) : '-'}
                      </td>
                      <td className="py-2 px-3 font-medium text-gray-900">
                        {it.nama_mekanik || '-'}
                      </td>
                      <td className="py-2 px-3 font-semibold text-gray-800">{it.rencana_perawatan}</td>
                      <td className="py-2 px-3 text-gray-700">{it.jenis_perawatan}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{Number(it.quantity).toLocaleString('id-ID')}</td>
                      <td className="py-2 px-3 text-right tabular-nums">Rp {Number(it.harga).toLocaleString('id-ID')}</td>
                      <td className="py-2 px-3 text-right font-bold text-gray-900 tabular-nums">
                        Rp {lineTotal.toLocaleString('id-ID')}
                      </td>
                      {(canEdit || canDelete) && (
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {canEdit && (
                          <button
                            type="button"
                            onClick={() => onEditItem(it)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit Item"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          )}
                          {canDelete && (
                          <button
                            type="button"
                            onClick={() => onDeleteItem(it.id)}
                            disabled={deletingId === it.id}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Hapus Item"
                          >
                            {deletingId === it.id ? (
                              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-400 border-t-red-600" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                          )}
                        </div>
                      </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t font-semibold">
                <tr>
                  <td colSpan={7} className="py-2.5 px-3 text-right text-gray-700 font-bold">Total Keseluruhan:</td>
                  <td className="py-2.5 px-3 text-right text-blue-800 font-bold tabular-nums">
                    Rp {totalBiaya.toLocaleString('id-ID')}
                  </td>
                  {(canEdit || canDelete) && <td></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
});

/* ─────────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────────── */
export default function PerawatanBerkala() {
  /* ── Data Hooks ──────────────────────────────────────── */
  const { data: items = [], isLoading } = usePerawatanBerkala();
  const addItem = useAddPerawatanBerkala();
  const updateItem = useUpdatePerawatanBerkala();
  const deleteItem = useDeletePerawatanBerkala();

  const { data: alatBeratList = [] } = useAlatBerat();
  const { data: alatPendukungList = [] } = useAlatPendukung();

  const {
    can_create: canCreate, can_edit: canEdit, can_delete: canDelete,
    can_export_excel: canExportExcel, can_print: canPrint, can_approve: canApprove,
  } = usePagePermission('permohonanPerawatanBerkala');
  const {
    can_view: canViewSpk,
    can_create: canCreateSpk,
    can_edit: canEditSpk,
    can_delete: canDeleteSpk,
    can_print: canPrintSpk,
  } = usePagePermission('spkPerawatanBerkala');
  const canShowActions = canEdit || canDelete || canApprove || canViewSpk;

  /* ── All assets for autocomplete ─────────────────────── */
  const allAssets = useMemo<AssetItem[]>(() => {
    const list: AssetItem[] = [];
    alatBeratList.forEach(a => list.push({ id: a.id, namaAlat: a.nama_alat || '', noLambung: a.no_lambung || '' }));
    alatPendukungList.forEach(a => list.push({ id: a.id, namaAlat: a.namaAlat || '', noLambung: a.noLambung || '' }));
    return list.sort((a, b) => a.noLambung.localeCompare(b.noLambung));
  }, [alatBeratList, alatPendukungList]);

  /* ── UI State ─────────────────────────────────────────── */
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [tableFilterFrom, setTableFilterFrom] = useState('');
  const [tableFilterTo, setTableFilterTo] = useState('');

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const [selectedItem, setSelectedItem] = useState<PerawatanBerkalaItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<PerawatanBerkalaItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>(emptyForm());
  const [editFormData, setEditFormData] = useState<FormData>(emptyForm());

  // Dropdown open states
  const [isNamaOpen, setIsNamaOpen] = useState(false);
  const [isLambungOpen, setIsLambungOpen] = useState(false);
  const [isEditNamaOpen, setIsEditNamaOpen] = useState(false);
  const [isEditLambungOpen, setIsEditLambungOpen] = useState(false);

  const createFormRef = useRef<HTMLDivElement>(null);
  const editFormRef = useRef<HTMLDivElement>(null);

  // Export/Print dialog
  const [exportPrintDialog, setExportPrintDialog] = useState<'export' | 'print' | null>(null);
  const [dialogMode, setDialogMode] = useState<'all' | 'range'>('all');
  const nowD = new Date();
  const firstDay = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}-${String(new Date(nowD.getFullYear(), nowD.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
  const [dateFrom, setDateFrom] = useState(firstDay);
  const [dateTo, setDateTo] = useState(lastDay);

  // ── Perintah Kerja (SPK) State ──────────────────────────
  const [selectedSPKItem, setSelectedSPKItem] = useState<PerawatanBerkalaItem | null>(null);
  const [spkForm, setSpkForm] = useState<SPKFormData>(emptySPKForm());
  const [editingSPKItemId, setEditingSPKItemId] = useState<string | null>(null);
  const [deletingSPKId, setDeletingSPKId] = useState<string | null>(null);

  const { data: spkItems = [], isLoading: isLoadingSPKItems } = usePerawatanBerkalaItems(selectedSPKItem?.id);
  const addSPKItem = useAddPerawatanBerkalaItem();
  const updateSPKItem = useUpdatePerawatanBerkalaItem();
  const deleteSPKItem = useDeletePerawatanBerkalaItem();

  /* ── Click-outside close dropdowns ───────────────────── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (createFormRef.current && !createFormRef.current.contains(e.target as Node)) {
        setIsNamaOpen(false); setIsLambungOpen(false);
      }
      if (editFormRef.current && !editFormRef.current.contains(e.target as Node)) {
        setIsEditNamaOpen(false); setIsEditLambungOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Filtered Assets ──────────────────────────────────── */
  const filteredByName = useMemo(() => {
    const q = (formData.nama_alat || '').trim().toLowerCase();
    return q ? allAssets.filter(a => a.namaAlat.toLowerCase().includes(q)) : allAssets;
  }, [allAssets, formData.nama_alat]);

  const filteredByLambung = useMemo(() => {
    const q = (formData.no_lambung || '').trim().toLowerCase();
    return q ? allAssets.filter(a => a.noLambung.toLowerCase().includes(q)) : allAssets;
  }, [allAssets, formData.no_lambung]);

  const filteredEditByName = useMemo(() => {
    const q = (editFormData.nama_alat || '').trim().toLowerCase();
    return q ? allAssets.filter(a => a.namaAlat.toLowerCase().includes(q)) : allAssets;
  }, [allAssets, editFormData.nama_alat]);

  const filteredEditByLambung = useMemo(() => {
    const q = (editFormData.no_lambung || '').trim().toLowerCase();
    return q ? allAssets.filter(a => a.noLambung.toLowerCase().includes(q)) : allAssets;
  }, [allAssets, editFormData.no_lambung]);

  /* ── Filtered Table Data ──────────────────────────────── */
  const getDateStr = (v: any) => {
    if (!v) return '';
    try { const d = parseMySQLDate(v); return d && !isNaN(d.getTime()) ? format(d, 'yyyy-MM-dd') : ''; } catch { return ''; }
  };

  const filteredData = useMemo(() => items.filter(item => {
    const q = searchTerm.trim().toLowerCase();
    if (q && !(
      item.no_lambung.toLowerCase().includes(q) ||
      item.nama_alat.toLowerCase().includes(q) ||
      item.no_dokumen.toLowerCase().includes(q) ||
      (item.lokasi || '').toLowerCase().includes(q)
    )) return false;
    const ds = getDateStr(item.tanggal);
    if (tableFilterFrom && ds && ds < tableFilterFrom) return false;
    if (tableFilterTo && ds && ds > tableFilterTo) return false;
    return true;
  }), [items, searchTerm, tableFilterFrom, tableFilterTo]);

  /* ── Handlers ─────────────────────────────────────────── */
  const handleCreate = async () => {
    if (!formData.tanggal || !formData.no_lambung || !formData.nama_alat) {
      toast({ title: 'Error', description: 'Tanggal, No. Lambung, dan Nama Alat harus diisi', variant: 'destructive' });
      return;
    }
    try {
      await addItem.mutateAsync({
        tanggal: formData.tanggal,
        no_dokumen: formData.no_dokumen,
        no_lambung: formData.no_lambung,
        nama_alat: formData.nama_alat,
        km_hm_terakhir: formData.km_hm_terakhir !== '' ? parseFloat(formData.km_hm_terakhir) : null,
        km_hm_saat_ini: formData.km_hm_saat_ini !== '' ? parseFloat(formData.km_hm_saat_ini) : null,
        lokasi: formData.lokasi || null,
        keterangan: formData.keterangan || null,
        status: 'pending',
        approved_by: null,
        approved_at: null,
      });
      setFormData(emptyForm());
      setShowCreateDialog(false);
    } catch { /* hook handles toast */ }
  };

  const handleEdit = (item: PerawatanBerkalaItem) => {
    setSelectedItem(item);
    setEditFormData({
      tanggal: item.tanggal,
      no_dokumen: item.no_dokumen,
      no_lambung: item.no_lambung,
      nama_alat: item.nama_alat,
      km_hm_terakhir: item.km_hm_terakhir != null ? String(item.km_hm_terakhir) : '',
      km_hm_saat_ini: item.km_hm_saat_ini != null ? String(item.km_hm_saat_ini) : '',
      lokasi: item.lokasi || '',
      keterangan: item.keterangan || '',
    });
    setShowEditDialog(true);
  };

  const handleUpdate = async () => {
    if (!selectedItem) return;
    if (!editFormData.tanggal || !editFormData.no_lambung || !editFormData.nama_alat) {
      toast({ title: 'Error', description: 'Tanggal, No. Lambung, dan Nama Alat harus diisi', variant: 'destructive' });
      return;
    }
    try {
      await updateItem.mutateAsync({
        id: selectedItem.id,
        tanggal: editFormData.tanggal,
        no_dokumen: editFormData.no_dokumen,
        no_lambung: editFormData.no_lambung,
        nama_alat: editFormData.nama_alat,
        km_hm_terakhir: editFormData.km_hm_terakhir !== '' ? parseFloat(editFormData.km_hm_terakhir) : null,
        km_hm_saat_ini: editFormData.km_hm_saat_ini !== '' ? parseFloat(editFormData.km_hm_saat_ini) : null,
        lokasi: editFormData.lokasi || null,
        keterangan: editFormData.keterangan || null,
      });
      setShowEditDialog(false);
      setSelectedItem(null);
    } catch { /* hook handles toast */ }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    try {
      setIsDeleting(deletingItem.id);
      await deleteItem.mutateAsync(deletingItem.id);
    } catch { /* hook handles toast */ } finally {
      setIsDeleting(null);
      setDeletingItem(null);
      setShowDeleteDialog(false);
    }
  };

  const handleApprove = async (status: 'approved' | 'rejected') => {
    if (!selectedItem) return;
    const current = selectedItem;
    try {
      await updateItem.mutateAsync({
        id: current.id,
        status,
        approved_by: 'Admin',
        approved_at: new Date().toISOString(),
      });
      toast({ title: 'Berhasil', description: `Data berhasil ${status === 'approved' ? 'disetujui' : 'ditolak'}` });
      if (status === 'approved' && canViewSpk) {
        setSelectedSPKItem({ ...current, status: 'approved' });
      }
    } catch { /* hook handles toast */ } finally {
      setShowApproveDialog(false);
      setShowRejectDialog(false);
      setSelectedItem(null);
    }
  };

  /* ── SPK Form Handlers ─────────────────────────────────── */
  const handleSubmitSPK = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSPKItem) return;
    if (editingSPKItemId ? !canEditSpk : !canCreateSpk) return;
    if (!spkForm.nama_mekanik.trim()) {
      toast({ title: 'Peringatan', description: 'Nama mekanik wajib diisi', variant: 'destructive' });
      return;
    }
    if (!spkForm.rencana_perawatan.trim()) {
      toast({ title: 'Peringatan', description: 'Rencana perawatan berkala wajib diisi', variant: 'destructive' });
      return;
    }
    if (!spkForm.jenis_perawatan.trim()) {
      toast({ title: 'Peringatan', description: 'Jenis perawatan wajib diisi', variant: 'destructive' });
      return;
    }

    try {
      if (editingSPKItemId) {
        await updateSPKItem.mutateAsync({
          id: editingSPKItemId,
          tanggal: spkForm.tanggal || null,
          nama_mekanik: spkForm.nama_mekanik.trim(),
          rencana_perawatan: spkForm.rencana_perawatan,
          jenis_perawatan: spkForm.jenis_perawatan,
          quantity: parseFloat(spkForm.quantity) || 1,
          harga: parseFloat(spkForm.harga) || 0,
        });
        setEditingSPKItemId(null);
      } else {
        await addSPKItem.mutateAsync({
          perawatan_berkala_id: selectedSPKItem.id,
          tanggal: spkForm.tanggal || null,
          nama_mekanik: spkForm.nama_mekanik.trim(),
          rencana_perawatan: spkForm.rencana_perawatan,
          jenis_perawatan: spkForm.jenis_perawatan,
          quantity: parseFloat(spkForm.quantity) || 1,
          harga: parseFloat(spkForm.harga) || 0,
        });
      }
      setSpkForm(emptySPKForm());
    } catch { /* hook handles toast */ }
  };

  const handleEditSPKItem = (item: PerawatanBerkalaItemDetail) => {
    setEditingSPKItemId(item.id);
    setSpkForm({
      tanggal: item.tanggal ? item.tanggal.substring(0, 10) : format(new Date(), 'yyyy-MM-dd'),
      nama_mekanik: item.nama_mekanik || '',
      rencana_perawatan: item.rencana_perawatan,
      jenis_perawatan: item.jenis_perawatan,
      quantity: String(item.quantity ?? 1),
      harga: String(item.harga ?? 0),
    });
  };

  const handleCancelEditSPK = () => {
    setEditingSPKItemId(null);
    setSpkForm(emptySPKForm());
  };

  const handleDeleteSPKItem = async (id: string) => {
    if (!canDeleteSpk) return;
    if (!window.confirm('Hapus item perintah kerja ini?')) return;
    setDeletingSPKId(id);
    try {
      await deleteSPKItem.mutateAsync(id);
    } finally {
      setDeletingSPKId(null);
    }
  };

  /* ── Export / Print ───────────────────────────────────── */
  const getExportData = () => dialogMode === 'range'
    ? filteredData.filter(i => {
      const ds = getDateStr(i.tanggal);
      if (!ds) return false;
      if (dateFrom && ds < dateFrom) return false;
      if (dateTo && ds > dateTo) return false;
      return true;
    })
    : filteredData;

  const doExportExcel = () => {
    const data = getExportData();
    if (!data.length) { toast({ title: 'Info', description: 'Tidak ada data untuk diekspor' }); return; }
    const ws = XLSX.utils.json_to_sheet(data.map((item, idx) => ({
      'No': idx + 1,
      'Tanggal': formatDateDisplay(item.tanggal),
      'No. Dokumen': item.no_dokumen,
      'No. Lambung': item.no_lambung,
      'Nama Alat': item.nama_alat,
      'KM/HM Terakhir': item.km_hm_terakhir ?? '',
      'KM/HM Saat Ini': item.km_hm_saat_ini ?? '',
      'Lokasi': item.lokasi || '',
      'Keterangan': item.keterangan || '',
      'Status': item.status === 'approved' ? 'Disetujui' : item.status === 'rejected' ? 'Ditolak' : 'Menunggu',
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Perawatan Berkala');
    XLSX.writeFile(wb, 'Perawatan_Berkala_Data.xlsx');
    toast({ title: 'Berhasil', description: `Berhasil mengekspor ${data.length} data ke Excel.` });
    setExportPrintDialog(null);
  };

  const doPrint = () => {
    const data = getExportData();
    if (!data.length) { toast({ title: 'Info', description: 'Tidak ada data untuk dicetak' }); return; }
    const win = window.open('', '', 'width=900,height=650');
    if (!win) { toast({ title: 'Error', description: 'Gagal membuka jendela print', variant: 'destructive' }); return; }
    win.document.write(`<!DOCTYPE html><html><head><title>Perawatan Berkala</title>
<style>
  @page{size:A4 landscape;margin:1cm}
  body{font-family:Arial,sans-serif;padding:20px;font-size:11px}
  .hdr{border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:16px}
  .co{font-weight:bold;font-size:14px}.div{font-size:12px;margin-bottom:6px}
  h1{color:#1a365d;text-align:center;font-size:17px;margin-bottom:4px}
  .dt{text-align:center;color:#666;margin-bottom:14px;font-size:10px}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #000;padding:5px 7px;text-align:left;vertical-align:top}
  th{background:#f2f2f2;font-weight:bold;text-align:center}
  td.num{text-align:right}
</style></head><body>
<div class="hdr"><div class="co">REKA UTAMA PERSADA</div><div class="div">Peralatan</div></div>
<h1>PERMOHONAN PERAWATAN BERKALA</h1>
<div class="dt">Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
<table><thead><tr>
  <th>No</th><th>Tanggal</th><th>No. Dokumen</th>
  <th>No. Lambung</th><th>Nama Alat</th>
  <th>KM/HM Terakhir</th><th>KM/HM Saat Ini</th>
  <th>Lokasi</th><th>Keterangan</th><th>Status</th>
</tr></thead><tbody>
${data.map((item, idx) => `<tr>
  <td style="text-align:center">${idx + 1}</td>
  <td>${formatDateDisplay(item.tanggal)}</td>
  <td>${item.no_dokumen || '-'}</td>
  <td>${item.no_lambung || '-'}</td>
  <td>${item.nama_alat || '-'}</td>
  <td class="num">${item.km_hm_terakhir != null ? item.km_hm_terakhir.toLocaleString('id-ID') : '-'}</td>
  <td class="num">${item.km_hm_saat_ini != null ? item.km_hm_saat_ini.toLocaleString('id-ID') : '-'}</td>
  <td>${item.lokasi || '-'}</td>
  <td>${item.keterangan || '-'}</td>
  <td>${item.status === 'approved' ? 'Disetujui' : item.status === 'rejected' ? 'Ditolak' : 'Menunggu'}</td>
</tr>`).join('')}
</tbody></table>
<script>window.onload=function(){setTimeout(function(){window.print();window.onafterprint=function(){window.close()};},500)}</script>
</body></html>`);
    win.document.close();
    setExportPrintDialog(null);
  };

  const handleDialogConfirm = () => {
    if (exportPrintDialog === 'export') doExportExcel(); else doPrint();
  };

  /* ── Render ───────────────────────────────────────────── */
  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Permohonan Perawatan Berkala</h1>
        {canCreate && (
          <Button onClick={() => setShowCreateDialog(true)} className="w-full sm:w-auto flex items-center justify-center">
            <Plus className="mr-2 h-4 w-4" /> Buat Permohonan Baru
          </Button>
        )}
      </div>

      {/* Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
              {canPrint && (
                <Button variant="outline" onClick={() => { setDialogMode('all'); setExportPrintDialog('print'); }}
                  className="flex items-center justify-center gap-2 text-xs sm:text-sm px-3 py-2 w-full sm:w-auto">
                  <Printer className="h-4 w-4" /> Cetak Semua
                </Button>
              )}
              {canExportExcel && (
                <Button variant="outline" onClick={() => { setDialogMode('all'); setExportPrintDialog('export'); }}
                  className="flex items-center justify-center gap-2 text-xs sm:text-sm px-3 py-2 w-full sm:w-auto">
                  <Download className="h-4 w-4" /> Ekspor Excel
                </Button>
              )}
            </div>
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1 justify-end">
              <div className="relative max-w-xs flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input placeholder="Cari nomor lambung, nama alat…" className="pl-10"
                  value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
              </div>
              <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5 text-sm h-10">
                <Calendar size={16} className="text-gray-400 flex-shrink-0" />
                <input type="date" value={tableFilterFrom}
                  onChange={e => { setTableFilterFrom(e.target.value); setCurrentPage(1); }}
                  className="border-0 bg-transparent focus:ring-0 text-sm p-0 w-[120px]" />
                <span className="text-gray-400">—</span>
                <input type="date" value={tableFilterTo}
                  onChange={e => { setTableFilterTo(e.target.value); setCurrentPage(1); }}
                  className="border-0 bg-transparent focus:ring-0 text-sm p-0 w-[120px]" />
                {(tableFilterFrom || tableFilterTo) && (
                  <button onClick={() => { setTableFilterFrom(''); setTableFilterTo(''); setCurrentPage(1); }}
                    className="ml-1 p-0.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {selectedSPKItem && canViewSpk && (
            <SPKSection
              selectedItem={selectedSPKItem}
              onClose={() => setSelectedSPKItem(null)}
              form={spkForm}
              onChangeForm={setSpkForm}
              onSubmit={handleSubmitSPK}
              isEditing={!!editingSPKItemId}
              onCancelEdit={handleCancelEditSPK}
              isSaving={addSPKItem.isPending || updateSPKItem.isPending}
              items={spkItems}
              isLoadingItems={isLoadingSPKItems}
              onEditItem={handleEditSPKItem}
              onDeleteItem={handleDeleteSPKItem}
              deletingId={deletingSPKId}
              canCreate={canCreateSpk}
              canEdit={canEditSpk}
              canDelete={canDeleteSpk}
              canPrint={canPrintSpk}
            />
          )}

          <TableScrollWrapper className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">No</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>No. Dokumen</TableHead>
                  <TableHead>No. Lambung</TableHead>
                  <TableHead>Nama Alat</TableHead>
                  <TableHead className="text-right">KM/HM Terakhir</TableHead>
                  <TableHead className="text-right">KM/HM Saat Ini</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Status</TableHead>
                  {canShowActions && <TableHead className="w-[160px]">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={canShowActions ? 10 : 9} className="text-center py-8">Memuat data…</TableCell></TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canShowActions ? 10 : 9} className="text-center py-8 text-gray-500">
                      {searchTerm || tableFilterFrom || tableFilterTo ? 'Tidak ada data yang cocok dengan filter' : 'Belum ada data perawatan berkala'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginateData(filteredData, currentPage, pageSize).map((item, idx) => (
                    <TableRow key={item.id} className={selectedSPKItem?.id === item.id ? 'bg-blue-50/50 font-medium' : ''}>
                      <TableCell className="text-center text-gray-500 text-sm">{(currentPage - 1) * pageSize + idx + 1}</TableCell>
                      <TableCell>{formatDateDisplay(item.tanggal)}</TableCell>
                      <TableCell className="font-medium">{item.no_dokumen || '-'}</TableCell>
                      <TableCell className="font-medium">{item.no_lambung}</TableCell>
                      <TableCell>{item.nama_alat}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.km_hm_terakhir != null ? item.km_hm_terakhir.toLocaleString('id-ID') : '-'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.km_hm_saat_ini != null ? item.km_hm_saat_ini.toLocaleString('id-ID') : '-'}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">{item.lokasi || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <StatusBadge status={item.status} />
                          {item.status === 'approved' && canViewSpk && (
                            <button
                              type="button"
                              onClick={() => setSelectedSPKItem(selectedSPKItem?.id === item.id ? null : item)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${selectedSPKItem?.id === item.id
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                }`}
                              title="Buka form Perintah Kerja di atas tabel"
                            >
                              <ClipboardList className="w-3 h-3" /> Perintah Kerja
                            </button>
                          )}
                        </div>
                      </TableCell>
                      {canShowActions && (
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            {item.status === 'pending' && canApprove && (
                              <>
                                <Button variant="ghost" size="sm" className="text-green-600 hover:bg-green-50 p-1 h-8 w-8" title="Setujui"
                                  onClick={() => { setSelectedItem(item); setShowApproveDialog(true); }}>
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 p-1 h-8 w-8" title="Tolak"
                                  onClick={() => { setSelectedItem(item); setShowRejectDialog(true); }}>
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {item.status === 'approved' && canViewSpk && (
                              <Button
                                variant={selectedSPKItem?.id === item.id ? "default" : "outline"}
                                size="sm"
                                className="h-8 px-2 text-xs flex items-center gap-1 font-medium"
                                onClick={() => setSelectedSPKItem(selectedSPKItem?.id === item.id ? null : item)}
                                title="Form Perintah Kerja"
                              >
                                <ClipboardList className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Perintah Kerja</span>
                              </Button>
                            )}
                            {canEdit && (
                              <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50 p-1 h-8 w-8" title="Edit"
                                onClick={() => handleEdit(item)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 p-1 h-8 w-8" title="Hapus"
                                disabled={isDeleting === item.id}
                                onClick={() => { setDeletingItem(item); setShowDeleteDialog(true); }}>
                                {isDeleting === item.id
                                  ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-blue-600" />
                                  : <Trash2 className="h-4 w-4" />}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableScrollWrapper>
          <SimplePagination
            currentPage={currentPage}
            totalPages={getTotalPages(filteredData.length, pageSize)}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }}
            totalItems={filteredData.length}
          />
        </CardContent>
      </Card>

      {/* ── CREATE DIALOG ─────────────────────────────── */}
      <Dialog open={showCreateDialog} onOpenChange={val => {
        setShowCreateDialog(val);
        if (!val) { setFormData(emptyForm()); setIsNamaOpen(false); setIsLambungOpen(false); }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Buat Permohonan Perawatan Berkala</DialogTitle></DialogHeader>
          <FormBody
            data={formData} onChange={setFormData}
            filteredName={filteredByName} filteredLambung={filteredByLambung}
            isNameOpen={isNamaOpen} setNameOpen={setIsNamaOpen}
            isLambungOpen={isLambungOpen} setLambungOpen={setIsLambungOpen}
            formRef={createFormRef}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); setFormData(emptyForm()); }}>Batal</Button>
            <Button onClick={handleCreate} disabled={addItem.isPending}>
              {addItem.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── EDIT DIALOG ───────────────────────────────── */}
      <Dialog open={showEditDialog} onOpenChange={val => {
        setShowEditDialog(val);
        if (!val) { setSelectedItem(null); setIsEditNamaOpen(false); setIsEditLambungOpen(false); }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Perawatan Berkala</DialogTitle></DialogHeader>
          <FormBody
            data={editFormData} onChange={setEditFormData}
            filteredName={filteredEditByName} filteredLambung={filteredEditByLambung}
            isNameOpen={isEditNamaOpen} setNameOpen={setIsEditNamaOpen}
            isLambungOpen={isEditLambungOpen} setLambungOpen={setIsEditLambungOpen}
            formRef={editFormRef}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); setSelectedItem(null); }}>Batal</Button>
            <Button onClick={handleUpdate} disabled={updateItem.isPending}>
              {updateItem.isPending ? 'Menyimpan…' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── APPROVE DIALOG ────────────────────────────── */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Konfirmasi Persetujuan</DialogTitle></DialogHeader>
          <div className="py-4">
            <p>Apakah Anda yakin ingin menyetujui permohonan ini?</p>
            <p className="font-medium mt-2">{selectedItem?.no_lambung} — {selectedItem?.nama_alat}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>Batal</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove('approved')}>Setujui</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── REJECT DIALOG ─────────────────────────────── */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Konfirmasi Penolakan</DialogTitle></DialogHeader>
          <div className="py-4">
            <p>Apakah Anda yakin ingin menolak permohonan ini?</p>
            <p className="font-medium mt-2">{selectedItem?.no_lambung} — {selectedItem?.nama_alat}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Batal</Button>
            <Button variant="destructive" onClick={() => handleApprove('rejected')}>Tolak</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE DIALOG ─────────────────────────────── */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Konfirmasi Hapus</DialogTitle></DialogHeader>
          <div className="py-4">
            <p>Apakah Anda yakin ingin menghapus data ini?</p>
            {deletingItem && <p className="font-medium mt-2 text-red-600">{deletingItem.no_lambung} — {deletingItem.nama_alat}</p>}
            <p className="text-sm text-gray-500 mt-1">Tindakan ini tidak dapat dibatalkan.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setDeletingItem(null); }}>Batal</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting !== null}>
              {isDeleting !== null ? 'Menghapus…' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── EXPORT / PRINT DIALOG ─────────────────────── */}
      {exportPrintDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold mb-1 text-gray-900">
              {exportPrintDialog === 'export' ? '📥 Ekspor Data' : '🖨️ Cetak Data'}
            </h3>
            <p className="text-sm text-gray-500 mb-5">Pilih data yang ingin {exportPrintDialog === 'export' ? 'diekspor' : 'dicetak'}:</p>
            <div className="flex flex-col gap-3 mb-5">
              {(['all', 'range'] as const).map(mode => (
                <label key={mode} className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${dialogMode === mode ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'}`}
                  onClick={() => setDialogMode(mode)}>
                  <input type="radio" name="mode" checked={dialogMode === mode} onChange={() => setDialogMode(mode)} className="accent-blue-600" />
                  <div>
                    <p className="font-medium text-sm text-gray-800">{mode === 'all' ? 'Semua Data' : 'Rentang Tanggal'}</p>
                    <p className="text-xs text-gray-500">{mode === 'all' ? `${filteredData.length} data` : 'Pilih periode tertentu'}</p>
                  </div>
                </label>
              ))}
            </div>
            {dialogMode === 'range' && (
              <div className="flex items-center gap-2 mb-5 p-3 bg-gray-50 rounded-lg border">
                <Calendar size={16} className="text-gray-400 flex-shrink-0" />
                <div className="flex items-center gap-2 flex-1">
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="form-input text-sm py-1.5 flex-1" />
                  <span className="text-gray-400 text-sm">s/d</span>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="form-input text-sm py-1.5 flex-1" />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => setExportPrintDialog(null)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 text-gray-700">Batal</button>
              <button onClick={handleDialogConfirm}
                className={`px-4 py-2 text-white rounded-lg text-sm ${exportPrintDialog === 'export' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {exportPrintDialog === 'export' ? 'Ekspor Excel' : 'Cetak Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
