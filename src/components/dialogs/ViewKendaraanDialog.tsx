import { useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import type { Kendaraan } from '@/types';
import FotoViewerModal from '@/components/FotoViewerModal';
import { parseFotoList, SLOT_LABELS } from '@/utils/fotoUtils';
import { formatDateDisplay } from '@/utils/dateUtils';

interface ViewKendaraanDialogProps {
  kendaraan: Kendaraan;
}

const tampil = (v: unknown): string =>
  v === null || v === undefined || String(v).trim() === '' ? '-' : String(v);

function Item({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-100 pb-1">
        {title}
      </h4>
      {children}
    </div>
  );
}

export function ViewKendaraanDialog({ kendaraan }: ViewKendaraanDialogProps) {
  const [viewerState, setViewerState] = useState<{ src: string[]; index: number } | null>(null);
  const tgl = (v?: string | null) => (v ? formatDateDisplay(v) : '-');
  const fotos = parseFotoList(kendaraan.foto || kendaraan.gambar);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="sm"
          title="Lihat detail"
          className="h-7 gap-1 px-2 text-xs bg-cyan-500 text-white hover:bg-cyan-600"
        >
          <Eye className="h-3 w-3" />
          Lihat
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle id="view-kendaraan-title">Detail Kendaraan</DialogTitle>
          <DialogDescription id="view-kendaraan-description">
            Informasi lengkap mengenai kendaraan {kendaraan.noLambung || kendaraan.namaAlat}
          </DialogDescription>
        </DialogHeader>
        <div role="document" aria-labelledby="view-kendaraan-title" aria-describedby="view-kendaraan-description">
          <div className="space-y-5">
            <Section title="Identitas Kendaraan">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Item label="Nomor Polisi"><span className="font-mono font-semibold">{tampil(kendaraan.noLambung)}</span></Item>
                <Item label="Merk">{tampil(kendaraan.merk)}</Item>
                <Item label="Type">{tampil(kendaraan.tipe)}</Item>
                <Item label="Jenis">{tampil(kendaraan.jenisAlat)}</Item>
                <Item label="Model">{tampil(kendaraan.model)}</Item>
                <Item label="Warna TNKB">{tampil(kendaraan.warnaTnkb)}</Item>
                <Item label="Nama Kendaraan" className="col-span-2 sm:col-span-3">{tampil(kendaraan.namaAlat)}</Item>
              </div>
            </Section>

            <Section title="Pemilik & Pengguna">
              <div className="grid grid-cols-2 gap-4">
                <Item label="Nama Pemilik">{tampil(kendaraan.namaPemilik)}</Item>
                <Item label="Pengguna">{tampil(kendaraan.pengguna)}</Item>
                <Item label="Alamat" className="col-span-2">{tampil(kendaraan.alamatPemilik)}</Item>
              </div>
            </Section>

            <Section title="Data Teknis">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Item label="Tahun Pembuatan">{tampil(kendaraan.tahunPembuatan)}</Item>
                <Item label="Isi Silinder">{kendaraan.isiSilinder ? `${kendaraan.isiSilinder} cc` : '-'}</Item>
                <Item label="Nomor Rangka"><span className="font-mono break-all">{tampil(kendaraan.nomorRangka)}</span></Item>
                <Item label="Nomor Mesin"><span className="font-mono break-all">{tampil(kendaraan.nomorMesin)}</span></Item>
              </div>
            </Section>

            <Section title="Dokumen">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Item label="Tahun Registrasi">{tampil(kendaraan.tahunRegistrasi)}</Item>
                <Item label="Nomor BPKB">{tampil(kendaraan.nomorBpkb)}</Item>
                <Item label="Tgl Berlaku STNK">{tgl(kendaraan.tglBerlakuStnk)}</Item>
                <Item label="Tgl Berlaku Pajak">{tgl(kendaraan.tglBerlakuPajak)}</Item>
              </div>
            </Section>

            <Section title="Operasional">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Item label="Lokasi">{tampil(kendaraan.lokasi)}</Item>
                <Item label="Kondisi">{tampil(kendaraan.kondisi)}</Item>
                <Item label="Status"><span className="capitalize">{kendaraan.status || 'Aktif'}</span></Item>
                <Item label="Service Berkala Terakhir">{tgl(kendaraan.serviceTerakhir)}</Item>
                <Item label="Service Berkala Berikutnya">{tgl(kendaraan.serviceBerikutnya)}</Item>
                <Item label="Keterangan" className="col-span-2 sm:col-span-3">{tampil(kendaraan.keterangan)}</Item>
              </div>
            </Section>

            {/* Foto Kendaraan */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <p className="text-sm font-semibold text-gray-700">Foto Kendaraan</p>
              {fotos.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Belum ada foto yang diunggah</p>
              ) : (
                <>
                  <div className="grid grid-cols-5 gap-2">
                    {fotos.map((src, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setViewerState({ src: fotos, index: idx })}
                        className="group relative h-16 rounded-md overflow-hidden border border-slate-200 hover:border-blue-400 hover:ring-2 hover:ring-blue-300 transition-all cursor-pointer bg-slate-50"
                        title={`Lihat Foto ${idx + 1}: ${SLOT_LABELS[idx] || ''}`}
                      >
                        <img src={src} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                        <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[8px] px-1 font-bold rounded-tl">
                          {idx + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                  {viewerState && (
                    <FotoViewerModal
                      src={viewerState.src}
                      alt={kendaraan.namaAlat}
                      initialIndex={viewerState.index}
                      onClose={() => setViewerState(null)}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}