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
  Calendar, X, ClipboardList, CheckSquare, Wrench, ChevronDown, Check,
  AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  usePerbaikanAlat, useAddPerbaikanAlat, useUpdatePerbaikanAlat,
  useDeletePerbaikanAlat, PerbaikanAlatItem
} from '@/hooks/usePerbaikanAlat';
import {
  usePerbaikanAlatPemeriksaan, useAddPerbaikanAlatPemeriksaan,
  useUpdatePerbaikanAlatPemeriksaan, useDeletePerbaikanAlatPemeriksaan,
  PerbaikanAlatPemeriksaanItem
} from '@/hooks/usePerbaikanAlatPemeriksaan';
import {
  usePerbaikanAlatItems, useAddPerbaikanAlatItem,
  useUpdatePerbaikanAlatItem, useDeletePerbaikanAlatItem,
  PerbaikanAlatItemDetail
} from '@/hooks/usePerbaikanAlatItems';
import { useSparepart } from '@/hooks/useSparepart';
import { usePagePermission } from '@/hooks/usePagePermission';
import { SimplePagination, paginateData, getTotalPages } from '@/components/ui/SimplePagination';
import { formatDateDisplay } from '@/utils/dateUtils';
import { useAlatBerat } from '@/hooks/useAlatBerat';
import { useAlatPendukung } from '@/hooks/useAlatPendukung';
import { TableScrollWrapper } from '@/components/ui/TableScrollWrapper';

/* ─────────────────────────────────────────────────────────────────
   Helper: Parse Kerusakan List (Array or JSON string or CSV)
───────────────────────────────────────────────────────────────── */
export const parseKerusakanList = (raw: any): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return raw.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
  }
  return [];
};

/* ─────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────── */
export interface FormData {
  tanggal: string;
  no_dokumen: string;
  no_lambung: string;
  nama_alat: string;
  lokasi: string;
  kerusakan: string;
  jenis_kerusakan: string[];
}

export interface PemeriksaanFormData {
  jenis_perbaikan: string;
  nama_sparepart: string;
  quantity: string;
  harga: string;
}

export interface SPKFormData {
  jenis_perbaikan: string;
  nama_sparepart: string;
  quantity: string;
  stock: string;
  harga_satuan: string;
}

export type AssetItem = { id: string; namaAlat: string; noLambung: string };

export const emptyForm = (): FormData => ({
  tanggal: format(new Date(), 'yyyy-MM-dd'),
  no_dokumen: '',
  no_lambung: '',
  nama_alat: '',
  lokasi: '',
  kerusakan: '',
  jenis_kerusakan: [],
});

export const emptyPemeriksaanForm = (): PemeriksaanFormData => ({
  jenis_perbaikan: '',
  nama_sparepart: '',
  quantity: '1',
  harga: '0',
});

export const emptySPKForm = (): SPKFormData => ({
  jenis_perbaikan: '',
  nama_sparepart: '',
  quantity: '1',
  stock: '0',
  harga_satuan: '0',
});

/* ─────────────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────────────── */

const StatusBadge = memo(({ status }: { status: string }) => {
  const cls: Record<string, string> = {
    approved: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };
  const label: Record<string, string> = { approved: 'Disetujui', rejected: 'Ditolak', pending: 'Menunggu' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls[status] ?? cls.pending}`}>
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

/* Sparepart Auto-complete Input with Manual Entry Support */
interface SparepartOption {
  namaSparepart: string;
  stock: number;
  harga: number;
  satuan: string;
}

const SparepartCombobox = memo(({
  value,
  onChange,
  onSelectOption,
  options,
  placeholder = 'Pilih sparepart atau ketik manual...',
}: {
  value: string;
  onChange: (val: string) => void;
  onSelectOption: (opt: SparepartOption) => void;
  options: SparepartOption[];
  placeholder?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!value) return options.slice(0, 30);
    const q = value.toLowerCase();
    return options.filter(o => o.namaSparepart.toLowerCase().includes(q)).slice(0, 30);
  }, [value, options]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Input
          type="text"
          value={value}
          onChange={e => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="pr-8 text-xs sm:text-sm"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg text-xs">
          {filtered.length === 0 ? (
            <div className="p-2.5 text-gray-500 italic">
              Tidak ada di stok (tekan untuk gunakan input manual: "{value}")
            </div>
          ) : (
            filtered.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-blue-50 border-b border-gray-100 last:border-0 flex items-center justify-between transition-colors"
                onMouseDown={e => {
                  e.preventDefault();
                  onSelectOption(opt);
                  setIsOpen(false);
                }}
              >
                <div>
                  <div className="font-semibold text-gray-800">{opt.namaSparepart}</div>
                  <div className="text-[11px] text-gray-500">
                    Satuan: {opt.satuan} {opt.harga > 0 ? `| Rp ${Number(opt.harga).toLocaleString('id-ID')}` : ''}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${opt.stock > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                    Stok: {opt.stock}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
});

/* Dynamic Jenis Kerusakan Input Component */
const JenisKerusakanInput = ({
  value,
  onChange,
}: {
  value: string[];
  onChange: (val: string[]) => void;
}) => {
  const [inputVal, setInputVal] = useState('');

  const handleAdd = () => {
    const trimmed = inputVal.trim();
    if (!trimmed) return;
    if (value.includes(trimmed)) {
      toast({ title: 'Info', description: 'Jenis kerusakan sudah ada dalam daftar' });
      return;
    }
    onChange([...value, trimmed]);
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          Jenis Kerusakan <span className="text-gray-400 font-normal text-xs">(Bisa ditambah beberapa)</span>
        </label>
        {value.length > 0 && (
          <span className="text-xs text-blue-600 font-semibold">{value.length} kerusakan ditambahkan</span>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Ketik jenis kerusakan (contoh: Silinder Arm Bocor), lalu klik Tambah..."
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          className="text-xs sm:text-sm"
        />
        <Button
          type="button"
          onClick={handleAdd}
          variant="secondary"
          className="shrink-0 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs sm:text-sm font-medium"
        >
          <Plus className="h-4 w-4 mr-1" /> Tambah
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="text-xs text-gray-400 italic">
          Belum ada jenis kerusakan. Ketik lalu tekan tombol Tambah atau Enter.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2 pt-1">
          {value.map((jk, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs"
            >
              <span>{jk}</span>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="text-blue-400 hover:text-red-600 rounded-full p-0.5 transition-colors"
                title="Hapus"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

/* Main Form Body */
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
  <div ref={formRef} className="grid gap-4 py-4 text-sm">
    {/* Row 1: Tanggal + No. Dokumen */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-gray-700">Tanggal <span className="text-red-500">*</span></label>
        <Input type="date" value={data.tanggal}
          onChange={e => onChange({ ...data, tanggal: e.target.value })} />
      </div>
      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-gray-700">No. Dokumen <span className="text-red-500">*</span></label>
        <Input placeholder="Contoh: 001/PPA-PERBAIKAN/III/2026" value={data.no_dokumen}
          onChange={e => onChange({ ...data, no_dokumen: e.target.value })} />
      </div>
    </div>

    {/* Row 2: No. Lambung + Nama Alat */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="grid gap-1.5 relative">
        <label className="text-sm font-medium text-gray-700">No. Lambung <span className="text-red-500">*</span></label>
        <Input placeholder="Ketik no. lambung…" value={data.no_lambung}
          onChange={e => { onChange({ ...data, no_lambung: e.target.value }); setLambungOpen(true); }}
          onFocus={() => setLambungOpen(true)} />
        {isLambungOpen && (
          <AssetDropdown assets={filteredLambung} onSelect={a => {
            onChange({ ...data, no_lambung: a.noLambung, nama_alat: a.namaAlat });
            setLambungOpen(false);
          }} />
        )}
      </div>
      <div className="grid gap-1.5 relative">
        <label className="text-sm font-medium text-gray-700">Nama Alat <span className="text-red-500">*</span></label>
        <Input placeholder="Ketik nama alat…" value={data.nama_alat}
          onChange={e => { onChange({ ...data, nama_alat: e.target.value }); setNameOpen(true); }}
          onFocus={() => setNameOpen(true)} />
        {isNameOpen && (
          <AssetDropdown assets={filteredName} onSelect={a => {
            onChange({ ...data, nama_alat: a.namaAlat, no_lambung: a.noLambung });
            setNameOpen(false);
          }} />
        )}
      </div>
    </div>

    {/* Row 3: Lokasi */}
    <div className="grid gap-1.5">
      <label className="text-sm font-medium text-gray-700">Lokasi Proyek / Workshop</label>
      <Input placeholder="Contoh: Workshop Bekasi / Proyek Cisumdawu" value={data.lokasi}
        onChange={e => onChange({ ...data, lokasi: e.target.value })} />
    </div>

    {/* Row 4: Jenis Kerusakan (Bisa ditambah) */}
    <div className="pt-1">
      <JenisKerusakanInput
        value={data.jenis_kerusakan || []}
        onChange={list => onChange({ ...data, jenis_kerusakan: list })}
      />
    </div>

    {/* Row 5: Kerusakan / Deskripsi Tambahan */}
    <div className="grid gap-1.5">
      <label className="text-sm font-medium text-gray-700">Deskripsi Kerusakan / Keluhan Tambahan</label>
      <textarea
        rows={3}
        placeholder="Jelaskan detail indikasi kerusakan atau keluhan teknis alat…"
        value={data.kerusakan}
        onChange={e => onChange({ ...data, kerusakan: e.target.value })}
        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  </div>
));

/* ─────────────────────────────────────────────────────────────────
   Perintah Pemeriksaan Section
───────────────────────────────────────────────────────────────── */
interface PemeriksaanSectionProps {
  selectedItem: PerbaikanAlatItem;
  onClose: () => void;
  form: PemeriksaanFormData;
  onChangeForm: (f: PemeriksaanFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  isEditing: boolean;
  onCancelEdit: () => void;
  isSaving: boolean;
  items: PerbaikanAlatPemeriksaanItem[];
  isLoadingItems: boolean;
  onEditItem: (item: PerbaikanAlatPemeriksaanItem) => void;
  onDeleteItem: (id: string) => void;
  deletingId: string | null;
  sparepartOptions: SparepartOption[];
  onApprovePemeriksaan: () => void;
  isApproving: boolean;
  canApprove: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPrint: boolean;
  onToggleCheckedKerusakan: (jk: string) => void;
}

const PemeriksaanSection = memo(({
  selectedItem, onClose, form, onChangeForm, onSubmit,
  isEditing, onCancelEdit, isSaving, items, isLoadingItems,
  onEditItem, onDeleteItem, deletingId, sparepartOptions,
  onApprovePemeriksaan, isApproving, canApprove,
  canCreate, canEdit, canDelete, canPrint,
  onToggleCheckedKerusakan
}: PemeriksaanSectionProps) => {
  const canSubmitForm = isEditing ? canEdit : canCreate;
  const totalEstimasi = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.total_harga) || (Number(it.quantity) * Number(it.harga)) || 0), 0);
  }, [items]);

  const hasPendingItems = items.some(it => it.status === 'pending');
  const isAllApproved = items.length > 0 && !hasPendingItems;

  const jenisKerusakanList = useMemo(() => {
    return parseKerusakanList(selectedItem.jenis_kerusakan);
  }, [selectedItem.jenis_kerusakan]);

  const checkedKerusakan = useMemo(() => {
    return parseKerusakanList(selectedItem.checked_kerusakan);
  }, [selectedItem.checked_kerusakan]);

  const handlePrintPemeriksaan = () => {
    if (!items.length && !jenisKerusakanList.length) {
      toast({ title: 'Info', description: 'Belum ada data pemeriksaan untuk dicetak' });
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
  <title>Surat Perintah Pemeriksaan - ${selectedItem.no_dokumen || selectedItem.no_lambung}</title>
  <style>
    @page { size: A4 portrait; margin: 1.2cm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 10px; font-size: 11px; color: #1f2937; line-height: 1.4; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #d97706; padding-bottom: 8px; margin-bottom: 14px; }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .company-logo { width: 50px; height: 50px; object-fit: contain; }
    .company-info { flex: 1; }
    .company { font-size: 16px; font-weight: bold; color: #b45309; letter-spacing: 0.5px; }
    .divisi { font-size: 11px; color: #4b5563; }
    .address { font-size: 10px; color: #64748b; margin-top: 2px; }
    .title-box { text-align: center; margin-bottom: 16px; }
    .title { font-size: 15px; font-weight: bold; color: #111827; text-transform: uppercase; margin-bottom: 3px; letter-spacing: 0.5px; }
    .doc-num { font-size: 11px; color: #4b5563; }
    
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 24px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; font-size: 11px; }
    .info-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #fef3c7; padding-bottom: 3px; }
    .info-label { color: #78350f; font-weight: 500; }
    .info-val { font-weight: 600; color: #0f172a; }

    .kerusakan-box { margin-bottom: 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; font-size: 11px; }
    .kerusakan-title { font-weight: bold; color: #92400e; margin-bottom: 6px; font-size: 11.5px; }
    .kerusakan-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
    .kerusakan-item { display: flex; align-items: center; gap: 6px; font-size: 11px; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th, td { border: 1px solid #94a3b8; padding: 6px 8px; text-align: left; vertical-align: middle; }
    th { background: #fef3c7; font-weight: bold; text-align: center; font-size: 10.5px; color: #78350f; }
    td.num { text-align: right; }
    td.center { text-align: center; }
    tfoot tr { background: #fffbeb; font-weight: bold; }
    tfoot td { border-top: 2px solid #d97706; }

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
      <div>Status: <strong>${isAllApproved ? 'Disetujui (Approved)' : 'Menunggu Persetujuan'}</strong></div>
    </div>
  </div>

  <div class="title-box">
    <div class="title">SURAT PERINTAH PEMERIKSAAN KERUSAKAN ALAT</div>
    <div class="doc-num">No. Dokumen: <strong>${selectedItem.no_dokumen || '-'}</strong></div>
  </div>

  <div class="info-grid">
    <div class="info-row"><span class="info-label">Nomor Lambung:</span><span class="info-val">${selectedItem.no_lambung}</span></div>
    <div class="info-row"><span class="info-label">Tanggal Pengajuan:</span><span class="info-val">${formatDateDisplay(selectedItem.tanggal)}</span></div>
    <div class="info-row"><span class="info-label">Nama Alat:</span><span class="info-val">${selectedItem.nama_alat}</span></div>
    <div class="info-row"><span class="info-label">Lokasi:</span><span class="info-val">${selectedItem.lokasi || '-'}</span></div>
  </div>

  ${jenisKerusakanList.length > 0 ? `
    <div class="kerusakan-box">
      <div class="kerusakan-title">Hasil Pemeriksaan Jenis Kerusakan:</div>
      <div class="kerusakan-grid">
        ${jenisKerusakanList.map(k => {
          const isChecked = checkedKerusakan.includes(k);
          return `<div class="kerusakan-item">
            <span style="font-weight: bold; color: ${isChecked ? '#16a34a' : '#9ca3af'};">${isChecked ? '[ ✓ Terverifikasi ]' : '[   Belum/Tidak Terverifikasi ]'}</span>
            <span style="${isChecked ? 'font-weight: 600; color: #111827;' : 'color: #6b7280;'}">${k}</span>
          </div>`;
        }).join('')}
      </div>
    </div>
  ` : ''}

  ${selectedItem.kerusakan ? `
    <div style="font-size: 10.5px; margin-bottom: 14px; background: #fff; border: 1px solid #e2e8f0; padding: 6px 10px; border-radius: 4px;">
      <strong>Deskripsi Kerusakan / Keluhan:</strong> ${selectedItem.kerusakan}
    </div>
  ` : ''}

  <table>
    <thead>
      <tr>
        <th style="width: 25px;">No</th>
        <th>Jenis Perbaikan</th>
        <th>Sparepart / Jasa</th>
        <th style="width: 50px;">Qty</th>
        <th style="width: 100px;">Estimasi Harga</th>
        <th style="width: 110px;">Total Harga</th>
        <th style="width: 80px;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${items.length === 0 ? `<tr><td colspan="7" class="center" style="padding: 12px; color: #6b7280;">Belum ada item pemeriksaan</td></tr>` : items.map((it, idx) => {
        const lineTotal = Number(it.total_harga) || ((Number(it.quantity) || 0) * (Number(it.harga) || 0));
        return `<tr>
          <td class="center">${idx + 1}</td>
          <td><strong>${it.jenis_perbaikan}</strong></td>
          <td>${it.nama_sparepart}</td>
          <td class="num">${Number(it.quantity).toLocaleString('id-ID')}</td>
          <td class="num">Rp ${Number(it.harga).toLocaleString('id-ID')}</td>
          <td class="num" style="font-weight: 600;">Rp ${lineTotal.toLocaleString('id-ID')}</td>
          <td class="center">${it.status === 'approved' ? 'Disetujui' : 'Menunggu'}</td>
        </tr>`;
      }).join('')}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="5" style="text-align: right; font-weight: bold; padding-right: 12px;">Total Estimasi Biaya Pemeriksaan:</td>
        <td class="num" style="font-weight: bold; color: #b45309;">Rp ${totalEstimasi.toLocaleString('id-ID')}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  <div class="signatures">
    <div class="sig-box">
      <div class="sig-title">Diperiksa Oleh:</div>
      <div class="sig-line">( Mekanik / Pemeriksa )</div>
    </div>
    <div class="sig-box">
      <div class="sig-title">Diketahui Oleh:</div>
      <div class="sig-line">( Kepala Mekanik )</div>
    </div>
    <div class="sig-box">
      <div class="sig-title">Disetujui Oleh:</div>
      <div class="sig-line">( Manajer Peralatan )</div>
    </div>
  </div>

  <div class="footer">
    Dokumen ini dicetak otomatis dari Sistem Informasi Peralatan PT. REKA UTAMA PERSADA
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
    <div className="mb-6 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50/70 via-white to-orange-50/40 p-5 shadow-sm space-y-5 transition-all">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-600 text-white shadow-sm flex-shrink-0">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-gray-900">
                1. Form Perintah Pemeriksaan
              </h3>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                {selectedItem.no_dokumen || 'Tanpa No. Dok'}
              </span>
              {isAllApproved ? (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Pemeriksaan Disetujui
                </span>
              ) : (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">
                  Menunggu Persetujuan Pemeriksaan
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              Unit: <strong className="text-gray-900">{selectedItem.no_lambung}</strong> — {selectedItem.nama_alat} | Lokasi: {selectedItem.lokasi || '-'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {canPrint && (items.length > 0 || jenisKerusakanList.length > 0) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrintPemeriksaan}
              className="h-8 px-2.5 text-xs flex items-center gap-1.5 bg-white border-amber-300 hover:bg-amber-50 text-amber-900 shadow-2xs font-medium"
              title="Cetak Surat Perintah Pemeriksaan"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Cetak Pemeriksaan</span>
            </Button>
          )}
          {items.length > 0 && canApprove && hasPendingItems && (
            <Button
              type="button"
              size="sm"
              onClick={onApprovePemeriksaan}
              disabled={isApproving}
              className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{isApproving ? 'Menyetujui...' : 'Setujui Pemeriksaan'}</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-700 hover:bg-white/80 rounded-full"
            title="Tutup Panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Checklist Jenis Kerusakan dari Permohonan */}
      {jenisKerusakanList.length > 0 && (
        <div className="bg-white/95 border border-amber-200 rounded-lg p-3.5 shadow-2xs space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Jenis Kerusakan dari Permohonan (Checklist Pemeriksaan)
              </span>
            </div>
            <span className="text-[11px] text-amber-800">
              Centang kerusakan yang terverifikasi untuk dilanjutkan ke Perintah Kerja
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
            {jenisKerusakanList.map((jk, idx) => {
              const isChecked = checkedKerusakan.includes(jk);
              return (
                <label
                  key={idx}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs select-none transition-all ${canEdit ? 'cursor-pointer' : 'cursor-default'} ${isChecked
                    ? 'bg-amber-50/80 border-amber-400 text-amber-950 font-semibold shadow-2xs'
                    : 'bg-gray-50/60 border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={!canEdit}
                    onChange={() => canEdit && onToggleCheckedKerusakan(jk)}
                    className="mt-0.5 h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <span className="flex-1 leading-snug">{jk}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Form Input Item Pemeriksaan */}
      {canSubmitForm && <form onSubmit={onSubmit} className="bg-white/80 backdrop-blur-sm border border-amber-100 p-4 rounded-lg shadow-xs space-y-3">
        <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5 text-amber-600" />
            <span>{isEditing ? 'Edit Item Pemeriksaan' : 'Tambah Item Pemeriksaan'}</span>
          </div>

          {checkedKerusakan.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-gray-500 font-normal">Pilih cepat:</span>
              {checkedKerusakan.map((jk, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onChangeForm({ ...form, jenis_perbaikan: jk })}
                  className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded text-[11px] text-amber-800 font-medium transition-colors"
                >
                  + {jk}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          {/* Jenis Perbaikan */}
          <div className="sm:col-span-4 space-y-1">
            <Label className="text-xs font-medium text-gray-700">Jenis Perbaikan <span className="text-red-500">*</span></Label>
            <Input
              type="text"
              placeholder="Contoh: Perbaikan Hidrolik / Service Silinder"
              value={form.jenis_perbaikan}
              onChange={e => onChangeForm({ ...form, jenis_perbaikan: e.target.value })}
              className="h-9 text-xs"
              required
            />
          </div>

          {/* Sparepart / Jasa */}
          <div className="sm:col-span-4 space-y-1">
            <Label className="text-xs font-medium text-gray-700">Sparepart / Jasa <span className="text-red-500">*</span></Label>
            <SparepartCombobox
              value={form.nama_sparepart}
              onChange={val => onChangeForm({ ...form, nama_sparepart: val })}
              onSelectOption={opt => {
                onChangeForm({
                  ...form,
                  nama_sparepart: opt.namaSparepart,
                  harga: opt.harga > 0 ? String(opt.harga) : form.harga,
                });
              }}
              options={sparepartOptions}
              placeholder="Pilih dari stok atau ketik manual..."
            />
          </div>

          {/* Quantity */}
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-xs font-medium text-gray-700">Quantity <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              min="0.01"
              step="any"
              placeholder="1"
              value={form.quantity}
              onChange={e => onChangeForm({ ...form, quantity: e.target.value })}
              className="h-9 text-xs text-right"
              required
            />
          </div>

          {/* Harga */}
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-xs font-medium text-gray-700">Harga (Rp) <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              min="0"
              step="any"
              placeholder="0"
              value={form.harga}
              onChange={e => onChangeForm({ ...form, harga: e.target.value })}
              className="h-9 text-xs text-right"
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            Estimasi Subtotal: <strong className="text-gray-900 font-semibold">Rp {((Number(form.quantity) || 0) * (Number(form.harga) || 0)).toLocaleString('id-ID')}</strong>
          </div>
          <div className="flex items-center gap-2">
            {isEditing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancelEdit}
                className="h-8 text-xs text-gray-600"
              >
                Batal
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={isSaving}
              className="h-8 px-4 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium"
            >
              {isSaving ? 'Menyimpan...' : isEditing ? 'Perbarui Item' : '+ Simpan Item'}
            </Button>
          </div>
        </div>
      </form>}

      {/* Tabel Item Pemeriksaan */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
            Daftar Item Perintah Pemeriksaan ({items.length})
          </h4>
        </div>

        {isLoadingItems ? (
          <div className="p-8 text-center text-xs text-gray-500">Memuat data pemeriksaan...</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-xs bg-white rounded-lg border border-dashed border-amber-200 text-gray-500">
            Belum ada item pemeriksaan. Silakan isi form di atas dan klik simpan.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-amber-50/60 text-gray-700 border-b">
                <tr>
                  <th className="py-2 px-3 text-center w-10">No</th>
                  <th className="py-2 px-3">Jenis Perbaikan</th>
                  <th className="py-2 px-3">Sparepart / Jasa</th>
                  <th className="py-2 px-3 text-right">Quantity</th>
                  <th className="py-2 px-3 text-right">Harga</th>
                  <th className="py-2 px-3 text-right">Total Harga</th>
                  <th className="py-2 px-3 text-center w-28">Status</th>
                  {(canEdit || canDelete) && <th className="py-2 px-3 text-center w-20">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((it, idx) => {
                  const lineTotal = Number(it.total_harga) || ((Number(it.quantity) || 0) * (Number(it.harga) || 0));
                  return (
                    <tr key={it.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="py-2 px-3 text-center text-gray-500">{idx + 1}</td>
                      <td className="py-2 px-3 font-semibold text-gray-900">{it.jenis_perbaikan}</td>
                      <td className="py-2 px-3 text-gray-800">{it.nama_sparepart}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{Number(it.quantity).toLocaleString('id-ID')}</td>
                      <td className="py-2 px-3 text-right tabular-nums">Rp {Number(it.harga).toLocaleString('id-ID')}</td>
                      <td className="py-2 px-3 text-right font-bold text-gray-900 tabular-nums">
                        Rp {lineTotal.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${it.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {it.status === 'approved' ? 'Disetujui' : 'Menunggu'}
                        </span>
                      </td>
                      {(canEdit || canDelete) && (
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {canEdit && (
                          <button
                            type="button"
                            onClick={() => onEditItem(it)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
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
                            title="Hapus"
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
              <tfoot className="bg-amber-50/40 border-t font-semibold">
                <tr>
                  <td colSpan={5} className="py-2 px-3 text-right text-gray-700 font-bold">Total Estimasi Pemeriksaan:</td>
                  <td className="py-2 px-3 text-right text-amber-900 font-bold tabular-nums">
                    Rp {totalEstimasi.toLocaleString('id-ID')}
                  </td>
                  <td colSpan={(canEdit || canDelete) ? 2 : 1}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Approval Status Message */}
      {items.length > 0 && (
        <div className="rounded-lg p-3 text-xs flex items-center justify-between gap-3 bg-white border border-amber-200">
          <div className="flex items-center gap-2">
            {isAllApproved ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            )}
            <span className="text-gray-700">
              {isAllApproved
                ? 'Semua item pemeriksaan telah disetujui. Perintah Kerja (SPK) di bawah ini telah aktif dan dapat diisi.'
                : 'Perintah Kerja (SPK) akan terbuka setelah perintah pemeriksaan ini disetujui.'}
            </span>
          </div>
          {!isAllApproved && canApprove && (
            <Button
              type="button"
              size="sm"
              onClick={onApprovePemeriksaan}
              disabled={isApproving}
              className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shrink-0"
            >
              {isApproving ? 'Menyetujui...' : 'Setujui Sekarang'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
});

/* ─────────────────────────────────────────────────────────────────
   Perintah Kerja (SPK) Section
───────────────────────────────────────────────────────────────── */
interface SPKSectionProps {
  selectedItem: PerbaikanAlatItem;
  onClose: () => void;
  form: SPKFormData;
  onChangeForm: (f: SPKFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  isEditing: boolean;
  onCancelEdit: () => void;
  isSaving: boolean;
  items: PerbaikanAlatItemDetail[];
  isLoadingItems: boolean;
  onEditItem: (item: PerbaikanAlatItemDetail) => void;
  onDeleteItem: (id: string) => void;
  deletingId: string | null;
  sparepartOptions: SparepartOption[];
  approvedPemeriksaanItems: PerbaikanAlatPemeriksaanItem[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPrint: boolean;
}

const SPKSection = memo(({
  selectedItem, onClose, form, onChangeForm, onSubmit,
  isEditing, onCancelEdit, isSaving, items, isLoadingItems,
  onEditItem, onDeleteItem, deletingId, sparepartOptions,
  approvedPemeriksaanItems,
  canCreate, canEdit, canDelete, canPrint
}: SPKSectionProps) => {
  const canSubmitForm = isEditing ? canEdit : canCreate;
  const totalBiaya = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.total_harga) || (Number(it.quantity) * Number(it.harga_satuan)) || 0), 0);
  }, [items]);

  const checkedKerusakan = useMemo(() => {
    return parseKerusakanList(selectedItem.checked_kerusakan);
  }, [selectedItem.checked_kerusakan]);

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
    .company { font-size: 16px; font-weight: bold; color: #1e3a8a; letter-spacing: 0.5px; }
    .divisi { font-size: 11px; color: #4b5563; }
    .title-box { text-align: center; margin-bottom: 16px; }
    .title { font-size: 15px; font-weight: bold; color: #111827; text-transform: uppercase; margin-bottom: 3px; letter-spacing: 0.5px; }
    .doc-num { font-size: 11px; color: #4b5563; }
    
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; font-size: 11px; }
    .info-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 3px; }
    .info-label { color: #64748b; font-weight: 500; }
    .info-val { font-weight: 600; color: #0f172a; }

    .kerusakan-box { margin-bottom: 14px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px 14px; font-size: 11px; }
    .kerusakan-title { font-weight: bold; color: #166534; margin-bottom: 6px; }
    .kerusakan-badges { display: flex; flex-wrap: wrap; gap: 8px; }
    .kerusakan-badge { background: #dcfce7; border: 1px solid #86efac; color: #14532d; padding: 3px 8px; border-radius: 4px; font-weight: 600; }

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
    <div>
      <div class="company">PT. REKA UTAMA PERSADA</div>
      <div class="divisi">Divisi Peralatan & Logistik</div>
    </div>
    <div style="text-align: right; font-size: 10px; color: #64748b;">
      <div>Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
      <div>Status: <strong>Disetujui (Approved)</strong></div>
    </div>
  </div>

  <div class="title-box">
    <div class="title">SURAT PERINTAH KERJA (SPK) PERBAIKAN ALAT</div>
    <div class="doc-num">No. Dokumen: <strong>${selectedItem.no_dokumen || '-'}</strong></div>
  </div>

  <div class="info-grid">
    <div class="info-row"><span class="info-label">Nomor Lambung:</span><span class="info-val">${selectedItem.no_lambung}</span></div>
    <div class="info-row"><span class="info-label">Tanggal Pengajuan:</span><span class="info-val">${formatDateDisplay(selectedItem.tanggal)}</span></div>
    <div class="info-row"><span class="info-label">Nama Alat:</span><span class="info-val">${selectedItem.nama_alat}</span></div>
    <div class="info-row"><span class="info-label">Lokasi:</span><span class="info-val">${selectedItem.lokasi || '-'}</span></div>
  </div>

  ${checkedKerusakan.length > 0 ? `
    <div class="kerusakan-box">
      <div class="kerusakan-title">Jenis Kerusakan yang Disetujui untuk Diperbaiki (Hasil Pemeriksaan):</div>
      <div class="kerusakan-badges">
        ${checkedKerusakan.map(k => `<span class="kerusakan-badge">✓ ${k}</span>`).join('')}
      </div>
    </div>
  ` : ''}

  ${selectedItem.kerusakan ? `
    <div style="font-size: 10.5px; margin-bottom: 14px; background: #fff; border: 1px solid #e2e8f0; padding: 6px 10px; border-radius: 4px;">
      <strong>Catatan Kerusakan:</strong> ${selectedItem.kerusakan}
    </div>
  ` : ''}

  <table>
    <thead>
      <tr>
        <th style="width: 25px;">No</th>
        <th>Jenis Perbaikan</th>
        <th>Sparepart / Jasa</th>
        <th style="width: 45px;">Qty</th>
        <th style="width: 45px;">Stock</th>
        <th style="width: 95px;">Harga Satuan</th>
        <th style="width: 110px;">Total Harga</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((it, idx) => {
      const lineTotal = Number(it.total_harga) || (Number(it.quantity) * Number(it.harga_satuan)) || 0;
      return `<tr>
          <td class="center">${idx + 1}</td>
          <td><strong>${it.jenis_perbaikan}</strong></td>
          <td>${it.nama_sparepart}</td>
          <td class="num">${Number(it.quantity).toLocaleString('id-ID')}</td>
          <td class="num">${Number(it.stock).toLocaleString('id-ID')}</td>
          <td class="num">Rp ${Number(it.harga_satuan).toLocaleString('id-ID')}</td>
          <td class="num" style="font-weight: 600;">Rp ${lineTotal.toLocaleString('id-ID')}</td>
        </tr>`;
    }).join('')}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="6" style="text-align: right; font-weight: bold; padding-right: 12px;">Total Keseluruhan Biaya:</td>
        <td class="num" style="font-weight: bold; color: #1e3a8a;">Rp ${totalBiaya.toLocaleString('id-ID')}</td>
      </tr>
    </tfoot>
  </table>

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
    Dokumen ini dicetak otomatis dari Sistem Informasi Peralatan PT. REKA UTAMA PERSADA
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
    <div className="mb-6 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/70 via-white to-slate-50 p-5 shadow-sm space-y-5 transition-all">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-600 text-white shadow-sm flex-shrink-0">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-gray-900">
                2. Form Perintah Kerja (SPK)
              </h3>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                {selectedItem.no_dokumen || 'Tanpa No. Dok'}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              Unit: <strong className="text-gray-900">{selectedItem.no_lambung}</strong> — {selectedItem.nama_alat} | Lokasi: {selectedItem.lokasi || '-'}
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

      {/* Jenis Kerusakan yang Diceklis di Pemeriksaan (Tidak Bisa Diedit) */}
      <div className="bg-white/95 border border-blue-200 rounded-lg p-3.5 shadow-2xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Jenis Kerusakan yang Diceklis di Pemeriksaan
            </span>
          </div>
          <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
            Terkunci (Tidak dapat diedit)
          </span>
        </div>

        {checkedKerusakan.length === 0 ? (
          <p className="text-xs text-amber-700 italic">
            Belum ada jenis kerusakan yang diceklis pada pemeriksaan.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 pt-0.5">
            {checkedKerusakan.map((jk, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-2xs cursor-default select-none"
              >
                <CheckSquare className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>{jk}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Select from Approved Pemeriksaan Items or Checked Kerusakan */}
      {canSubmitForm && (approvedPemeriksaanItems.length > 0 || checkedKerusakan.length > 0) && (
        <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 text-xs space-y-2">
          {approvedPemeriksaanItems.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-blue-900 mb-1 flex items-center gap-1">
                <Check className="h-3.5 w-3.5 text-blue-600" />
                <span>Salin dari Item Pemeriksaan Disetujui:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {approvedPemeriksaanItems.map(p => {
                  const matchedStock = sparepartOptions.find(o => o.namaSparepart.trim().toLowerCase() === p.nama_sparepart.trim().toLowerCase())?.stock ?? 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        onChangeForm({
                          jenis_perbaikan: p.jenis_perbaikan,
                          nama_sparepart: p.nama_sparepart,
                          quantity: String(p.quantity || 1),
                          stock: String(matchedStock),
                          harga_satuan: String(p.harga || 0),
                        });
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-blue-100/70 border border-blue-200 rounded text-blue-800 text-[11px] font-medium transition-colors shadow-2xs text-left"
                    >
                      {p.jenis_perbaikan} &rarr; <strong>{p.nama_sparepart}</strong> (Qty: {p.quantity})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {checkedKerusakan.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-blue-900 mb-1 flex items-center gap-1">
                <CheckSquare className="h-3.5 w-3.5 text-blue-600" />
                <span>Pilih Jenis Kerusakan untuk Perbaikan:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {checkedKerusakan.map((jk, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onChangeForm({ ...form, jenis_perbaikan: jk })}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-[11px] font-medium transition-colors shadow-2xs"
                  >
                    + {jk}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form Input Item Perintah Kerja */}
      {canSubmitForm && <form onSubmit={onSubmit} className="bg-white/80 backdrop-blur-sm border border-blue-100 p-4 rounded-lg shadow-xs space-y-3">
        <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
          <ClipboardList className="h-3.5 w-3.5 text-blue-600" />
          <span>{isEditing ? 'Edit Item Perintah Kerja' : 'Tambah Item Perintah Kerja'}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          {/* Jenis Perbaikan */}
          <div className="sm:col-span-3 space-y-1">
            <Label className="text-xs font-medium text-gray-700">Jenis Perbaikan <span className="text-red-500">*</span></Label>
            <Input
              type="text"
              placeholder="Contoh: Ganti Filter Oli"
              value={form.jenis_perbaikan}
              onChange={e => onChangeForm({ ...form, jenis_perbaikan: e.target.value })}
              className="h-9 text-xs"
              required
            />
          </div>

          {/* Sparepart / Jasa */}
          <div className="sm:col-span-3 space-y-1">
            <Label className="text-xs font-medium text-gray-700">Sparepart / Jasa <span className="text-red-500">*</span></Label>
            <SparepartCombobox
              value={form.nama_sparepart}
              onChange={val => onChangeForm({ ...form, nama_sparepart: val })}
              onSelectOption={opt => {
                onChangeForm({
                  ...form,
                  nama_sparepart: opt.namaSparepart,
                  stock: String(opt.stock),
                  harga_satuan: opt.harga > 0 ? String(opt.harga) : form.harga_satuan,
                });
              }}
              options={sparepartOptions}
              placeholder="Pilih sparepart dari stok atau manual..."
            />
          </div>

          {/* Quantity */}
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-xs font-medium text-gray-700">Quantity <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              min="0.01"
              step="any"
              placeholder="1"
              value={form.quantity}
              onChange={e => onChangeForm({ ...form, quantity: e.target.value })}
              className="h-9 text-xs text-right"
              required
            />
          </div>

          {/* Stock */}
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-xs font-medium text-gray-700">Stock <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              min="0"
              step="any"
              placeholder="0"
              value={form.stock}
              onChange={e => onChangeForm({ ...form, stock: e.target.value })}
              className="h-9 text-xs text-right"
              required
            />
          </div>

          {/* Harga Satuan */}
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-xs font-medium text-gray-700">Harga Satuan (Rp) <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              min="0"
              step="any"
              placeholder="0"
              value={form.harga_satuan}
              onChange={e => onChangeForm({ ...form, harga_satuan: e.target.value })}
              className="h-9 text-xs text-right"
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            Total Harga Baris: <strong className="text-gray-900 font-semibold">Rp {((Number(form.quantity) || 0) * (Number(form.harga_satuan) || 0)).toLocaleString('id-ID')}</strong>
          </div>
          <div className="flex items-center gap-2">
            {isEditing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancelEdit}
                className="h-8 text-xs text-gray-600"
              >
                Batal
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={isSaving}
              className="h-8 px-4 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              {isSaving ? 'Menyimpan...' : isEditing ? 'Perbarui Item' : '+ Simpan Item'}
            </Button>
          </div>
        </div>
      </form>}

      {/* Tabel Item Perintah Kerja */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
            Daftar Item Perintah Kerja (SPK) ({items.length})
          </h4>
        </div>

        {isLoadingItems ? (
          <div className="p-8 text-center text-xs text-gray-500">Memuat data SPK...</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-xs bg-white rounded-lg border border-dashed border-blue-200 text-gray-500">
            Belum ada item perintah kerja. Silakan isi form di atas dan klik simpan.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-700 border-b">
                <tr>
                  <th className="py-2 px-3 text-center w-10">No</th>
                  <th className="py-2 px-3">Jenis Perbaikan</th>
                  <th className="py-2 px-3">Sparepart / Jasa</th>
                  <th className="py-2 px-3 text-right">Quantity</th>
                  <th className="py-2 px-3 text-right">Stock</th>
                  <th className="py-2 px-3 text-right">Harga Satuan</th>
                  <th className="py-2 px-3 text-right">Total Harga</th>
                  {(canEdit || canDelete) && <th className="py-2 px-3 text-center w-20">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((it, idx) => {
                  const lineTotal = Number(it.total_harga) || ((Number(it.quantity) || 0) * (Number(it.harga_satuan) || 0));
                  return (
                    <tr key={it.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-2 px-3 text-center text-gray-500">{idx + 1}</td>
                      <td className="py-2 px-3 font-semibold text-gray-900">{it.jenis_perbaikan}</td>
                      <td className="py-2 px-3 text-gray-800">{it.nama_sparepart}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{Number(it.quantity).toLocaleString('id-ID')}</td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        <span className={`px-1.5 py-0.5 rounded text-[11px] ${Number(it.stock) > 0 ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-500'}`}>
                          {Number(it.stock).toLocaleString('id-ID')}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">Rp {Number(it.harga_satuan).toLocaleString('id-ID')}</td>
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
                            title="Edit"
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
                            title="Hapus"
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
                  <td colSpan={6} className="py-2.5 px-3 text-right text-gray-700 font-bold">Total Keseluruhan Biaya SPK:</td>
                  <td className="py-2.5 px-3 text-right text-blue-900 font-bold tabular-nums">
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
   Main Page: Permohonan Perbaikan Alat
───────────────────────────────────────────────────────────────── */
export default function PerbaikanAlat() {
  /* ── Data Hooks ──────────────────────────────────────── */
  const { data: items = [], isLoading } = usePerbaikanAlat();
  const addItem = useAddPerbaikanAlat();
  const updateItem = useUpdatePerbaikanAlat();
  const deleteItem = useDeletePerbaikanAlat();

  const { data: rawSpareparts = [] } = useSparepart();
  const { data: alatBeratList = [] } = useAlatBerat();
  const { data: alatPendukungList = [] } = useAlatPendukung();

  const {
    can_create: canCreate, can_edit: canEdit, can_delete: canDelete,
    can_export_excel: canExportExcel, can_print: canPrint, can_approve: canApprove,
  } = usePagePermission('permohonanPerbaikanAlat');
  const {
    can_view: canViewPemeriksaan,
    can_create: canCreatePemeriksaan,
    can_edit: canEditPemeriksaan,
    can_delete: canDeletePemeriksaan,
    can_print: canPrintPemeriksaan,
    can_approve: canApprovePemeriksaan,
  } = usePagePermission('pemeriksaanPerbaikanAlat');
  const {
    can_view: canViewSpk,
    can_create: canCreateSpk,
    can_edit: canEditSpk,
    can_delete: canDeleteSpk,
    can_print: canPrintSpk,
  } = usePagePermission('spkPerbaikanAlat');
  const canOpenProcess = canViewPemeriksaan || canViewSpk;
  const canShowActions = canEdit || canDelete || canApprove || canOpenProcess;

  /* ── Sparepart stocks calculated from transactions/items ── */
  const sparepartOptions = useMemo<SparepartOption[]>(() => {
    const map = new Map<string, SparepartOption>();
    rawSpareparts.forEach(sp => {
      const name = (sp.namaSparepart || '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          namaSparepart: name,
          stock: 0,
          harga: sp.harga || 0,
          satuan: sp.satuan || 'pcs',
        });
      }
      const entry = map.get(key)!;
      if (sp.jenis === 'Pemakaian') {
        entry.stock -= (Number(sp.jumlah) || 0);
      } else {
        entry.stock += (Number(sp.jumlah) || 0);
      }
      if (sp.harga > 0) entry.harga = sp.harga;
      if (sp.satuan) entry.satuan = sp.satuan;
    });

    return Array.from(map.values()).map(s => ({
      ...s,
      stock: Math.max(0, s.stock),
    })).sort((a, b) => a.namaSparepart.localeCompare(b.namaSparepart));
  }, [rawSpareparts]);

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

  const [selectedItem, setSelectedItem] = useState<PerbaikanAlatItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<PerbaikanAlatItem | null>(null);
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

  // ── Selected Permohonan for Process (Pemeriksaan & SPK) ──
  const [activeProcessItem, setActiveProcessItem] = useState<PerbaikanAlatItem | null>(null);

  // Keep activeProcessItem in sync when items update
  useEffect(() => {
    if (activeProcessItem) {
      const refreshed = items.find(i => i.id === activeProcessItem.id);
      if (refreshed) {
        setActiveProcessItem(refreshed);
      }
    }
  }, [items]);

  // Pemeriksaan State & Hooks
  const [pemeriksaanForm, setPemeriksaanForm] = useState<PemeriksaanFormData>(emptyPemeriksaanForm());
  const [editingPemeriksaanId, setEditingPemeriksaanId] = useState<string | null>(null);
  const [deletingPemeriksaanId, setDeletingPemeriksaanId] = useState<string | null>(null);

  const { data: pemeriksaanItems = [], isLoading: isLoadingPemeriksaan } = usePerbaikanAlatPemeriksaan(activeProcessItem?.id);
  const addPemeriksaanItem = useAddPerbaikanAlatPemeriksaan();
  const updatePemeriksaanItem = useUpdatePerbaikanAlatPemeriksaan();
  const deletePemeriksaanItem = useDeletePerbaikanAlatPemeriksaan();

  const isPemeriksaanApproved = useMemo(() => {
    if (!pemeriksaanItems.length) return false;
    return pemeriksaanItems.every(it => it.status === 'approved');
  }, [pemeriksaanItems]);

  const approvedPemeriksaanItems = useMemo(() => {
    return pemeriksaanItems.filter(it => it.status === 'approved');
  }, [pemeriksaanItems]);

  // SPK State & Hooks
  const [spkForm, setSpkForm] = useState<SPKFormData>(emptySPKForm());
  const [editingSPKItemId, setEditingSPKItemId] = useState<string | null>(null);
  const [deletingSPKId, setDeletingSPKId] = useState<string | null>(null);

  const { data: spkItems = [], isLoading: isLoadingSPKItems } = usePerbaikanAlatItems(activeProcessItem?.id);
  const addSPKItem = useAddPerbaikanAlatItem();
  const updateSPKItem = useUpdatePerbaikanAlatItem();
  const deleteSPKItem = useDeletePerbaikanAlatItem();

  /* ── Click-outside close dropdowns ───────────────────── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (createFormRef.current && !createFormRef.current.contains(e.target as Node)) {
        setIsNamaOpen(false);
        setIsLambungOpen(false);
      }
      if (editFormRef.current && !editFormRef.current.contains(e.target as Node)) {
        setIsEditNamaOpen(false);
        setIsEditLambungOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Autocomplete Filter ──────────────────────────────── */
  const filteredByName = useMemo(() => {
    if (!formData.nama_alat) return allAssets;
    const q = formData.nama_alat.toLowerCase();
    return allAssets.filter(a => a.namaAlat.toLowerCase().includes(q) || a.noLambung.toLowerCase().includes(q));
  }, [formData.nama_alat, allAssets]);

  const filteredByLambung = useMemo(() => {
    if (!formData.no_lambung) return allAssets;
    const q = formData.no_lambung.toLowerCase();
    return allAssets.filter(a => a.noLambung.toLowerCase().includes(q) || a.namaAlat.toLowerCase().includes(q));
  }, [formData.no_lambung, allAssets]);

  const filteredEditByName = useMemo(() => {
    if (!editFormData.nama_alat) return allAssets;
    const q = editFormData.nama_alat.toLowerCase();
    return allAssets.filter(a => a.namaAlat.toLowerCase().includes(q) || a.noLambung.toLowerCase().includes(q));
  }, [editFormData.nama_alat, allAssets]);

  const filteredEditByLambung = useMemo(() => {
    if (!editFormData.no_lambung) return allAssets;
    const q = editFormData.no_lambung.toLowerCase();
    return allAssets.filter(a => a.noLambung.toLowerCase().includes(q) || a.namaAlat.toLowerCase().includes(q));
  }, [editFormData.no_lambung, allAssets]);

  /* ── Filter Table Data ───────────────────────────────── */
  const filteredData = useMemo(() => {
    return items.filter(item => {
      const matchSearch =
        item.nama_alat.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.no_lambung.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.no_dokumen.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.lokasi && item.lokasi.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.kerusakan && item.kerusakan.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (Array.isArray(item.jenis_kerusakan) && item.jenis_kerusakan.some(k => k.toLowerCase().includes(searchTerm.toLowerCase())));

      let matchDate = true;
      if (tableFilterFrom) matchDate = matchDate && item.tanggal >= tableFilterFrom;
      if (tableFilterTo) matchDate = matchDate && item.tanggal <= tableFilterTo;

      return matchSearch && matchDate;
    });
  }, [items, searchTerm, tableFilterFrom, tableFilterTo]);

  const paginatedData = useMemo(() => {
    return paginateData(filteredData, currentPage, pageSize);
  }, [filteredData, currentPage, pageSize]);

  /* ── Handlers: Main Permohonan CRUD ──────────────────── */
  const handleCreate = async () => {
    if (!formData.tanggal || !formData.no_dokumen || !formData.no_lambung || !formData.nama_alat) {
      toast({ title: 'Validasi Gagal', description: 'Tanggal, No. Dokumen, No. Lambung, dan Nama Alat harus diisi', variant: 'destructive' });
      return;
    }
    await addItem.mutateAsync({
      tanggal: formData.tanggal,
      no_dokumen: formData.no_dokumen,
      no_lambung: formData.no_lambung,
      nama_alat: formData.nama_alat,
      lokasi: formData.lokasi || null,
      kerusakan: formData.kerusakan || null,
      jenis_kerusakan: formData.jenis_kerusakan || [],
      checked_kerusakan: [],
      status: 'pending',
      approved_by: null,
      approved_at: null,
    });
    setShowCreateDialog(false);
    setFormData(emptyForm());
  };

  const handleEdit = (item: PerbaikanAlatItem) => {
    setSelectedItem(item);
    setEditFormData({
      tanggal: item.tanggal,
      no_dokumen: item.no_dokumen,
      no_lambung: item.no_lambung,
      nama_alat: item.nama_alat,
      lokasi: item.lokasi || '',
      kerusakan: item.kerusakan || '',
      jenis_kerusakan: parseKerusakanList(item.jenis_kerusakan),
    });
    setShowEditDialog(true);
  };

  const handleUpdate = async () => {
    if (!selectedItem) return;
    if (!editFormData.tanggal || !editFormData.no_dokumen || !editFormData.no_lambung || !editFormData.nama_alat) {
      toast({ title: 'Validasi Gagal', description: 'Tanggal, No. Dokumen, No. Lambung, dan Nama Alat harus diisi', variant: 'destructive' });
      return;
    }
    await updateItem.mutateAsync({
      id: selectedItem.id,
      tanggal: editFormData.tanggal,
      no_dokumen: editFormData.no_dokumen,
      no_lambung: editFormData.no_lambung,
      nama_alat: editFormData.nama_alat,
      lokasi: editFormData.lokasi || null,
      kerusakan: editFormData.kerusakan || null,
      jenis_kerusakan: editFormData.jenis_kerusakan || [],
    });
    setShowEditDialog(false);
    setSelectedItem(null);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(deletingItem.id);
    try {
      await deleteItem.mutateAsync(deletingItem.id);
      setShowDeleteDialog(false);
      if (activeProcessItem?.id === deletingItem.id) {
        setActiveProcessItem(null);
      }
    } finally {
      setIsDeleting(null);
      setDeletingItem(null);
    }
  };

  const handleApprove = async (status: 'approved' | 'rejected') => {
    if (!selectedItem) return;
    await updateItem.mutateAsync({
      id: selectedItem.id,
      status,
      approved_by: status === 'approved' ? 'Administrator' : null,
      approved_at: status === 'approved' ? format(new Date(), 'yyyy-MM-dd HH:mm:ss') : null,
    });
    if (status === 'approved' && canOpenProcess) {
      setActiveProcessItem({ ...selectedItem, status: 'approved' });
      setPemeriksaanForm(emptyPemeriksaanForm());
      setSpkForm(emptySPKForm());
    }
    setShowApproveDialog(false);
    setShowRejectDialog(false);
    setSelectedItem(null);
  };

  /* ── Toggle Checked Kerusakan in Pemeriksaan ──────────── */
  const handleToggleCheckedKerusakan = async (jk: string) => {
    if (!activeProcessItem || !canEditPemeriksaan) return;
    const current = parseKerusakanList(activeProcessItem.checked_kerusakan);
    const updated = current.includes(jk)
      ? current.filter(x => x !== jk)
      : [...current, jk];

    setActiveProcessItem({
      ...activeProcessItem,
      checked_kerusakan: updated,
    });

    try {
      await updateItem.mutateAsync({
        id: activeProcessItem.id,
        checked_kerusakan: updated,
      });
    } catch (e) {
      // rollback if failed
      console.error('Failed updating checked_kerusakan:', e);
    }
  };

  /* ── Handlers: Perintah Pemeriksaan ──────────────────── */
  const handleSubmitPemeriksaan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProcessItem) return;
    if (editingPemeriksaanId ? !canEditPemeriksaan : !canCreatePemeriksaan) return;

    if (!pemeriksaanForm.jenis_perbaikan.trim()) {
      toast({ title: 'Peringatan', description: 'Jenis perbaikan harus diisi', variant: 'destructive' });
      return;
    }
    if (!pemeriksaanForm.nama_sparepart.trim()) {
      toast({ title: 'Peringatan', description: 'Sparepart / jasa harus diisi', variant: 'destructive' });
      return;
    }

    try {
      if (editingPemeriksaanId) {
        await updatePemeriksaanItem.mutateAsync({
          id: editingPemeriksaanId,
          jenis_perbaikan: pemeriksaanForm.jenis_perbaikan.trim(),
          nama_sparepart: pemeriksaanForm.nama_sparepart.trim(),
          quantity: Number(pemeriksaanForm.quantity) || 1,
          harga: Number(pemeriksaanForm.harga) || 0,
        });
        setEditingPemeriksaanId(null);
      } else {
        await addPemeriksaanItem.mutateAsync({
          perbaikan_alat_id: activeProcessItem.id,
          jenis_perbaikan: pemeriksaanForm.jenis_perbaikan.trim(),
          nama_sparepart: pemeriksaanForm.nama_sparepart.trim(),
          quantity: Number(pemeriksaanForm.quantity) || 1,
          harga: Number(pemeriksaanForm.harga) || 0,
          status: 'pending',
        });
      }
      setPemeriksaanForm(emptyPemeriksaanForm());
    } catch (err) {
      // Error handled in hook
    }
  };

  const handleEditPemeriksaanItem = (it: PerbaikanAlatPemeriksaanItem) => {
    setEditingPemeriksaanId(it.id);
    setPemeriksaanForm({
      jenis_perbaikan: it.jenis_perbaikan,
      nama_sparepart: it.nama_sparepart,
      quantity: String(it.quantity),
      harga: String(it.harga),
    });
  };

  const handleDeletePemeriksaanItem = async (id: string) => {
    if (!canDeletePemeriksaan) return;
    if (confirm('Hapus item perintah pemeriksaan ini?')) {
      setDeletingPemeriksaanId(id);
      try {
        await deletePemeriksaanItem.mutateAsync(id);
      } finally {
        setDeletingPemeriksaanId(null);
      }
    }
  };

  const [isApprovingPemeriksaan, setIsApprovingPemeriksaan] = useState(false);
  const handleApproveAllPemeriksaan = async () => {
    if (!activeProcessItem || !pemeriksaanItems.length || !canApprovePemeriksaan) return;
    setIsApprovingPemeriksaan(true);
    try {
      for (const it of pemeriksaanItems) {
        if (it.status !== 'approved') {
          await updatePemeriksaanItem.mutateAsync({
            id: it.id,
            status: 'approved',
          });
        }
      }
      toast({ title: 'Berhasil', description: 'Perintah pemeriksaan telah disetujui. Form SPK siap diisi!' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Gagal menyetujui pemeriksaan', variant: 'destructive' });
    } finally {
      setIsApprovingPemeriksaan(false);
    }
  };

  /* ── Handlers: Perintah Kerja (SPK) ──────────────────── */
  const handleSubmitSPK = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProcessItem) return;
    if (editingSPKItemId ? !canEditSpk : !canCreateSpk) return;

    if (!spkForm.jenis_perbaikan.trim()) {
      toast({ title: 'Peringatan', description: 'Jenis perbaikan harus diisi', variant: 'destructive' });
      return;
    }
    if (!spkForm.nama_sparepart.trim()) {
      toast({ title: 'Peringatan', description: 'Sparepart / jasa harus diisi', variant: 'destructive' });
      return;
    }

    try {
      if (editingSPKItemId) {
        await updateSPKItem.mutateAsync({
          id: editingSPKItemId,
          jenis_perbaikan: spkForm.jenis_perbaikan.trim(),
          nama_sparepart: spkForm.nama_sparepart.trim(),
          quantity: Number(spkForm.quantity) || 1,
          stock: Number(spkForm.stock) || 0,
          harga_satuan: Number(spkForm.harga_satuan) || 0,
        });
        setEditingSPKItemId(null);
      } else {
        await addSPKItem.mutateAsync({
          perbaikan_alat_id: activeProcessItem.id,
          jenis_perbaikan: spkForm.jenis_perbaikan.trim(),
          nama_sparepart: spkForm.nama_sparepart.trim(),
          quantity: Number(spkForm.quantity) || 1,
          stock: Number(spkForm.stock) || 0,
          harga_satuan: Number(spkForm.harga_satuan) || 0,
        });
      }
      setSpkForm(emptySPKForm());
    } catch (err) {
      // Error handled in hook
    }
  };

  const handleEditSPKItem = (it: PerbaikanAlatItemDetail) => {
    setEditingSPKItemId(it.id);
    setSpkForm({
      jenis_perbaikan: it.jenis_perbaikan,
      nama_sparepart: it.nama_sparepart,
      quantity: String(it.quantity),
      stock: String(it.stock),
      harga_satuan: String(it.harga_satuan),
    });
  };

  const handleDeleteSPKItem = async (id: string) => {
    if (!canDeleteSpk) return;
    if (confirm('Hapus item perintah kerja ini?')) {
      setDeletingSPKId(id);
      try {
        await deleteSPKItem.mutateAsync(id);
      } finally {
        setDeletingSPKId(null);
      }
    }
  };

  /* ── Export / Print Helpers ──────────────────────────── */
  const getFilterDataForExport = () => {
    if (dialogMode === 'all') return filteredData;
    return filteredData.filter(i => (!dateFrom || i.tanggal >= dateFrom) && (!dateTo || i.tanggal <= dateTo));
  };

  const doExportExcel = () => {
    const data = getFilterDataForExport();
    const rows = data.map((item, idx) => ({
      No: idx + 1,
      Tanggal: item.tanggal,
      'No. Dokumen': item.no_dokumen,
      'No. Lambung': item.no_lambung,
      'Nama Alat': item.nama_alat,
      Lokasi: item.lokasi || '-',
      'Jenis Kerusakan': parseKerusakanList(item.jenis_kerusakan).join(', ') || '-',
      'Deskripsi Kerusakan': item.kerusakan || '-',
      Status: item.status === 'approved' ? 'Disetujui' : item.status === 'rejected' ? 'Ditolak' : 'Menunggu',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Perbaikan Alat');
    XLSX.writeFile(wb, `Permohonan_Perbaikan_Alat_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    setExportPrintDialog(null);
  };

  const doPrint = () => {
    const data = getFilterDataForExport();
    const win = window.open('', '', 'width=900,height=600');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Cetak Permohonan Perbaikan Alat</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; color: #333; margin: 15px; }
  h2 { text-align: center; margin-bottom: 4px; font-size: 15px; }
  .meta { text-align: center; font-size: 10px; color: #666; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #ccc; padding: 5px 7px; text-align: left; }
  th { background-color: #f3f4f6; font-size: 10.5px; }
</style>
</head><body>
<h2>Daftar Permohonan Perbaikan Alat</h2>
<div class="meta">Dicetak pada: ${new Date().toLocaleString('id-ID')} | Total: ${data.length} Data</div>
<table>
<thead><tr>
  <th>No</th><th>Tanggal</th><th>No. Dokumen</th><th>No. Lambung</th><th>Nama Alat</th><th>Lokasi</th><th>Jenis Kerusakan</th><th>Status</th>
</tr></thead><tbody>
${data.map((item, idx) => `<tr>
  <td style="text-align:center;">${idx + 1}</td>
  <td>${formatDateDisplay(item.tanggal)}</td>
  <td>${item.no_dokumen}</td>
  <td>${item.no_lambung}</td>
  <td>${item.nama_alat}</td>
  <td>${item.lokasi || '-'}</td>
  <td>${parseKerusakanList(item.jenis_kerusakan).join(', ') || item.kerusakan || '-'}</td>
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
    <div className="container mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Permohonan Perbaikan Alat</h1>
          <p className="text-xs text-gray-500 mt-1">
            Manajemen pengajuan perbaikan alat, perintah pemeriksaan, dan surat perintah kerja (SPK).
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreateDialog(true)} className="w-full sm:w-auto flex items-center justify-center bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> Buat Permohonan Baru
          </Button>
        )}
      </div>

      {/* Card */}
      <Card className="shadow-xs border-gray-200">
        <CardHeader className="pb-4">
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
                <Input placeholder="Cari dokumen, no. lambung, alat, kerusakan…" className="pl-10 text-xs sm:text-sm"
                  value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
              </div>
              <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5 text-xs sm:text-sm h-10">
                <Calendar size={16} className="text-gray-400 flex-shrink-0" />
                <input type="date" value={tableFilterFrom}
                  onChange={e => { setTableFilterFrom(e.target.value); setCurrentPage(1); }}
                  className="border-0 bg-transparent focus:ring-0 text-xs sm:text-sm p-0 w-[120px]" />
                <span className="text-gray-400">—</span>
                <input type="date" value={tableFilterTo}
                  onChange={e => { setTableFilterTo(e.target.value); setCurrentPage(1); }}
                  className="border-0 bg-transparent focus:ring-0 text-xs sm:text-sm p-0 w-[120px]" />
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

        <CardContent className="space-y-6">
          {/* Active Process Panels (Pemeriksaan & SPK) */}
          {activeProcessItem && (
            <div className="space-y-4">
              {canViewPemeriksaan && (
              <PemeriksaanSection
                selectedItem={activeProcessItem}
                onClose={() => setActiveProcessItem(null)}
                form={pemeriksaanForm}
                onChangeForm={setPemeriksaanForm}
                onSubmit={handleSubmitPemeriksaan}
                isEditing={!!editingPemeriksaanId}
                onCancelEdit={() => { setEditingPemeriksaanId(null); setPemeriksaanForm(emptyPemeriksaanForm()); }}
                isSaving={addPemeriksaanItem.isPending || updatePemeriksaanItem.isPending}
                items={pemeriksaanItems}
                isLoadingItems={isLoadingPemeriksaan}
                onEditItem={handleEditPemeriksaanItem}
                onDeleteItem={handleDeletePemeriksaanItem}
                deletingId={deletingPemeriksaanId}
                sparepartOptions={sparepartOptions}
                onApprovePemeriksaan={handleApproveAllPemeriksaan}
                isApproving={isApprovingPemeriksaan}
                canApprove={canApprovePemeriksaan}
                canCreate={canCreatePemeriksaan}
                canEdit={canEditPemeriksaan}
                canDelete={canDeletePemeriksaan}
                canPrint={canPrintPemeriksaan}
                onToggleCheckedKerusakan={handleToggleCheckedKerusakan}
              />
              )}

              {isPemeriksaanApproved && canViewSpk && (
                <SPKSection
                  selectedItem={activeProcessItem}
                  onClose={() => setActiveProcessItem(null)}
                  form={spkForm}
                  onChangeForm={setSpkForm}
                  onSubmit={handleSubmitSPK}
                  isEditing={!!editingSPKItemId}
                  onCancelEdit={() => { setEditingSPKItemId(null); setSpkForm(emptySPKForm()); }}
                  isSaving={addSPKItem.isPending || updateSPKItem.isPending}
                  items={spkItems}
                  isLoadingItems={isLoadingSPKItems}
                  onEditItem={handleEditSPKItem}
                  onDeleteItem={handleDeleteSPKItem}
                  deletingId={deletingSPKId}
                  sparepartOptions={sparepartOptions}
                  approvedPemeriksaanItems={approvedPemeriksaanItems}
                  canCreate={canCreateSpk}
                  canEdit={canEditSpk}
                  canDelete={canDeleteSpk}
                  canPrint={canPrintSpk}
                />
              )}
            </div>
          )}

          {/* Main Permohonan Table */}
          <TableScrollWrapper className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/70">
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>No. Dokumen</TableHead>
                  <TableHead>No. Lambung</TableHead>
                  <TableHead>Nama Alat</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Kerusakan / Keluhan</TableHead>
                  <TableHead className="text-center w-28">Status</TableHead>
                  {canShowActions && <TableHead className="text-center w-40">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={canShowActions ? 9 : 8} className="h-32 text-center text-gray-500">
                      Memuat data permohonan...
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canShowActions ? 9 : 8} className="h-32 text-center text-gray-500">
                      Tidak ada data permohonan perbaikan alat
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item, idx) => (
                    <TableRow key={item.id} className={`hover:bg-blue-50/30 transition-colors ${activeProcessItem?.id === item.id ? 'bg-blue-50/50 font-medium' : ''}`}>
                      <td className="py-2.5 px-3 text-center text-xs text-gray-500">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatDateDisplay(item.tanggal)}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-gray-900 whitespace-nowrap">
                        {item.no_dokumen}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-blue-700 whitespace-nowrap">
                        {item.no_lambung}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-gray-900">
                        {item.nama_alat}
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">
                        {item.lokasi || '-'}
                      </TableCell>
                      <TableCell className="text-xs text-gray-700 max-w-xs">
                        {(() => {
                          const list = parseKerusakanList(item.jenis_kerusakan);
                          return (
                            <div className="space-y-1">
                              {list.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {list.slice(0, 2).map((jk, i) => (
                                    <span key={i} className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-medium">
                                      {jk}
                                    </span>
                                  ))}
                                  {list.length > 2 && (
                                    <span className="text-[10px] text-gray-500 font-medium">
                                      +{list.length - 2} lainnya
                                    </span>
                                  )}
                                </div>
                              )}
                              <div className="text-gray-600 truncate" title={item.kerusakan || ''}>
                                {item.kerusakan || (list.length === 0 ? '-' : '')}
                              </div>
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={item.status} />
                      </TableCell>
                      {canShowActions && (
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Approve / Reject buttons for pending permohonan */}
                            {item.status === 'pending' && canApprove && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:bg-green-50 p-1 h-8 w-8"
                                  title="Setujui Permohonan"
                                  onClick={() => { setSelectedItem(item); setShowApproveDialog(true); }}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:bg-red-50 p-1 h-8 w-8"
                                  title="Tolak Permohonan"
                                  onClick={() => { setSelectedItem(item); setShowRejectDialog(true); }}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}

                            {/* Proses Pemeriksaan & SPK button for approved permohonan */}
                            {item.status === 'approved' && canOpenProcess && (
                              <Button
                                variant="outline"
                                size="sm"
                                className={`h-7 px-2 text-xs flex items-center gap-1 border-blue-200 shadow-2xs ${activeProcessItem?.id === item.id ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'}`}
                                onClick={() => {
                                  if (activeProcessItem?.id === item.id) {
                                    setActiveProcessItem(null);
                                  } else {
                                    setActiveProcessItem(item);
                                    setPemeriksaanForm(emptyPemeriksaanForm());
                                    setSpkForm(emptySPKForm());
                                  }
                                }}
                                title="Buka Perintah Pemeriksaan & SPK"
                              >
                                <Wrench className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Pemeriksaan / SPK</span>
                              </Button>
                            )}

                            {/* Edit button */}
                            {canEdit && (
                              <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50 p-1 h-8 w-8" title="Edit"
                                onClick={() => handleEdit(item)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}

                            {/* Delete button */}
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
          <DialogHeader><DialogTitle>Buat Permohonan Perbaikan Alat</DialogTitle></DialogHeader>
          <FormBody
            data={formData} onChange={setFormData}
            filteredName={filteredByName} filteredLambung={filteredByLambung}
            isNameOpen={isNamaOpen} setNameOpen={setIsNamaOpen}
            isLambungOpen={isLambungOpen} setLambungOpen={setIsLambungOpen}
            formRef={createFormRef}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); setFormData(emptyForm()); }}>Batal</Button>
            <Button onClick={handleCreate} disabled={addItem.isPending} className="bg-blue-600 hover:bg-blue-700">
              {addItem.isPending ? 'Menyimpan…' : 'Simpan Permohonan'}
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
          <DialogHeader><DialogTitle>Edit Permohonan Perbaikan Alat</DialogTitle></DialogHeader>
          <FormBody
            data={editFormData} onChange={setEditFormData}
            filteredName={filteredEditByName} filteredLambung={filteredEditByLambung}
            isNameOpen={isEditNamaOpen} setNameOpen={setIsEditNamaOpen}
            isLambungOpen={isEditLambungOpen} setLambungOpen={setIsEditLambungOpen}
            formRef={editFormRef}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); setSelectedItem(null); }}>Batal</Button>
            <Button onClick={handleUpdate} disabled={updateItem.isPending} className="bg-blue-600 hover:bg-blue-700">
              {updateItem.isPending ? 'Menyimpan…' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── APPROVE DIALOG ────────────────────────────── */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Konfirmasi Persetujuan Permohonan</DialogTitle></DialogHeader>
          <div className="py-4 text-sm">
            <p>Apakah Anda yakin ingin menyetujui permohonan perbaikan alat ini?</p>
            <p className="font-medium mt-2 text-gray-900">{selectedItem?.no_lambung} — {selectedItem?.nama_alat}</p>
            <p className="text-xs text-gray-500 mt-1">Setelah disetujui, Perintah Pemeriksaan dan SPK dapat diproses.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>Batal</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove('approved')}>Setujui</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── REJECT DIALOG ─────────────────────────────── */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Konfirmasi Penolakan Permohonan</DialogTitle></DialogHeader>
          <div className="py-4 text-sm">
            <p>Apakah Anda yakin ingin menolak permohonan ini?</p>
            <p className="font-medium mt-2 text-gray-900">{selectedItem?.no_lambung} — {selectedItem?.nama_alat}</p>
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
          <div className="py-4 text-sm">
            <p>Apakah Anda yakin ingin menghapus data permohonan ini?</p>
            <p className="font-medium mt-2 text-red-600">{deletingItem?.no_dokumen} ({deletingItem?.no_lambung} — {deletingItem?.nama_alat})</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={!!isDeleting}>
              {isDeleting ? 'Menghapus…' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── EXPORT / PRINT DIALOG ─────────────────────── */}
      <Dialog open={exportPrintDialog !== null} onOpenChange={val => { if (!val) setExportPrintDialog(null); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {exportPrintDialog === 'export' ? 'Ekspor ke Excel' : 'Cetak Dokumen'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Cakupan Data</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDialogMode('all')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${dialogMode === 'all'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                >
                  <span>Semua Data ({filteredData.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDialogMode('range')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${dialogMode === 'range'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                >
                  <Calendar size={15} />
                  <span>Rentang Tanggal</span>
                </button>
              </div>
            </div>

            {dialogMode === 'range' && (
              <div className="space-y-3 pt-1 border-t">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Dari Tanggal</label>
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Sampai Tanggal</label>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setExportPrintDialog(null)}>Batal</Button>
            <Button onClick={handleDialogConfirm} className="bg-blue-600 hover:bg-blue-700">
              {exportPrintDialog === 'export' ? (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Unduh Excel
                </>
              ) : (
                <>
                  <Printer className="mr-2 h-4 w-4" />
                  Buka Jendela Cetak
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
