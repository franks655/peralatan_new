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
import { Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import type { Kendaraan } from '@/types';
import {
  KendaraanFormFields,
  EMPTY_KENDARAAN,
  type KendaraanFormValues,
} from '@/components/Kendaraanformfields';

interface AddKendaraanDialogProps {
  onSubmit: (data: Omit<Kendaraan, 'id'>) => Promise<void> | void;
  className?: string;
}

export function AddKendaraanDialog({ onSubmit, className }: AddKendaraanDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<KendaraanFormValues>(EMPTY_KENDARAAN);

  const patch = (p: Partial<Kendaraan>) => setFormData((prev) => ({ ...prev, ...p }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit(formData);
      toast({
        title: 'Berhasil',
        description: 'Data kendaraan berhasil ditambahkan',
      });
      setOpen(false);
      setFormData(EMPTY_KENDARAAN); // reset form
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast({
        title: 'Gagal',
        description: error?.message || 'Gagal menambahkan data kendaraan.',
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
          Tambah
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Tambah Kendaraan Baru</DialogTitle>
            <DialogDescription>
              Form untuk menambahkan data kendaraan baru ke dalam sistem
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <KendaraanFormFields value={formData} onChange={patch} idPrefix="add-kdr" />
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