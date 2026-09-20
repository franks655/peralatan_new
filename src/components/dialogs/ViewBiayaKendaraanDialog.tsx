import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import type { BiayaKendaraan } from '@/types';

interface ViewBiayaKendaraanDialogProps {
  biaya: BiayaKendaraan;
}

export function ViewBiayaKendaraanDialog({ biaya }: ViewBiayaKendaraanDialogProps) {
  const [open, setOpen] = useState(false);

  const formatTgl = (v?: string | null): string => {
    if (!v) return '-';
    const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : v;
  };

  const rupiah = (v: unknown): string => {
    const n = Number(v);
    return v === null || v === undefined || !Number.isFinite(n) ? '-' : `Rp ${n.toLocaleString('id-ID')}`;
  };

  const tampil = (v: unknown): string =>
    v === null || v === undefined || String(v).trim() === '' ? '-' : String(v);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs">
          <Eye className="h-3 w-3" />
          Lihat
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Detail Biaya Kendaraan</DialogTitle>
          <DialogDescription>
            Informasi lengkap pengeluaran biaya kendaraan
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500">Nomor Polisi</label>
              <p className="text-sm font-semibold">{tampil(biaya.noLambung)}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Tanggal</label>
              <p className="text-sm">{formatTgl(biaya.tanggal)}</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500">Jenis Perawatan</label>
            <p className="text-sm">{tampil(biaya.jenisPerawatan)}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500">Nama Barang/Jasa</label>
            <p className="text-sm font-semibold">{tampil(biaya.namaBarangJasa)}</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500">Volume</label>
              <p className="text-sm">{tampil(biaya.volume)}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Satuan</label>
              <p className="text-sm">{tampil(biaya.satuan)}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Harga Satuan</label>
              <p className="text-sm">{rupiah(biaya.hargaSatuan)}</p>
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-md">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total:</span>
              <span className="text-lg font-bold text-blue-900">
                {rupiah(biaya.total ?? biaya.volume * biaya.hargaSatuan)}
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500">Tempat</label>
            <p className="text-sm">{tampil(biaya.tempat)}</p>
          </div>

          {biaya.jenisPerawatan === 'E-toll' && (
            <div className="grid grid-cols-2 gap-4 bg-blue-50 p-3 rounded-md">
              <div>
                <label className="text-xs font-medium text-gray-500">Gerbang Masuk</label>
                <p className="text-sm font-semibold">{tampil(biaya.gerbangMasuk)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Gerbang Keluar</label>
                <p className="text-sm font-semibold">{tampil(biaya.gerbangKeluar)}</p>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-500">Keterangan</label>
            <p className="text-sm whitespace-pre-wrap">{tampil(biaya.keterangan)}</p>
          </div>

          <div className="pt-4 border-t text-xs text-gray-400">
            <p>Dibuat: {biaya.created_at ? new Date(biaya.created_at).toLocaleString('id-ID') : '-'}</p>
            <p>Diupdate: {biaya.updated_at ? new Date(biaya.updated_at).toLocaleString('id-ID') : '-'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
