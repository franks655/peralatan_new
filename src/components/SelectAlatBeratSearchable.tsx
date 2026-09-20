import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import type { AlatBerat } from '@/types';

interface SelectAlatBeratSearchableProps {
  value: string;
  onChange: (value: string) => void;
  alatBeratData: AlatBerat[];
  placeholder?: string;
}

export function SelectAlatBeratSearchable({ 
  value, 
  onChange, 
  alatBeratData, 
  placeholder = "-- Pilih Alat --" 
}: SelectAlatBeratSearchableProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Group alat by jenis_alat
  const groupedAlat = alatBeratData.reduce((groups, alat) => {
    const jenis = alat.jenis_alat || 'Lainnya';
    if (!groups[jenis]) {
      groups[jenis] = [];
    }
    groups[jenis].push(alat);
    return groups;
  }, {} as Record<string, AlatBerat[]>);

  // Filter alat based on search query
  const filteredGroups = Object.entries(groupedAlat).reduce((acc, [jenis, alats]) => {
    const filtered = alats.filter(alat => 
      alat.no_lambung.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alat.nama_alat.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[jenis] = filtered;
    }
    return acc;
  }, {} as Record<string, AlatBerat[]>);

  const selectedAlat = alatBeratData.find(a => a.id === value);

  return (
    <div className="space-y-2">
      <Label htmlFor="alat-search">Pilih Alat</Label>
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start text-left"
          onClick={() => setIsOpen(!isOpen)}
        >
          {selectedAlat ? (
            <span>{selectedAlat.no_lambung} - {selectedAlat.nama_alat}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          {value && (
            <X 
              className="ml-auto h-4 w-4" 
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
            />
          )}
        </Button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-96 overflow-hidden">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari alat..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {Object.entries(filteredGroups).length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  Tidak ada alat yang cocok
                </div>
              ) : (
                Object.entries(filteredGroups).map(([jenis, alats]) => (
                  <div key={jenis}>
                    <div className="px-3 py-1 bg-muted text-xs font-semibold text-muted-foreground">
                      {jenis}
                    </div>
                    {alats.map((alat) => (
                      <button
                        key={alat.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                        onClick={() => {
                          onChange(alat.id);
                          setIsOpen(false);
                          setSearchQuery('');
                        }}
                      >
                        {alat.no_lambung} - {alat.nama_alat}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
