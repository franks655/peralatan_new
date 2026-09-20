import { useState, useRef, useEffect, useMemo } from 'react';
import { useLokasiProyek } from '@/hooks/useLokasiProyek';
import { ChevronDown, X } from 'lucide-react';

interface ComboboxLokasiProyekProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

/**
 * Combobox for Lokasi Proyek:
 * - Mengambil daftar proyek dari tabel lokasi_proyek
 * - Menampilkan namaProyek + lokasi sebagai pilihan
 * - Mendukung pencarian real-time (by nama proyek, lokasi, kepala proyek)
 * - Mendukung free-text input (teks manual tetap valid)
 */
export function ComboboxLokasiProyek({
  value,
  onChange,
  placeholder = 'Ketik atau pilih lokasi proyek...',
  required,
  className = '',
}: ComboboxLokasiProyekProps) {
  const { data: proyekList = [], isLoading } = useLokasiProyek();

  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value changes (e.g. when editing form re-opens)
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter proyek based on search input
  const filtered = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return proyekList;
    return proyekList.filter(
      (p) =>
        (p.namaProyek || '').toLowerCase().includes(q) ||
        (p.lokasi || '').toLowerCase().includes(q) ||
        (p.kepalaProyek || '').toLowerCase().includes(q)
    );
  }, [proyekList, inputValue]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputValue(v);
    onChange(v); // free text allowed
    setOpen(true);
  };

  const handleSelect = (namaProyek: string) => {
    setInputValue(namaProyek);
    onChange(namaProyek);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
    inputRef.current?.focus();
    setOpen(true);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm pr-14 transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={inputValue}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          placeholder={isLoading ? 'Memuat data proyek...' : placeholder}
          required={required}
          autoComplete="off"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-1 gap-0.5">
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => { setOpen((o) => !o); inputRef.current?.focus(); }}
            className="p-1 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-sm text-gray-500 italic">
              {isLoading ? 'Memuat...' : inputValue ? `Tidak ada proyek yang cocok. Teks "${inputValue}" akan disimpan.` : 'Belum ada data proyek.'}
            </div>
          ) : (
            <>
              <div className="px-3 py-1 text-xs font-semibold text-gray-500 bg-gray-50 sticky top-0 border-b">
                Daftar Proyek ({filtered.length})
              </div>
              {filtered.map((proyek) => (
                <button
                  key={proyek.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(proyek.namaProyek)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors border-b last:border-b-0 ${
                    proyek.namaProyek === inputValue ? 'bg-blue-50 font-medium text-blue-700' : ''
                  }`}
                >
                  <div className="font-medium">{proyek.namaProyek}</div>
                  {proyek.lokasi && (
                    <div className="text-xs text-gray-400 mt-0.5">📍 {proyek.lokasi}</div>
                  )}
                  {proyek.kepalaProyek && (
                    <div className="text-xs text-gray-400">👤 {proyek.kepalaProyek}</div>
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
