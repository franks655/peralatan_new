import type { Kendaraan } from '@/types';

/* ------------------------------------------------------------------ */
/* Konfigurasi                                                         */
/* ------------------------------------------------------------------ */

/** STNK berlaku 5 tahun: mulai "Akan Berakhir" 90 hari sebelum habis */
export const STNK_PERINGATAN_HARI = 90;
/** Pajak (PKB) berlaku 1 tahun: mulai "Akan Berakhir" 30 hari sebelum habis */
export const PAJAK_PERINGATAN_HARI = 30;

/**
 * Situs resmi Samsat Digital Nasional (SIGNAL) - Korlantas Polri.
 * Ganti di sini bila alamat resmi berubah.
 */
export const URL_SIGNAL = 'https://samsatdigital.id';

/* ------------------------------------------------------------------ */
/* Status dokumen                                                      */
/* ------------------------------------------------------------------ */

export type StatusDokumen = 'berlaku' | 'akan-berakhir' | 'perlu-perpanjangan' | 'belum-diisi';

export interface HasilStatus {
    status: StatusDokumen;
    label: string;
    /** Selisih hari ke tanggal berlaku (negatif = sudah lewat). null bila tanggal kosong. */
    sisaHari: number | null;
    /** Teks pendek untuk tooltip, mis. "Sisa 34 hari" */
    keterangan: string;
}

const MS_PER_HARI = 86_400_000;

/** Nomor hari (UTC) dari komponen tanggal - aman dari pergeseran zona waktu/DST */
const nomorHari = (y: number, m: number, d: number): number =>
    Math.floor(Date.UTC(y, m - 1, d) / MS_PER_HARI);

/** Baca 'YYYY-MM-DD' (atau ISO yang diawali itu) tanpa konversi zona waktu */
const bacaTanggal = (v?: string | null): { y: number; m: number; d: number } | null => {
    const match = String(v ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
};

const LABEL: Record<StatusDokumen, string> = {
    berlaku: 'Berlaku',
    'akan-berakhir': 'Akan Berakhir',
    'perlu-perpanjangan': 'Perlu Perpanjangan',
    'belum-diisi': 'Belum Diisi',
};

/**
 * Hitung status sebuah masa berlaku terhadap hari ini.
 *  - sisa < 0                 -> Perlu Perpanjangan (sudah lewat)
 *  - 0 <= sisa <= batas       -> Akan Berakhir
 *  - sisa > batas             -> Berlaku
 *  - tanggal kosong           -> Belum Diisi
 */
export function hitungStatus(
    tanggalBerlaku: string | null | undefined,
    batasPeringatanHari: number,
    hariIni: Date = new Date()
): HasilStatus {
    const t = bacaTanggal(tanggalBerlaku);
    if (!t) {
        return { status: 'belum-diisi', label: LABEL['belum-diisi'], sisaHari: null, keterangan: 'Tanggal belum diisi' };
    }

    const sisaHari =
        nomorHari(t.y, t.m, t.d) -
        nomorHari(hariIni.getFullYear(), hariIni.getMonth() + 1, hariIni.getDate());

    const status: StatusDokumen =
        sisaHari < 0 ? 'perlu-perpanjangan' : sisaHari <= batasPeringatanHari ? 'akan-berakhir' : 'berlaku';

    const keterangan =
        sisaHari < 0 ? `Lewat ${Math.abs(sisaHari)} hari` : sisaHari === 0 ? 'Berakhir hari ini' : `Sisa ${sisaHari} hari`;

    return { status, label: LABEL[status], sisaHari, keterangan };
}

export const perluTindakan = (s: StatusDokumen): boolean =>
    s === 'akan-berakhir' || s === 'perlu-perpanjangan';

/* ------------------------------------------------------------------ */
/* Aksi "Perpanjangan"                                                 */
/* ------------------------------------------------------------------ */

export interface PetunjukPerpanjangan {
    url: string;
    title: string;
    description: string;
}

/**
 * Susun tujuan & petunjuk saat tombol Perpanjangan diklik.
 *
 * Fakta layanan resmi:
 *  - Pajak/pengesahan STNK TAHUNAN bisa online lewat SIGNAL (samsatdigital.id).
 *  - Perpanjangan STNK 5 TAHUNAN (cek fisik + ganti plat) TIDAK bisa online,
 *    wajib datang ke kantor Samsat.
 */
export function petunjukPerpanjangan(
    k: Pick<Kendaraan, 'noLambung' | 'nomorRangka'>,
    statusStnk: StatusDokumen,
    statusPajak: StatusDokumen
): PetunjukPerpanjangan {
    const nopol = k.noLambung?.trim() || '-';
    const rangka5 = (k.nomorRangka ?? '').replace(/\s+/g, '').slice(-5);
    const butuhStnk = perluTindakan(statusStnk);
    const butuhPajak = perluTindakan(statusPajak);

    const baris: string[] = [];

    if (butuhStnk) {
        baris.push(
            'STNK 5 tahunan tidak bisa diproses online: datang ke kantor Samsat untuk cek fisik dan ganti plat. ' +
            'Bawa STNK, BPKB, dan KTP asli pemilik.'
        );
    }

    if (butuhPajak || !butuhStnk) {
        baris.push(
            `Pajak/pengesahan tahunan diproses lewat SIGNAL. Siapkan NRKB ${nopol}` +
            (rangka5 ? ` dan 5 digit terakhir nomor rangka ${rangka5}.` : ' dan 5 digit terakhir nomor rangka.')
        );
    }

    return {
        url: URL_SIGNAL,
        title: `Membuka Samsat Digital Nasional (${nopol})`,
        description: baris.join(' '),
    };
}