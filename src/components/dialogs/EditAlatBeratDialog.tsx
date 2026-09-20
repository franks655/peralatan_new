
import { useState, useEffect } from 'react';
import { ComboboxLokasiProyek } from '@/components/ComboboxLokasiProyek';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from "@/components/ui/use-toast";
import type { AlatBerat } from '@/types';
import { formatDateForInput, normalizeDateOnly } from '@/utils/dateUtils';
import { MultiFotoUploader } from '@/components/ui/MultiFotoUploader';
import { serializeFotoList } from '@/utils/fotoUtils';

interface EditAlatBeratDialogProps {
  alatBerat: AlatBerat;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AlatBerat) => Promise<void> | void;
}

export function EditAlatBeratDialog({ alatBerat, open, onOpenChange, onSubmit }: EditAlatBeratDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<AlatBerat>(alatBerat);

  useEffect(() => {
    setFormData({
      ...alatBerat,
      lokasi: alatBerat.lokasi_saat_ini || alatBerat.lokasi || '',
      lokasi_saat_ini: alatBerat.lokasi_saat_ini || alatBerat.lokasi || '',
      lokasi_sebelum: alatBerat.lokasi_sebelum || (alatBerat as any).lokasi_sebelumnya || '',
      kepemilikan: alatBerat.kepemilikan || '',
      serviceTerakhir: formatDateForInput(alatBerat.serviceTerakhir),
      serviceBerikutnya: formatDateForInput(alatBerat.serviceBerikutnya),
      harga_sewa: alatBerat.harga_sewa || undefined,
    });
  }, [alatBerat]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi field yang wajib diisi
    const missingFields = [];
    if (!formData.no_lambung?.trim()) missingFields.push('No. Lambung');
    if (!formData.nama_alat?.trim()) missingFields.push('Nama Alat');
    if (!formData.merk?.trim()) missingFields.push('Merk');
    if (!formData.tipe?.trim()) missingFields.push('Tipe');
    if (!formData.lokasi_saat_ini?.trim() && !formData.lokasi?.trim()) missingFields.push('Lokasi Saat Ini');
    if (!formData.kondisi?.trim()) missingFields.push('Kondisi');
    if (!formData.status?.trim()) missingFields.push('Status');

    if (missingFields.length > 0) {
      toast({
        title: "Peringatan: Data Belum Lengkap",
        description: `Harap lengkapi field berikut sebelum menyimpan: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit({
        ...formData,
        lokasi: formData.lokasi_saat_ini || formData.lokasi,
        lokasi_saat_ini: formData.lokasi_saat_ini || formData.lokasi,
        lokasi_sebelum: formData.lokasi_sebelum,
        kepemilikan: formData.kepemilikan,
        serviceTerakhir: normalizeDateOnly(formData.serviceTerakhir) || undefined,
        serviceBerikutnya: normalizeDateOnly(formData.serviceBerikutnya) || undefined,
      });
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Alat Berat</DialogTitle>
        </DialogHeader>
        <div className="sr-only" id="edit-form-description">
          Form untuk mengubah data alat berat
        </div>
        <form onSubmit={handleSubmit} className="space-y-4" aria-describedby="edit-form-description">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="no_lambung">No. Lambung</Label>
              <Input
                id="no_lambung"
                value={formData.no_lambung || ''}
                onChange={(e) => setFormData({ ...formData, no_lambung: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nama_alat">Nama Alat</Label>
              <Input
                id="nama_alat"
                value={formData.nama_alat || ''}
                onChange={(e) => setFormData({ ...formData, nama_alat: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="merk">Merk</Label>
              <Input
                id="merk"
                value={formData.merk || ''}
                onChange={(e) => setFormData({ ...formData, merk: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipe">Tipe</Label>
              <Input
                id="tipe"
                value={formData.tipe || ''}
                onChange={(e) => setFormData({ ...formData, tipe: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="noSeri">No. Seri</Label>
              <Input
                id="noSeri"
                type="text"
                value={formData.noSeri || ''}
                onChange={(e) => setFormData({ ...formData, noSeri: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tahun_perolehan">Tahun</Label>
              <Input
                id="tahun_perolehan"
                type="number"
                value={formData.tahun_perolehan || ''}
                onChange={(e) => setFormData({ ...formData, tahun_perolehan: parseInt(e.target.value) || undefined })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lokasi_saat_ini">Lokasi Saat Ini <span className="text-red-500">*</span></Label>
              <ComboboxLokasiProyek
                value={formData.lokasi_saat_ini || formData.lokasi || ''}
                onChange={(v) => setFormData({ ...formData, lokasi_saat_ini: v, lokasi: v })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lokasi_sebelum">Lokasi Sebelumnya</Label>
              <ComboboxLokasiProyek
                value={formData.lokasi_sebelum || ''}
                onChange={(v) => setFormData({ ...formData, lokasi_sebelum: v })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="kepemilikan">Kepemilikan</Label>
              <Input
                id="kepemilikan"
                list="edit-kepemilikan-options"
                value={formData.kepemilikan || ''}
                onChange={(e) => setFormData({ ...formData, kepemilikan: e.target.value })}
                placeholder="Milik Sendiri / Sewa / dll"
              />
              <datalist id="edit-kepemilikan-options">
                <option value="Milik Sendiri" />
                <option value="Sewa" />
                <option value="Vendor" />
                <option value="Rekanan" />
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="kondisi">Kondisi</Label>
              <Select
                value={formData.kondisi || ''}
                onValueChange={(value) => setFormData({ ...formData, kondisi: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baik">Baik</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Rusak">Rusak</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serviceTerakhir">Service Terakhir</Label>
              <Input
                id="serviceTerakhir"
                type="date"
                value={formData.serviceTerakhir || ''}
                onChange={(e) => setFormData({ ...formData, serviceTerakhir: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceBerikutnya">Service Berikutnya</Label>
              <Input
                id="serviceBerikutnya"
                type="date"
                value={formData.serviceBerikutnya || ''}
                onChange={(e) => setFormData({ ...formData, serviceBerikutnya: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="harga_sewa">Harga Sewa (Rp)</Label>
            <Input
              id="harga_sewa"
              type="number"
              value={formData.harga_sewa || ''}
              onChange={(e) => setFormData({ ...formData, harga_sewa: e.target.value ? parseFloat(e.target.value) : undefined })}
              placeholder="0.00"
              step="0.01"
            />
            <p className="text-xs text-muted-foreground">Harga sewa per unit (isi jika alat disewa)</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status || 'aktif'}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="non-aktif">Non-Aktif</SelectItem>
                  <SelectItem value="sedang digunakan">Sedang Digunakan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="keterangan">Keterangan</Label>
              <Input
                id="keterangan"
                value={formData.keterangan || ''}
                onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
              />
            </div>
          </div>

          {/* Upload 5 Foto */}
          <div className="pt-2 border-t border-slate-100">
            <MultiFotoUploader
              value={formData.foto}
              onChange={(fotos) => setFormData(prev => ({ ...prev, foto: serializeFotoList(fotos) || '' }))}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
