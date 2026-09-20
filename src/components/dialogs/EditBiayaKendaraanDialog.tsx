import { useState, FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import type { BiayaKendaraan, Kendaraan } from '@/types';

interface EditBiayaKendaraanDialogProps {
  biaya: BiayaKendaraan;
  onSubmit: (data: BiayaKendaraan) => Promise<void> | void;
  daftarKendaraan: Kendaraan[];
}

const PREDEFINED_CATEGORIES = ['E-toll', 'Biaya Pemakaian BBM', 'Biaya Perbaikan'];

export function EditBiayaKendaraanDialog({ biaya, onSubmit, daftarKendaraan }: EditBiayaKendaraanDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(
    !PREDEFINED_CATEGORIES.includes(biaya.jenisPerawatan || '')
  );
  const [formData, setFormData] = useState({
    id: biaya.id,
    noLambung: biaya.noLambung,
    tanggal: biaya.tanggal,
    jenisPerawatan: biaya.jenisPerawatan || '',
    namaBarangJasa: biaya.namaBarangJasa,
    volume: biaya.volume,
    satuan: biaya.satuan || '',
    hargaSatuan: biaya.hargaSatuan,
    tempat: biaya.tempat || '',
    keterangan: biaya.keterangan || '',
    gerbangMasuk: biaya.gerbangMasuk || '',
    gerbangKeluar: biaya.gerbangKeluar || '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // For custom categories, use jenisPerawatan as namaBarangJasa
      const submitData = isCustomCategory 
        ? { ...formData, namaBarangJasa: formData.jenisPerawatan }
        : formData;
      
      await onSubmit(submitData as BiayaKendaraan);
      toast({
        title: 'Berhasil',
        description: 'Data biaya kendaraan berhasil diupdate',
      });
      setOpen(false);
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast({
        title: 'Gagal',
        description: error?.message || 'Gagal mengupdate data biaya kendaraan.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs">
          <Edit className="h-3 w-3" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Biaya Kendaraan</DialogTitle>
            <DialogDescription>
              Form untuk mengedit data pengeluaran biaya kendaraan
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nomor Polisi *</label>
                <select
                  required
                  value={formData.noLambung}
                  onChange={(e) => setFormData({ ...formData, noLambung: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Pilih Kendaraan</option>
                  {daftarKendaraan.map((k) => (
                    <option key={k.id} value={k.noLambung || ''}>
                      {k.noLambung || 'Tanpa Plat'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tanggal *</label>
                <input
                  type="date"
                  required
                  value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Jenis Perawatan</label>
              <select
                value={isCustomCategory ? 'custom' : (formData.jenisPerawatan || '')}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'custom') {
                    setIsCustomCategory(true);
                    setFormData({ ...formData, jenisPerawatan: '', namaBarangJasa: '' });
                  } else {
                    setIsCustomCategory(false);
                    setFormData({ ...formData, jenisPerawatan: value, namaBarangJasa: value });
                  }
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Pilih Kategori</option>
                {PREDEFINED_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="custom">Lainnya (Input Bebas)</option>
              </select>
              {isCustomCategory && (
                <input
                  type="text"
                  value={formData.jenisPerawatan}
                  onChange={(e) => setFormData({ ...formData, jenisPerawatan: e.target.value })}
                  placeholder="Masukkan kategori custom"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Barang/Jasa *</label>
              <input
                type="text"
                required
                value={formData.namaBarangJasa}
                onChange={(e) => setFormData({ ...formData, namaBarangJasa: e.target.value })}
                placeholder="Contoh: Oli mesin 10W-40, Ban depan, Solar, dll"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!isCustomCategory && PREDEFINED_CATEGORIES.includes(formData.jenisPerawatan || '')}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Volume *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={formData.volume}
                  onChange={(e) => setFormData({ ...formData, volume: parseFloat(e.target.value) || 0 })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Satuan</label>
                <input
                  type="text"
                  value={formData.satuan}
                  onChange={(e) => setFormData({ ...formData, satuan: e.target.value })}
                  placeholder="Liter, Unit, Buah, dll"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Harga Satuan *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.hargaSatuan}
                  onChange={(e) => setFormData({ ...formData, hargaSatuan: parseFloat(e.target.value) || 0 })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-md">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total:</span>
                <span className="text-lg font-bold">
                  Rp {(formData.volume * formData.hargaSatuan).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tempat</label>
              <input
                type="text"
                value={formData.tempat}
                onChange={(e) => setFormData({ ...formData, tempat: e.target.value })}
                placeholder="Contoh: Bengkel resmi, SPBU, dll"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {formData.jenisPerawatan === 'E-toll' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Gerbang Masuk *</label>
                    <input
                      type="text"
                      value={formData.gerbangMasuk}
                      onChange={(e) => setFormData({ ...formData, gerbangMasuk: e.target.value })}
                      placeholder="Contoh: Cikarang Utama"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Gerbang Keluar *</label>
                    <input
                      type="text"
                      value={formData.gerbangKeluar}
                      onChange={(e) => setFormData({ ...formData, gerbangKeluar: e.target.value })}
                      placeholder="Contoh: Cikampek Utama"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Keterangan</label>
              <textarea
                value={formData.keterangan}
                onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                placeholder="Catatan tambahan..."
                rows={3}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
