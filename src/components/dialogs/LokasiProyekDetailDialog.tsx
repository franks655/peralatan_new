import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAlatBerat } from '@/hooks/useAlatBerat';
import { useAlatPendukung } from '@/hooks/useAlatPendukung';
import { useKendaraan } from '@/hooks/useKendaraan';
import { useSewaAlatInternal } from '@/hooks/useSewaAlatInternal';
import { useSewaAlatEksternal } from '@/hooks/useSewaAlatEksternal';
import { useBBMTransactions } from '@/hooks/useBBMTransactions';
import { useAllOliTransactions } from '@/hooks/useAllOliTransactions';
import { usePerbaikan } from '@/hooks/usePerbaikan';
import type { LokasiProyek } from '@/types';
import { formatDateDisplay } from '@/utils/dateUtils';
import { MapPin, X, Truck, Fuel, Droplets, Wrench, HandCoins, DollarSign, Printer } from 'lucide-react';

interface LokasiProyekDetailDialogProps {
  proyek: LokasiProyek | null;
  open: boolean;
  onClose: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

/** Case-insensitive substring match: does the record's lokasi field match the project? */
function matchLokasi(recordLokasi: string | undefined | null, proyek: LokasiProyek): boolean {
  if (!recordLokasi) return false;
  const loc = recordLokasi.trim().toLowerCase();
  const nama = (proyek.namaProyek || '').trim().toLowerCase();
  const lokasiP = (proyek.lokasi || '').trim().toLowerCase();
  return Boolean(
    (nama && loc.includes(nama)) ||
    (nama && nama.includes(loc)) ||
    (lokasiP && loc.includes(lokasiP)) ||
    (lokasiP && lokasiP.includes(loc))
  );
}

type TabKey = 'alat' | 'sewa' | 'bbm' | 'oli' | 'perbaikan';

export function LokasiProyekDetailDialog({ proyek, open, onClose }: LokasiProyekDetailDialogProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('alat');

  const { data: alatBeratList = [] } = useAlatBerat();
  const { data: alatPendukungList = [] } = useAlatPendukung();
  const { data: kendaraanList = [] } = useKendaraan();
  const { data: sewaInternal = [] } = useSewaAlatInternal();
  const { data: sewaEksternal = [] } = useSewaAlatEksternal();
  const { data: bbmTrans = [] } = useBBMTransactions();
  const { data: oliTrans = [] } = useAllOliTransactions();
  const { data: perbaikanList = [] } = usePerbaikan();

  const data = useMemo(() => {
    if (!proyek) return null;

    const alat = {
      berat: alatBeratList.filter((a) => matchLokasi(a.lokasi, proyek)),
      pendukung: alatPendukungList.filter((a) => matchLokasi(a.lokasi, proyek)),
      kendaraan: kendaraanList.filter((a) => matchLokasi(a.lokasi, proyek)),
    };

    const sewa = {
      internal: sewaInternal.filter((s: any) => matchLokasi(s.lokasi_proyek, proyek)),
      eksternal: sewaEksternal.filter((s: any) => matchLokasi(s.lokasi_proyek, proyek)),
    };

    // Include ALL BBM transactions for this project (both pembelian and pemakaian)
    const bbm = bbmTrans.filter(
      (t) => matchLokasi(t.lokasiProyek, proyek)
    );

    // Include ALL Oli transactions for this project (both pembelian and pemakaian)
    const oli = oliTrans.filter(
      (t) => matchLokasi(t.lokasiProyek, proyek)
    );

    // Collect all no_lambung belonging to this project
    const projectNoLambungs = new Set([
      ...alat.berat.map((a) => (a.no_lambung || '').trim().toLowerCase()).filter(Boolean),
      ...alat.pendukung.map((a) => (a.noLambung || '').trim().toLowerCase()).filter(Boolean),
      ...alat.kendaraan.map((a) => (a.noLambung || '').trim().toLowerCase()).filter(Boolean),
      ...sewa.internal.map((s: any) => (s.no_lambung || s.nama_alat || '').trim().toLowerCase()).filter(Boolean),
      ...sewa.eksternal.map((s: any) => (s.no_lambung || s.nama_alat || '').trim().toLowerCase()).filter(Boolean),
    ]);

    // Match perbaikan by lokasi OR if the repaired machine belongs to this project
    const perbaikan = perbaikanList.filter((p) => {
      const locMatch = matchLokasi(p.lokasiPerbaikan || (p as any).lokasi_perbaikan, proyek);
      const noLambung = (p.noLambung || (p as any).no_lambung || '').trim().toLowerCase();
      const alatMatch = Boolean(noLambung && projectNoLambungs.has(noLambung));
      return locMatch || alatMatch;
    });

    // Biaya Sewa
    const biayaSewaInternal = sewa.internal.reduce((acc: number, i: any) => acc + (Number(i.total_biaya) || 0), 0);
    const biayaSewaEksternal = sewa.eksternal.reduce((acc: number, i: any) => acc + (Number(i.total_biaya) || 0), 0);
    const totalSewa = biayaSewaInternal + biayaSewaEksternal;

    // Biaya BBM breakdown
    const bbmPembelian = bbm.filter(t => t.jenis === 'pembelian');
    const bbmPemakaian = bbm.filter(t => t.jenis === 'pemakaian' || !t.jenis);
    const bbmPembelianLiter = bbmPembelian.reduce((acc: number, t) => acc + (Number(t.jumlah) || 0), 0);
    const bbmPembelianBiaya = bbmPembelian.reduce((acc: number, t) => acc + (Number(t.cost) || 0) * (Number(t.jumlah) || 0), 0);
    const bbmPemakaianLiter = bbmPemakaian.reduce((acc: number, t) => acc + (Number(t.jumlah) || 0), 0);
    const bbmPemakaianBiaya = bbmPemakaian.reduce((acc: number, t) => acc + (Number(t.cost) || 0) * (Number(t.jumlah) || 0), 0);
    const bbmLiter = bbm.reduce((acc: number, t) => acc + (Number(t.jumlah) || 0), 0);
    const bbmBiaya = bbm.reduce((acc: number, t) => acc + (Number(t.cost) || 0) * (Number(t.jumlah) || 0), 0);

    // Biaya Oli breakdown
    const oliPembelian = oli.filter(t => t.jenis === 'pembelian');
    const oliPemakaian = oli.filter(t => t.jenis === 'pemakaian' || !t.jenis);
    const oliPembelianLiter = oliPembelian.reduce((acc: number, t) => acc + (Number(t.volume) || 0), 0);
    const oliPembelianBiaya = oliPembelian.reduce((acc: number, t) => acc + (Number(t.totalHarga) || (Number(t.volume) * (Number(t.hargaPembelian) || 0))), 0);
    const oliPemakaianLiter = oliPemakaian.reduce((acc: number, t) => acc + (Number(t.volume) || 0), 0);
    const oliPemakaianBiaya = oliPemakaian.reduce((acc: number, t) => acc + (Number(t.totalHarga) || (Number(t.volume) * (Number(t.hargaPembelian) || 0))), 0);
    const oliLiter = oli.reduce((acc: number, t) => acc + (Number(t.volume) || 0), 0);
    const oliBiaya = oli.reduce((acc: number, t) => acc + (Number(t.totalHarga) || (Number(t.volume) * (Number(t.hargaPembelian) || 0))), 0);

    // Biaya Perbaikan
    const perbaikanBiaya = perbaikan.reduce((acc: number, p) => acc + (Number(p.totalBiaya) || 0), 0);

    const grandTotal = totalSewa + bbmBiaya + oliBiaya + perbaikanBiaya;

    return {
      alat,
      sewa,
      bbm,
      bbmPembelian,
      bbmPemakaian,
      bbmPembelianLiter,
      bbmPembelianBiaya,
      bbmPemakaianLiter,
      bbmPemakaianBiaya,
      oli,
      oliPembelian,
      oliPemakaian,
      oliPembelianLiter,
      oliPembelianBiaya,
      oliPemakaianLiter,
      oliPemakaianBiaya,
      perbaikan,
      biayaSewaInternal,
      biayaSewaEksternal,
      totalSewa,
      bbmLiter,
      bbmBiaya,
      oliLiter,
      oliBiaya,
      perbaikanBiaya,
      grandTotal,
    };
  }, [proyek, alatBeratList, alatPendukungList, kendaraanList, sewaInternal, sewaEksternal, bbmTrans, oliTrans, perbaikanList]);

  if (!proyek || !data) return null;

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'alat', label: `Daftar Alat (${data.alat.berat.length + data.alat.pendukung.length + data.alat.kendaraan.length})`, icon: <Truck size={14} /> },
    { key: 'sewa', label: `Sewa Alat (${data.sewa.internal.length + data.sewa.eksternal.length})`, icon: <HandCoins size={14} /> },
    { key: 'bbm', label: `BBM (${data.bbm.length})`, icon: <Fuel size={14} /> },
    { key: 'oli', label: `Oli (${data.oli.length})`, icon: <Droplets size={14} /> },
    { key: 'perbaikan', label: `Perbaikan (${data.perbaikan.length})`, icon: <Wrench size={14} /> },
  ];

  const handlePrint = () => {
    const rows = {
      alat: [...data.alat.berat.map(a => ({ kat: 'Alat Berat', nama: a.nama_alat || '-', no: a.no_lambung || '-', merk: `${a.merk || ''} ${a.tipe || ''}`.trim() || '-', kondisi: a.kondisi || '-', status: a.status || '-' })),
        ...data.alat.pendukung.map(a => ({ kat: 'Alat Pendukung', nama: a.namaAlat || '-', no: a.noLambung || '-', merk: '-', kondisi: '-', status: a.status || '-' })),
        ...data.alat.kendaraan.map(a => ({ kat: 'Kendaraan', nama: a.namaAlat || '-', no: a.noLambung || '-', merk: `${a.merk || ''} ${a.tipe || ''}`.trim() || '-', kondisi: a.kondisi || '-', status: a.status || '-' })),
      ],
    };
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Detail Proyek - ${proyek.namaProyek}</title>
    <style>body{font-family:Arial,sans-serif;padding:20px;font-size:12px}h1{font-size:18px}h2{font-size:14px;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:20px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #ccc;padding:6px;text-align:left}th{background:#f1f5f9}.total-row{font-weight:bold;background:#f8fafc}.grand-total{font-size:16px;font-weight:bold;margin-top:20px;padding:12px;background:#dbeafe;border-radius:4px}</style>
    </head><body>
    <h1>Detail Proyek: ${proyek.namaProyek}</h1>
    <p>📍 Lokasi: ${proyek.lokasi || '-'} | 👤 Kepala Proyek: ${proyek.kepalaProyek || '-'}</p>
    <h2>RINGKASAN BIAYA</h2>
    <table><tr><th>Kategori</th><th>Rincian</th><th>Total</th></tr>
    <tr><td>Sewa Alat</td><td>Internal: ${fmt(data.biayaSewaInternal)} | Eksternal: ${fmt(data.biayaSewaEksternal)}</td><td>${fmt(data.totalSewa)}</td></tr>
    <tr><td>BBM</td><td>Beli: ${data.bbmPembelianLiter.toFixed(1)} L (${fmt(data.bbmPembelianBiaya)}) | Pakai: ${data.bbmPemakaianLiter.toFixed(1)} L (${fmt(data.bbmPemakaianBiaya)})</td><td>${fmt(data.bbmBiaya)}</td></tr>
    <tr><td>Oli</td><td>Beli: ${data.oliPembelianLiter.toFixed(1)} L (${fmt(data.oliPembelianBiaya)}) | Pakai: ${data.oliPemakaianLiter.toFixed(1)} L (${fmt(data.oliPemakaianBiaya)})</td><td>${fmt(data.oliBiaya)}</td></tr>
    <tr><td>Sparepart & Perbaikan</td><td>${data.perbaikan.length} perbaikan tercatat</td><td>${fmt(data.perbaikanBiaya)}</td></tr>
    <tr class="total-row"><td colspan="2">GRAND TOTAL</td><td>${fmt(data.grandTotal)}</td></tr>
    </table>
    <h2>DAFTAR ALAT</h2>
    <table><tr><th>Kategori</th><th>Nama</th><th>No Lambung/Polisi</th><th>Merk/Tipe</th><th>Kondisi</th><th>Status</th></tr>
    ${rows.alat.map(r => `<tr><td>${r.kat}</td><td>${r.nama}</td><td>${r.no}</td><td>${r.merk}</td><td>${r.kondisi}</td><td>${r.status}</td></tr>`).join('')}
    </table>
    <div class="grand-total">Grand Total Biaya Proyek: ${fmt(data.grandTotal)}</div>
    <script>window.onload=()=>{setTimeout(()=>{window.print();setTimeout(()=>window.close(),500)},400)}</script>
    </body></html>`);
    w.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MapPin size={20} className="text-blue-200" />
                <DialogTitle className="text-xl text-white font-bold">{proyek.namaProyek}</DialogTitle>
              </div>
              <p className="text-blue-100 text-sm">📍 {proyek.lokasi || '-'} &nbsp;|&nbsp; 👤 {proyek.kepalaProyek || '-'}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30" onClick={handlePrint}>
                <Printer size={14} className="mr-1" /> Cetak
              </Button>
              <Button size="icon" variant="ghost" className="text-white hover:bg-white/20" onClick={onClose}>
                <X size={18} />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* KPI Cards (6 columns including Biaya Perbaikan) */}
        <div className="px-6 py-4 bg-slate-50 border-b grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div className="bg-white rounded-lg p-2.5 border text-center shadow-sm">
            <div className="text-[11px] text-gray-500 font-medium">Total Alat</div>
            <div className="text-xl font-extrabold text-slate-800">{data.alat.berat.length + data.alat.pendukung.length + data.alat.kendaraan.length}</div>
          </div>
          <div className="bg-white rounded-lg p-2.5 border text-center shadow-sm">
            <div className="text-[11px] text-indigo-600 font-medium">Biaya Sewa</div>
            <div className="text-xs font-bold text-indigo-700 mt-1">{fmt(data.totalSewa)}</div>
          </div>
          <div className="bg-white rounded-lg p-2.5 border text-center shadow-sm">
            <div className="text-[11px] text-orange-600 font-medium">Biaya BBM</div>
            <div className="text-xs font-bold text-orange-700 mt-1">{fmt(data.bbmBiaya)}</div>
            <div className="text-[9px] text-gray-400 mt-0.5">{data.bbmLiter.toFixed(0)} L</div>
          </div>
          <div className="bg-white rounded-lg p-2.5 border text-center shadow-sm">
            <div className="text-[11px] text-teal-600 font-medium">Biaya Oli</div>
            <div className="text-xs font-bold text-teal-700 mt-1">{fmt(data.oliBiaya)}</div>
            <div className="text-[9px] text-gray-400 mt-0.5">{data.oliLiter.toFixed(0)} L</div>
          </div>
          <div className="bg-white rounded-lg p-2.5 border text-center shadow-sm">
            <div className="text-[11px] text-red-600 font-medium">Biaya Perbaikan</div>
            <div className="text-xs font-bold text-red-700 mt-1">{fmt(data.perbaikanBiaya)}</div>
            <div className="text-[9px] text-gray-400 mt-0.5">{data.perbaikan.length} order</div>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-blue-600 rounded-lg p-2.5 border text-center shadow-sm">
            <div className="text-[11px] text-blue-100 font-medium flex items-center justify-center gap-0.5"><DollarSign size={10} />GRAND TOTAL</div>
            <div className="text-xs font-extrabold text-white mt-1">{fmt(data.grandTotal)}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-white px-4 overflow-x-auto gap-0 flex-shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-700 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Tab: Daftar Alat */}
          {activeTab === 'alat' && (
            <div className="space-y-4">
              {[
                { title: 'Alat Berat', items: data.alat.berat, colNama: (row: any) => row.nama_alat, colNo: (row: any) => row.no_lambung, colMerk: (row: any) => `${row.merk || ''} ${row.tipe || ''}`.trim() || '-', colKondisi: (row: any) => row.kondisi, colStatus: (row: any) => row.status },
                { title: 'Alat Pendukung', items: data.alat.pendukung, colNama: (row: any) => row.namaAlat, colNo: (row: any) => row.noLambung, colMerk: (_row: any) => '-', colKondisi: (_row: any) => '-', colStatus: (row: any) => row.status },
                { title: 'Kendaraan', items: data.alat.kendaraan, colNama: (row: any) => row.namaAlat, colNo: (row: any) => row.noLambung, colMerk: (row: any) => `${row.merk || ''} ${row.tipe || ''}`.trim() || '-', colKondisi: (row: any) => row.kondisi, colStatus: (row: any) => row.status },
              ].map(({ title, items, colNama, colNo, colMerk, colKondisi, colStatus }) => (
                <div key={title}>
                  <h3 className="font-semibold text-sm text-gray-700 mb-2">{title} ({items.length})</h3>
                  {items.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">Tidak ada data {title.toLowerCase()} di lokasi ini</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="text-left p-2 font-medium text-xs text-gray-600">No</th>
                            <th className="text-left p-2 font-medium text-xs text-gray-600">Nama</th>
                            <th className="text-left p-2 font-medium text-xs text-gray-600">No Lambung/Polisi</th>
                            <th className="text-left p-2 font-medium text-xs text-gray-600">Merk/Tipe</th>
                            <th className="text-left p-2 font-medium text-xs text-gray-600">Kondisi</th>
                            <th className="text-left p-2 font-medium text-xs text-gray-600">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((a, idx) => (
                            <tr key={(a as any).id} className="border-t hover:bg-slate-50">
                              <td className="p-2 text-xs text-gray-500">{idx + 1}</td>
                              <td className="p-2 text-xs font-medium">{colNama(a)}</td>
                              <td className="p-2 text-xs">{colNo(a) || '-'}</td>
                              <td className="p-2 text-xs">{colMerk(a)}</td>
                              <td className="p-2 text-xs">{colKondisi(a) || '-'}</td>
                              <td className="p-2 text-xs">{colStatus(a) || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Tab: Sewa Alat */}
          {activeTab === 'sewa' && (
            <div className="space-y-4">
              {[
                { title: 'Sewa Internal', items: data.sewa.internal, totalBiaya: data.biayaSewaInternal },
                { title: 'Sewa Eksternal', items: data.sewa.eksternal, totalBiaya: data.biayaSewaEksternal },
              ].map(({ title, items, totalBiaya }) => (
                <div key={title}>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-sm text-gray-700">{title} ({items.length})</h3>
                    <span className="text-sm font-bold text-indigo-700">{fmt(totalBiaya)}</span>
                  </div>
                  {items.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">Tidak ada data {title.toLowerCase()}</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="text-left p-2 text-xs text-gray-600">Nama Alat</th>
                            <th className="text-left p-2 text-xs text-gray-600">Vendor</th>
                            <th className="text-left p-2 text-xs text-gray-600">Tgl Sewa</th>
                            <th className="text-right p-2 text-xs text-gray-600">Biaya Sewa</th>
                            <th className="text-right p-2 text-xs text-gray-600">Total Biaya</th>
                            <th className="text-left p-2 text-xs text-gray-600">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((sewaRow: any, sewaIdx: number) => (
                            <tr key={sewaRow.id || sewaIdx} className="border-t hover:bg-slate-50">
                              <td className="p-2 text-xs font-medium">{sewaRow.nama_alat}</td>
                              <td className="p-2 text-xs">{sewaRow.vendor}</td>
                              <td className="p-2 text-xs">{sewaRow.tanggal_sewa ? formatDateDisplay(sewaRow.tanggal_sewa) : '-'}</td>
                              <td className="p-2 text-xs text-right">{fmt(sewaRow.biaya_sewa)}</td>
                              <td className="p-2 text-xs text-right font-semibold">{fmt(sewaRow.total_biaya)}</td>
                              <td className="p-2 text-xs">{sewaRow.status}</td>
                            </tr>
                          ))}
                          <tr className="border-t bg-indigo-50 font-bold">
                            <td colSpan={4} className="p-2 text-xs text-right text-indigo-700">Subtotal {title}</td>
                            <td className="p-2 text-xs text-right text-indigo-700">{fmt(totalBiaya)}</td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
              {(data.sewa.internal.length > 0 || data.sewa.eksternal.length > 0) && (
                <div className="flex justify-between items-center bg-indigo-100 rounded-lg px-4 py-2">
                  <span className="text-sm font-bold text-indigo-800">Total Biaya Sewa Alat</span>
                  <span className="text-sm font-extrabold text-indigo-900">{fmt(data.totalSewa)}</span>
                </div>
              )}
            </div>
          )}

          {/* Tab: BBM (Supports both Pembelian & Pemakaian) */}
          {activeTab === 'bbm' && (
            <div>
              <div className="flex flex-wrap justify-between items-center gap-2 mb-3 bg-orange-50 p-3 rounded-lg border border-orange-200">
                <div>
                  <h3 className="font-semibold text-sm text-orange-950">Transaksi BBM ({data.bbm.length} transaksi)</h3>
                  <div className="flex items-center gap-3 text-xs text-orange-800 mt-1">
                    <span><strong>Pembelian:</strong> {data.bbmPembelianLiter.toFixed(1)} L ({fmt(data.bbmPembelianBiaya)})</span>
                    <span>•</span>
                    <span><strong>Pemakaian:</strong> {data.bbmPemakaianLiter.toFixed(1)} L ({fmt(data.bbmPemakaianBiaya)})</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-orange-700 block font-medium">Total Biaya BBM</span>
                  <span className="text-base font-extrabold text-orange-900">{fmt(data.bbmBiaya)}</span>
                </div>
              </div>

              {data.bbm.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Tidak ada transaksi BBM di lokasi ini</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left p-2 text-xs text-gray-600">Tanggal</th>
                        <th className="text-center p-2 text-xs text-gray-600">Jenis Transaksi</th>
                        <th className="text-left p-2 text-xs text-gray-600">Jenis BBM</th>
                        <th className="text-left p-2 text-xs text-gray-600">No Lambung</th>
                        <th className="text-left p-2 text-xs text-gray-600">Nama Alat</th>
                        <th className="text-right p-2 text-xs text-gray-600">Volume (L)</th>
                        <th className="text-right p-2 text-xs text-gray-600">Harga/L</th>
                        <th className="text-right p-2 text-xs text-gray-600">Total Biaya</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.bbm.map((t, idx) => (
                        <tr key={t.id || idx} className="border-t hover:bg-slate-50">
                          <td className="p-2 text-xs">{t.tanggal}</td>
                          <td className="p-2 text-xs text-center">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              t.jenis === 'pembelian'
                                ? 'bg-blue-100 text-blue-800'
                                : t.jenis === 'sisa_stock'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {t.jenis === 'pembelian' ? 'Pembelian' : t.jenis === 'sisa_stock' ? 'Sisa Stock' : 'Pemakaian'}
                            </span>
                          </td>
                          <td className="p-2 text-xs font-medium">{t.jenisBBM}</td>
                          <td className="p-2 text-xs font-mono">{t.noLambung || '-'}</td>
                          <td className="p-2 text-xs">{t.namaAlat || '-'}</td>
                          <td className="p-2 text-xs text-right font-medium">{Number(t.jumlah).toFixed(1)}</td>
                          <td className="p-2 text-xs text-right">{fmt(Number(t.cost))}</td>
                          <td className="p-2 text-xs text-right font-semibold">{fmt(Number(t.cost) * Number(t.jumlah))}</td>
                        </tr>
                      ))}
                      <tr className="border-t bg-orange-50 font-bold">
                        <td colSpan={5} className="p-2 text-xs text-right text-orange-700">TOTAL</td>
                        <td className="p-2 text-xs text-right text-orange-700">{data.bbmLiter.toFixed(1)} L</td>
                        <td></td>
                        <td className="p-2 text-xs text-right text-orange-700">{fmt(data.bbmBiaya)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab: Oli (Supports both Pembelian & Pemakaian) */}
          {activeTab === 'oli' && (
            <div>
              <div className="flex flex-wrap justify-between items-center gap-2 mb-3 bg-teal-50 p-3 rounded-lg border border-teal-200">
                <div>
                  <h3 className="font-semibold text-sm text-teal-950">Transaksi Oli ({data.oli.length} transaksi)</h3>
                  <div className="flex items-center gap-3 text-xs text-teal-800 mt-1">
                    <span><strong>Pembelian:</strong> {data.oliPembelianLiter.toFixed(1)} L ({fmt(data.oliPembelianBiaya)})</span>
                    <span>•</span>
                    <span><strong>Pemakaian:</strong> {data.oliPemakaianLiter.toFixed(1)} L ({fmt(data.oliPemakaianBiaya)})</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-teal-700 block font-medium">Total Biaya Oli</span>
                  <span className="text-base font-extrabold text-teal-900">{fmt(data.oliBiaya)}</span>
                </div>
              </div>

              {data.oli.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Tidak ada transaksi oli di lokasi ini</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left p-2 text-xs text-gray-600">Tanggal</th>
                        <th className="text-center p-2 text-xs text-gray-600">Jenis Transaksi</th>
                        <th className="text-left p-2 text-xs text-gray-600">Jenis Oli</th>
                        <th className="text-left p-2 text-xs text-gray-600">No Lambung</th>
                        <th className="text-left p-2 text-xs text-gray-600">Nama Alat</th>
                        <th className="text-right p-2 text-xs text-gray-600">Volume (L)</th>
                        <th className="text-right p-2 text-xs text-gray-600">Total Biaya</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.oli.map((t, idx) => (
                        <tr key={t.id || idx} className="border-t hover:bg-slate-50">
                          <td className="p-2 text-xs">{t.tanggal}</td>
                          <td className="p-2 text-xs text-center">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              t.jenis === 'pembelian'
                                ? 'bg-blue-100 text-blue-800'
                                : t.jenis === 'sisa_stock'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-teal-100 text-teal-800'
                            }`}>
                              {t.jenis === 'pembelian' ? 'Pembelian' : t.jenis === 'sisa_stock' ? 'Sisa Stock' : 'Pemakaian'}
                            </span>
                          </td>
                          <td className="p-2 text-xs font-medium">{(t as any).jenis_oli || (t as any).oilTypeName || '-'}</td>
                          <td className="p-2 text-xs font-mono">{(t as any).noLambung || (t as any).no_lambung || '-'}</td>
                          <td className="p-2 text-xs">{(t as any).namaAlat || (t as any).nama_alat || '-'}</td>
                          <td className="p-2 text-xs text-right font-medium">{Number(t.volume).toFixed(1)}</td>
                          <td className="p-2 text-xs text-right font-semibold">{fmt(Number(t.totalHarga))}</td>
                        </tr>
                      ))}
                      <tr className="border-t bg-teal-50 font-bold">
                        <td colSpan={5} className="p-2 text-xs text-right text-teal-700">TOTAL</td>
                        <td className="p-2 text-xs text-right text-teal-700">{data.oliLiter.toFixed(1)} L</td>
                        <td className="p-2 text-xs text-right text-teal-700">{fmt(data.oliBiaya)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab: Perbaikan */}
          {activeTab === 'perbaikan' && (
            <div>
              <div className="flex justify-between items-center mb-3 bg-red-50 p-3 rounded-lg border border-red-200">
                <div>
                  <h3 className="font-semibold text-sm text-red-950">Sparepart & Perbaikan ({data.perbaikan.length} order)</h3>
                  <p className="text-xs text-red-700">Mencakup perbaikan alat di lokasi proyek ini</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-red-700 block font-medium">Total Biaya Perbaikan</span>
                  <span className="text-base font-extrabold text-red-900">{fmt(data.perbaikanBiaya)}</span>
                </div>
              </div>

              {data.perbaikan.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Tidak ada data perbaikan untuk alat di lokasi ini</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left p-2 text-xs text-gray-600">No Perbaikan</th>
                        <th className="text-left p-2 text-xs text-gray-600">Tanggal</th>
                        <th className="text-left p-2 text-xs text-gray-600">Alat</th>
                        <th className="text-left p-2 text-xs text-gray-600">Lokasi Perbaikan</th>
                        <th className="text-left p-2 text-xs text-gray-600">Jenis Kerusakan</th>
                        <th className="text-left p-2 text-xs text-gray-600">Teknisi</th>
                        <th className="text-left p-2 text-xs text-gray-600">Status</th>
                        <th className="text-right p-2 text-xs text-gray-600">Total Biaya</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.perbaikan.map((p, idx) => (
                        <tr key={p.id || idx} className="border-t hover:bg-slate-50">
                          <td className="p-2 text-xs font-mono">{p.noPerbaikan}</td>
                          <td className="p-2 text-xs">{p.tanggal}</td>
                          <td className="p-2 text-xs font-medium">{p.namaAlat} {p.noLambung ? `(${p.noLambung})` : ''}</td>
                          <td className="p-2 text-xs">{p.lokasiPerbaikan || '-'}</td>
                          <td className="p-2 text-xs">{p.jenisKerusakan || '-'}</td>
                          <td className="p-2 text-xs">{p.teknisi || '-'}</td>
                          <td className="p-2 text-xs">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              p.status === 'selesai'
                                ? 'bg-green-100 text-green-800'
                                : p.status === 'dalam_perbaikan'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="p-2 text-xs text-right font-semibold">{fmt(p.totalBiaya || 0)}</td>
                        </tr>
                      ))}
                      <tr className="border-t bg-red-50 font-bold">
                        <td colSpan={7} className="p-2 text-xs text-right text-red-700">TOTAL</td>
                        <td className="p-2 text-xs text-right text-red-700">{fmt(data.perbaikanBiaya)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Grand Total Footer */}
        <div className="px-6 py-4 border-t bg-blue-700 flex items-center justify-between rounded-b-lg">
          <span className="text-white font-semibold text-sm">Grand Total Biaya Proyek</span>
          <span className="text-white font-extrabold text-xl">{fmt(data.grandTotal)}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
