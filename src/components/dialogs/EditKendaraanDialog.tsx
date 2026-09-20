import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Edit } from 'lucide-react';
import type { Kendaraan } from '@/types';
import { formatDateForInput, normalizeDateOnly } from '@/utils/dateUtils';
import { KendaraanFormFields } from '@/components/Kendaraanformfields';

interface EditKendaraanDialogProps {
  kendaraan: Kendaraan;
  onSubmit: (data: Kendaraan) => Promise<void> | void;
}

/** Ubah data dari DB menjadi nilai yang cocok untuk form (tanggal -> yyyy-mm-dd) */
const toForm = (k: Kendaraan): Kendaraan => ({
  ...k,
  serviceTerakhir: formatDateForInput(k.serviceTerakhir),
  serviceBerikutnya: formatDateForInput(k.serviceBerikutnya),
  tglBerlakuStnk: formatDateForInput(k.tglBerlakuStnk),
  tglBerlakuPajak: formatDateForInput(k.tglBerlakuPajak),
  foto: k.foto || '',
});

export function EditKendaraanDialog({ kendaraan, onSubmit }: EditKendaraanDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Kendaraan>(() => toForm(kendaraan));

  useEffect(() => {
    setFormData(toForm(kendaraan));
  }, [kendaraan]);

  const patch = (p: Partial<Kendaraan>) => setFormData((prev) => ({ ...prev, ...p }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit({
        ...formData,
        serviceTerakhir: normalizeDateOnly(formData.serviceTerakhir) || null,
        serviceBerikutnya: normalizeDateOnly(formData.serviceBerikutnya) || null,
        tglBerlakuStnk: normalizeDateOnly(formData.tglBerlakuStnk) || null,
        tglBerlakuPajak: normalizeDateOnly(formData.tglBerlakuPajak) || null,
      });
      setOpen(false);
    } catch {
      // Toast error sudah ditampilkan oleh handler di halaman; dialog tetap terbuka.
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          title="Edit"
          className="h-7 gap-1 px-2 text-xs bg-amber-400 text-black hover:bg-amber-500"
        >
          <Edit className="h-3 w-3" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle id="edit-kendaraan-title">Edit Kendaraan</DialogTitle>
          <DialogDescription id="edit-kendaraan-description">
            Edit data kendaraan
          </DialogDescription>
        </DialogHeader>
        <div role="document" aria-labelledby="edit-kendaraan-title" aria-describedby="edit-kendaraan-description">
          <form onSubmit={handleSubmit} className="space-y-4">
            <KendaraanFormFields value={formData} onChange={patch} idPrefix="edit-kdr" />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                Batal
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}