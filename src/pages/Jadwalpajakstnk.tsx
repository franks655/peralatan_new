import { useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Printer, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useKendaraan } from '@/hooks/useKendaraan';
import { usePagePermission } from '@/hooks/usePagePermission';
import { useHariIni } from '@/hooks/usehariini';
import { SimplePagination, paginateData, getTotalPages } from '@/components/ui/SimplePagination';
import { TableScrollWrapper } from '@/components/ui/TableScrollWrapper';
import {
    hitungStatus,
    petunjukPerpanjangan,
    STNK_PERINGATAN_HARI,
    PAJAK_PERINGATAN_HARI,
    type HasilStatus,
    type StatusDokumen,
} from '@/utils/stnkUtils';
import type { Kendaraan } from '@/types';

/* ------------------------------------------------------------------ */
/* Helper tampilan                                                     */
/* ------------------------------------------------------------------ */

/** yyyy-mm-dd -> dd-mm-yyyy */
const formatTgl = (v?: string | null): string => {
    const m = String(v ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : '-';
};

const tampil = (v: unknown): string =>
    v === null || v === undefined || String(v).trim() === '' ? '-' : String(v);

const esc = (v: unknown): string =>
    String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const BADGE_CLASS: Record<StatusDokumen, string> = {
    berlaku: 'bg-emerald-600 text-white',
    'akan-berakhir': 'bg-amber-400 text-slate-900',
    'perlu-perpanjangan': 'bg-red-600 text-white',
    'belum-diisi': 'bg-slate-300 text-slate-700',
};

const BADGE_PRINT: Record<StatusDokumen, string> = {
    berlaku: 'background:#059669;color:#fff',
    'akan-berakhir': 'background:#fbbf24;color:#111',
    'perlu-perpanjangan': 'background:#dc2626;color:#fff',
    'belum-diisi': 'background:#cbd5e1;color:#334155',
};

function StatusBadge({ hasil }: { hasil: HasilStatus }) {
    return (
        <span
            title={hasil.keterangan}
            className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold leading-tight whitespace-nowrap ${BADGE_CLASS[hasil.status]}`}
        >
            {hasil.label}
        </span>
    );
}

interface BarisJadwal {
    k: Kendaraan;
    stnk: HasilStatus;
    pajak: HasilStatus;
}

const thClass = 'h-auto px-2 py-2 text-xs font-bold leading-tight !bg-slate-900 !text-white align-middle';
const tdClass = 'px-2 py-2 text-xs align-middle';

/* ------------------------------------------------------------------ */
/* Komponen                                                            */
/* ------------------------------------------------------------------ */

export default function JadwalPajakStnk() {
    const { toast } = useToast();
    const { can_print: canPrint } = usePagePermission('databaseKendaraan');
    const { data: kendaraanData = [], isLoading } = useKendaraan(); // data yang sama dengan tab Database Kendaraan
    const hariIni = useHariIni(); // berganti otomatis saat lewat tengah malam

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(100);

    /** Status dihitung ulang setiap data atau tanggal hari ini berubah */
    const baris = useMemo<BarisJadwal[]>(() => {
        return kendaraanData
            .map((k) => ({
                k,
                stnk: hitungStatus(k.tglBerlakuStnk, STNK_PERINGATAN_HARI, hariIni),
                pajak: hitungStatus(k.tglBerlakuPajak, PAJAK_PERINGATAN_HARI, hariIni),
            }))
            .sort((a, b) => {
                const pa = a.k.noLambung || '';
                const pb = b.k.noLambung || '';
                if (!pa && pb) return 1;
                if (pa && !pb) return -1;
                return pa.localeCompare(pb, 'id', { numeric: true, sensitivity: 'base' });
            });
    }, [kendaraanData, hariIni]);

    const tanggalHariIni = useMemo(
        () =>
            `${String(hariIni.getDate()).padStart(2, '0')}-${String(hariIni.getMonth() + 1).padStart(2, '0')}-${hariIni.getFullYear()}`,
        [hariIni]
    );

    /** Klik "Perpanjangan": buka situs resmi di tab baru + tampilkan petunjuk */
    const handlePerpanjangan = (row: BarisJadwal) => {
        const info = petunjukPerpanjangan(row.k, row.stnk.status, row.pajak.status);

        // window.open dipanggil langsung di dalam handler klik agar tidak diblokir pop-up blocker
        const jendela = window.open(info.url, '_blank', 'noopener,noreferrer');

        toast({
            title: info.title,
            description: jendela
                ? info.description
                : `Pop-up diblokir browser. Buka manual: ${info.url}. ${info.description}`,
            variant: jendela ? 'default' : 'destructive',
        });
    };

    /* ----------------------------- PRINT ----------------------------- */
    const handlePrint = useCallback(() => {
        if (baris.length === 0) {
            toast({
                title: 'Tidak ada data',
                description: 'Tidak ada data yang bisa dicetak.',
                variant: 'destructive',
            });
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast({
                title: 'Gagal mencetak',
                description: 'Pastikan pop-up diizinkan pada browser Anda.',
                variant: 'destructive',
            });
            return;
        }

        const badge = (h: HasilStatus) =>
            `<span style="${BADGE_PRINT[h.status]};padding:1px 5px;border-radius:3px;font-weight:bold;font-size:8px;white-space:nowrap">${esc(h.label)}</span>`;

        const rows = baris
            .map(
                ({ k, stnk, pajak }) => `<tr>
          <td><b>${esc(tampil(k.noLambung))}</b></td>
          <td>${esc(tampil(k.merk))}</td>
          <td>${esc(tampil(k.tipe))}</td>
          <td>${esc(tampil(k.jenisAlat))}</td>
          <td>${esc(tampil(k.model))}</td>
          <td>${esc(tampil(k.tahunPembuatan))}</td>
          <td>${esc(formatTgl(k.tglBerlakuStnk))}</td>
          <td>${esc(formatTgl(k.tglBerlakuPajak))}</td>
          <td>${badge(stnk)}</td>
          <td>${badge(pajak)}</td>
        </tr>`
            )
            .join('');

        const waktuCetak = new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

        printWindow.document.open();
        printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <title>Jadwal Perpanjangan Pajak dan STNK</title>
    <style>
      @page { size: A4 landscape; margin: 1cm; }
      body { font-family: Arial, sans-serif; margin: 0; padding: 16px; color: #333; }
      .header { border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
      .company { font-weight: bold; font-size: 14px; }
      .division { font-size: 12px; }
      h1 { text-align: center; font-size: 16px; margin: 8px 0 4px; }
      .meta { text-align: center; font-size: 11px; color: #666; margin-bottom: 4px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
      th { background: #1e293b; color: #fff; text-align: left; padding: 5px; border: 1px solid #999; }
      td { padding: 5px; border: 1px solid #ccc; vertical-align: middle; }
      tr:nth-child(even) td { background: #f9f9f9; }
      .footer { margin-top: 12px; text-align: right; font-size: 11px; color: #666; }
      th, td, span { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="company">PT. REKA UTAMA PERSADA</div>
      <div class="division">Divisi Infrastruktur - Peralatan</div>
    </div>
    <h1>Jadwal Perpanjangan Pajak dan STNK</h1>
    <div class="meta">Status per ${esc(tanggalHariIni)} &middot; Dicetak pada: ${esc(waktuCetak)}</div>
    <div class="meta">STNK (5 tahun) peringatan ${STNK_PERINGATAN_HARI} hari sebelum habis &middot; Pajak (1 tahun) peringatan ${PAJAK_PERINGATAN_HARI} hari sebelum habis</div>
    <table>
      <thead><tr>
        <th>Nomor Polisi</th><th>Merk</th><th>Type</th><th>Jenis</th><th>Model</th>
        <th>Tahun Pembuatan</th><th>Tanggal Berlaku STNK</th><th>Tanggal Berlaku Pajak</th>
        <th>Status STNK (5 th)</th><th>Status Pajak (1 th)</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer">Total Data: ${baris.length}</div>
    <script>
      window.onload = function () {
        setTimeout(function () {
          window.print();
          setTimeout(function () { window.close(); }, 500);
        }, 500);
      };
    </script>
  </body>
</html>`);
        printWindow.document.close();
    }, [baris, toast, tanggalHariIni]);

    /* ----------------------------- RENDER ----------------------------- */
    if (isLoading) {
        return (
            <div className="mx-auto w-full max-w-[1800px] px-4 py-6">
                <div className="flex justify-center items-center h-64 text-lg">Loading...</div>
            </div>
        );
    }

    const totalKolom = 11;

    return (
        <div className="mx-auto w-full max-w-[1800px] px-4 py-6 space-y-3">
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Jadwal Perpanjangan Pajak dan STNK</h1>
                {canPrint && (
                    <Button size="sm" onClick={handlePrint} className="h-8 gap-1 text-xs bg-slate-500 text-white hover:bg-slate-600">
                        <Printer className="h-3.5 w-3.5" />
                        Print
                    </Button>
                )}
            </div>

            <p className="text-xs text-slate-600">
                <b>Status realtime:</b> STNK (perpanjangan 5 tahun) — peringatan {STNK_PERINGATAN_HARI} hari sebelum habis.
                Pajak (perpanjangan 1 tahun) — peringatan {PAJAK_PERINGATAN_HARI} hari sebelum habis.{' '}
                <span className="text-slate-400">Dihitung per {tanggalHariIni}.</span>
            </p>

            <TableScrollWrapper className="border rounded-lg bg-white">
                <Table>
                    <TableHeader className="!bg-slate-900">
                        <TableRow className="!bg-slate-900 hover:!bg-slate-900 border-slate-800">
                            <TableHead className={thClass}>Nomor Polisi</TableHead>
                            <TableHead className={thClass}>Merk</TableHead>
                            <TableHead className={thClass}>Type</TableHead>
                            <TableHead className={thClass}>Jenis</TableHead>
                            <TableHead className={thClass}>Model</TableHead>
                            <TableHead className={thClass}>Tahun Pembuatan</TableHead>
                            <TableHead className={thClass}>Tanggal Berlaku STNK</TableHead>
                            <TableHead className={thClass}>Tanggal Berlaku Pajak</TableHead>
                            <TableHead className={thClass}>Status STNK (5 th)</TableHead>
                            <TableHead className={thClass}>Status Pajak (1 th)</TableHead>
                            <TableHead className={thClass}>Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginateData(baris, currentPage, pageSize).map((row) => (
                            <TableRow key={row.k.id}>
                                <TableCell className={`${tdClass} font-bold whitespace-nowrap`}>{tampil(row.k.noLambung)}</TableCell>
                                <TableCell className={tdClass}>{tampil(row.k.merk)}</TableCell>
                                <TableCell className={`${tdClass} min-w-[150px] whitespace-normal`}>{tampil(row.k.tipe)}</TableCell>
                                <TableCell className={`${tdClass} whitespace-nowrap`}>{tampil(row.k.jenisAlat)}</TableCell>
                                <TableCell className={`${tdClass} min-w-[90px] whitespace-normal`}>{tampil(row.k.model)}</TableCell>
                                <TableCell className={tdClass}>{tampil(row.k.tahunPembuatan)}</TableCell>
                                <TableCell className={`${tdClass} whitespace-nowrap`}>{formatTgl(row.k.tglBerlakuStnk)}</TableCell>
                                <TableCell className={`${tdClass} whitespace-nowrap`}>{formatTgl(row.k.tglBerlakuPajak)}</TableCell>
                                <TableCell className={tdClass}>
                                    <StatusBadge hasil={row.stnk} />
                                </TableCell>
                                <TableCell className={tdClass}>
                                    <StatusBadge hasil={row.pajak} />
                                </TableCell>
                                <TableCell className={tdClass}>
                                    <Button
                                        size="sm"
                                        title="Buka situs resmi Samsat Digital Nasional (SIGNAL) di tab baru"
                                        onClick={() => handlePerpanjangan(row)}
                                        className="h-7 gap-1 px-2 text-xs bg-blue-600 text-white hover:bg-blue-700"
                                    >
                                        Perpanjangan
                                        <ExternalLink className="h-3 w-3" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {baris.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={totalKolom} className="text-center py-4">
                                    Belum ada data kendaraan
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                <SimplePagination
                    currentPage={currentPage}
                    totalPages={getTotalPages(baris.length, pageSize)}
                    onPageChange={setCurrentPage}
                    pageSize={pageSize}
                    onPageSizeChange={(size) => {
                        setPageSize(size);
                        setCurrentPage(1);
                    }}
                    totalItems={baris.length}
                />
            </TableScrollWrapper>
        </div>
    );
}