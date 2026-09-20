import { useState, FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import type { LokasiProyek } from '@/types';

interface AddLokasiProyekDialogProps {
  onSubmit: (data: Omit<LokasiProyek, 'id'>) => Promise<void> | void;
  className?: string;
}

export function AddLokasiProyekDialog({ onSubmit, className }: AddLokasiProyekDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Omit<LokasiProyek, 'id'>>({
    namaProyek: '',
    lokasi: '',
    tanggalMulaiProyek: '',
    kepalaProyek: '',
    keterangan: '',
    status: 'aktif',
  });

  const handleSubmit = async (e: FormEvent) => {
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
      await onSubmit(formData);
      toast({
        title: 'Berhasil',
        description: 'Data lokasi proyek berhasil ditambahkan',
      });
      setOpen(false);
      setFormData({
        namaProyek: '',
        lokasi: '',
        tanggalMulaiProyek: '',
        kepalaProyek: '',
        keterangan: '',
        status: 'aktif',
      });
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast({
        title: 'Gagal',
        description: error?.message || 'Gagal menambahkan data lokasi proyek.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={className}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Proyek
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Tambah Lokasi Proyek Baru</DialogTitle>
            <DialogDescription>
              Form untuk menambahkan data lokasi proyek baru
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="namaProyek">Nama Proyek <span className="text-red-500">*</span></Label>
              <Input
                id="namaProyek"
                placeholder="Contoh: Pembangunan Jembatan Tol Cipali"
                value={formData.namaProyek}
                onChange={(e) => setFormData({ ...formData, namaProyek: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lokasi">Lokasi Proyek <span className="text-red-500">*</span></Label>
              <Input
                id="lokasi"
                placeholder="Contoh: Subang, Jawa Barat"
                value={formData.lokasi}
                onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tanggalMulaiProyek">Tanggal Mulai Proyek</Label>
                <Input
                  id="tanggalMulaiProyek"
                  type="date"
                  value={formData.tanggalMulaiProyek || ''}
                  onChange={(e) => setFormData({ ...formData, tanggalMulaiProyek: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="kepalaProyek">Kepala Proyek (Project Manager)</Label>
                <Input
                  id="kepalaProyek"
                  placeholder="Nama Kepala Proyek"
                  value={formData.kepalaProyek || ''}
                  onChange={(e) => setFormData({ ...formData, kepalaProyek: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Status Proyek</Label>
                <Select
                  value={formData.status || 'aktif'}
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Pilih status" />
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
              <Label htmlFor="keterangan">Keterangan Tambahan</Label>
              <Textarea
                id="keterangan"
                placeholder="Catatan atau keterangan mengenai proyek..."
                value={formData.keterangan || ''}
                onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
