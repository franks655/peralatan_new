import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, MapPin, Calendar, User, Info, FileText } from 'lucide-react';
import type { LokasiProyek } from '@/types';
import { formatDateDisplay } from '@/utils/dateUtils';

interface ViewLokasiProyekDialogProps {
  proyek: LokasiProyek;
}

export function ViewLokasiProyekDialog({ proyek }: ViewLokasiProyekDialogProps) {
  const getStatusBadge = (status: string | null | undefined) => {
    switch (status?.toLowerCase()) {
      case 'aktif':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">Aktif</span>;
      case 'selesai':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">Selesai</span>;
      case 'ditunda':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">Ditunda</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-300">Aktif</span>;
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Lihat Detail Proyek">
          <Eye className="h-4 w-4 text-slate-600" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-blue-600" />
            Detail Lokasi Proyek
          </DialogTitle>
          <DialogDescription>
            Informasi lengkap data proyek
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Nama Proyek</label>
            <p className="text-base font-bold text-slate-800 mt-0.5">{proyek.namaProyek}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                Lokasi
              </div>
              <p className="text-sm font-semibold text-slate-700 mt-1">{proyek.lokasi || '-'}</p>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Mulai Proyek
              </div>
              <p className="text-sm font-semibold text-slate-700 mt-1">
                {proyek.tanggalMulaiProyek ? formatDateDisplay(proyek.tanggalMulaiProyek) : '-'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                <User className="h-3.5 w-3.5 text-slate-400" />
                Kepala Proyek
              </div>
              <p className="text-sm font-semibold text-slate-700 mt-1">{proyek.kepalaProyek || '-'}</p>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                <Info className="h-3.5 w-3.5 text-slate-400" />
                Status
              </div>
              <div className="mt-1">{getStatusBadge(proyek.status)}</div>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              Keterangan
            </div>
            <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{proyek.keterangan || '-'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
