import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Edit } from 'lucide-react';
import type { LokasiProyek } from '@/types';
import { formatDateForInput, normalizeDateOnly } from '@/utils/dateUtils';
import { useToast } from '@/components/ui/use-toast';

interface EditLokasiProyekDialogProps {
  proyek: LokasiProyek;
  onSubmit: (data: LokasiProyek) => Promise<void> | void;
}

export function EditLokasiProyekDialog({ proyek, onSubmit }: EditLokasiProyekDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<LokasiProyek>({
    ...proyek,
    tanggalMulaiProyek: formatDateForInput(proyek.tanggalMulaiProyek),
  });

  useEffect(() => {
    setFormData({
      ...proyek,
      tanggalMulaiProyek: formatDateForInput(proyek.tanggalMulaiProyek),
    });
  }, [proyek]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaProyek.trim()) {
      toast({
        title: 'Validasi Gagal',
        description: 'Nama Proyek wajib diisi',
        variant: 'destructive',
      });
      return;
    }
    if (!formData.lokasi.trim()) {
      toast({
        title: 'Validasi Gagal',
        description: 'Lokasi Proyek wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit({
        ...formData,
        tanggalMulaiProyek: normalizeDateOnly(formData.tanggalMulaiProyek) || null,
      });
      setOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Edit Proyek">
          <Edit className="h-4 w-4 text-blue-600" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Lokasi Proyek</DialogTitle>
          <DialogDescription>
            Perbarui data lokasi proyek
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-namaProyek">Nama Proyek <span className="text-red-500">*</span></Label>
            <Input
              id="edit-namaProyek"
              value={formData.namaProyek}
              onChange={(e) => setFormData({ ...formData, namaProyek: e.target.value })}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-lokasi">Lokasi Proyek <span className="text-red-500">*</span></Label>
            <Input
              id="edit-lokasi"
              value={formData.lokasi}
              onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-tanggalMulaiProyek">Tanggal Mulai Proyek</Label>
              <Input
                id="edit-tanggalMulaiProyek"
                type="date"
                value={formData.tanggalMulaiProyek || ''}
                onChange={(e) => setFormData({ ...formData, tanggalMulaiProyek: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-kepalaProyek">Kepala Proyek</Label>
              <Input
                id="edit-kepalaProyek"
                value={formData.kepalaProyek || ''}
                onChange={(e) => setFormData({ ...formData, kepalaProyek: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-status">Status Proyek</Label>
              <Select
                value={formData.status || 'aktif'}
                onValueChange={(val) => setFormData({ ...formData, status: val })}
              >
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktif">Aktif / Berjalan</SelectItem>
                  <SelectItem value="selesai">Selesai</SelectItem>
                  <SelectItem value="ditunda">Ditunda</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-keterangan">Keterangan</Label>
            <Textarea
              id="edit-keterangan"
              value={formData.keterangan || ''}
              onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
