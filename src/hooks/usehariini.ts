import { useEffect, useState } from 'react';

const awalHariIni = (): Date => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Mengembalikan tanggal hari ini (jam 00:00) dan otomatis berganti saat
 * tengah malam terlewat, atau saat tab kembali aktif / difokuskan.
 * Dipakai supaya status STNK/Pajak berubah tanpa perlu refresh halaman.
 */
export function useHariIni(): Date {
    const [hariIni, setHariIni] = useState<Date>(awalHariIni);

    useEffect(() => {
        const cek = () =>
            setHariIni((prev) => {
                const sekarang = awalHariIni();
                return sekarang.getTime() === prev.getTime() ? prev : sekarang;
            });

        const id = window.setInterval(cek, 60_000); // cek tiap 1 menit
        window.addEventListener('focus', cek);
        document.addEventListener('visibilitychange', cek);

        return () => {
            window.clearInterval(id);
            window.removeEventListener('focus', cek);
            document.removeEventListener('visibilitychange', cek);
        };
    }, []);

    return hariIni;
}