import React, { useRef } from 'react';
import { Upload, X, Camera } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { SLOT_LABELS, parseFotoList } from '@/utils/fotoUtils';

interface MultiFotoUploaderProps {
  value: string | string[] | null | undefined;
  onChange: (value: string[]) => void;
  maxPhotos?: number;
}

/**
 * MultiFotoUploader — Komponen Grid Slot 5 Foto untuk Form Tambah/Edit Alat
 */
export const MultiFotoUploader: React.FC<MultiFotoUploaderProps> = ({
  value,
  onChange,
  maxPhotos = 5,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeSlotRef = useRef<number | null>(null);

  const fotoList = parseFotoList(value);

  // Resize image dan convert ke Base64
  const resizeImage = (file: File, maxWidth: number = 800, maxHeight: number = 600, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      
      reader.onerror = reject;
      reader.readAsDataURL(file);
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to compressed Base64
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      
      img.onerror = reject;
    });
  };

  // Mengubah file gambar ke Base64 dengan resize
  const processFiles = (files: FileList | File[], slotIndex?: number | null) => {
    const validFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Format Salah',
          description: `File "${file.name}" harus berupa gambar`,
          variant: 'destructive',
        });
        continue;
      }
      if (file.size > 8 * 1024 * 1024) {
        toast({
          title: 'Ukuran Terlalu Besar',
          description: `Ukuran file "${file.name}" maksimal 8MB`,
          variant: 'destructive',
        });
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    let updated = [...fotoList];

    // Jika memilih untuk 1 slot spesifik
    if (slotIndex !== null && slotIndex !== undefined && validFiles.length === 1) {
      resizeImage(validFiles[0])
        .then((resizedDataUrl) => {
          updated[slotIndex] = resizedDataUrl;
          onChange(updated);
        })
        .catch((error) => {
          console.error('Error resizing image:', error);
          toast({
            title: 'Error',
            description: 'Gagal memproses gambar',
            variant: 'destructive',
          });
        });
      return;
    }

    // Jika memilih multiple files sekaligus
    let loadedCount = 0;
    const tempResults: { index: number; data: string }[] = [];

    validFiles.forEach((file, idx) => {
      const targetIndex = slotIndex !== null && slotIndex !== undefined ? slotIndex + idx : updated.length + idx;
      if (targetIndex >= maxPhotos) return;

      resizeImage(file)
        .then((resizedDataUrl) => {
          tempResults.push({ index: targetIndex, data: resizedDataUrl });
          loadedCount++;
          if (loadedCount === Math.min(validFiles.length, maxPhotos - (slotIndex || updated.length))) {
            tempResults.sort((a, b) => a.index - b.index);
            tempResults.forEach(res => {
              updated[res.index] = res.data;
            });
            onChange(updated);
          }
        })
        .catch((error) => {
          console.error('Error resizing image:', error);
        });
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    processFiles(e.target.files, activeSlotRef.current);
    if (fileInputRef.current) fileInputRef.current.value = '';
    activeSlotRef.current = null;
  };

  const triggerUploadSlot = (slotIdx: number) => {
    activeSlotRef.current = slotIdx;
    if (fileInputRef.current) {
      fileInputRef.current.multiple = false;
      fileInputRef.current.click();
    }
  };

  const triggerUploadMultiple = () => {
    activeSlotRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.multiple = true;
      fileInputRef.current.click();
    }
  };

  const removeSlot = (slotIdx: number) => {
    const updated = fotoList.filter((_, idx) => idx !== slotIdx);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header & Button Multi-Select */}
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <Camera className="h-4 w-4 text-blue-600" />
          <span>Foto Alat (Maksimal 5 Foto)</span>
        </div>
        <button
          type="button"
          onClick={triggerUploadMultiple}
          className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-md transition-all cursor-pointer"
        >
          <Upload className="h-3 w-3" />
          <span>Upload Banyak Foto</span>
        </button>
      </div>

      {/* 5-Slot Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {Array.from({ length: maxPhotos }).map((_, slotIdx) => {
          const photoUrl = fotoList[slotIdx];
          const label = SLOT_LABELS[slotIdx] || `Foto ${slotIdx + 1}`;

          return (
            <div
              key={slotIdx}
              className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-1 text-center transition-all h-28 ${
                photoUrl
                  ? 'border-blue-300 bg-blue-50/20'
                  : 'border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/30'
              }`}
            >
              {photoUrl ? (
                <>
                  {/* Image Preview */}
                  <img
                    src={photoUrl}
                    alt={label}
                    className="h-20 w-full object-cover rounded-md border border-slate-200"
                  />
                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSlot(slotIdx);
                    }}
                    className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1 shadow-md transition-all cursor-pointer z-10"
                    title={`Hapus ${label}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                  {/* Change Button */}
                  <button
                    type="button"
                    onClick={() => triggerUploadSlot(slotIdx)}
                    className="absolute bottom-1 right-1 bg-black/60 hover:bg-blue-600 text-white text-[9px] font-medium px-1.5 py-0.5 rounded shadow backdrop-blur-sm cursor-pointer"
                  >
                    Ganti
                  </button>
                </>
              ) : (
                /* Empty Upload Slot */
                <button
                  type="button"
                  onClick={() => triggerUploadSlot(slotIdx)}
                  className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-blue-600 cursor-pointer"
                >
                  <Upload className="h-4 w-4" />
                  <span className="text-[10px] font-medium leading-tight px-1 line-clamp-2">
                    + {label}
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-slate-400">
        Klik slot foto untuk memilih gambar, atau gunakan tombol &quot;Upload Banyak Foto&quot; untuk memilih beberapa foto sekaligus.
      </p>
    </div>
  );
};
