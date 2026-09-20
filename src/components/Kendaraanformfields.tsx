import type { ChangeEvent, ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ComboboxLokasiProyek } from '@/components/ComboboxLokasiProyek';
import { MultiFotoUploader } from '@/components/ui/MultiFotoUploader';
import { serializeFotoList } from '@/utils/fotoUtils';
import type { Kendaraan } from '@/types';

export type KendaraanFormValues = Omit<Kendaraan, 'id'>;

export const EMPTY_KENDARAAN: KendaraanFormValues = {
    namaAlat: '',
    noLambung: '',
    jenisAlat: '',
    merk: '',
    tipe: '',
    model: '',
    warnaTnkb: '',
    namaPemilik: '',
    alamatPemilik: '',
    pengguna: '',
    tahunPembuatan: null,
    isiSilinder: null,
    nomorRangka: '',
    nomorMesin: '',
    tahunRegistrasi: null,
    nomorBpkb: '',
    tglBerlakuStnk: '',
    tglBerlakuPajak: '',
    lokasi: '',
    kondisi: 'Baik',
    status: 'aktif',
    serviceTerakhir: '',
    serviceBerikutnya: '',
    keterangan: '',
    gambar: '',
    foto: '',
} as const;

interface KendaraanFormFieldsProps {
    value: KendaraanFormValues;
    onChange: (patch: Partial<Kendaraan>) => void;
    /** Supaya id input unik bila ada lebih dari satu form di halaman */
    idPrefix?: string;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-100 pb-1">
                {title}
            </h4>
            {children}
        </div>
    );
}

function Field({
    id,
    label,
    required,
    className,
    children,
}: {
    id: string;
    label: string;
    required?: boolean;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className={`grid gap-2 ${className ?? ''}`}>
            <Label htmlFor={id}>
                {label}
                {required && <span className="text-red-500"> *</span>}
            </Label>
            {children}
        </div>
    );
}

export function KendaraanFormFields({ value, onChange, idPrefix = 'kdr' }: KendaraanFormFieldsProps) {
    const id = (name: string) => `${idPrefix}-${name}`;

    /** props untuk <Input> teks / tanggal */
    const text = (key: keyof KendaraanFormValues) => ({
        id: id(String(key)),
        value: ((value[key] as string | null | undefined) ?? '') as string,
        onChange: (e: ChangeEvent<HTMLInputElement>) =>
            onChange({ [key]: e.target.value } as Partial<Kendaraan>),
    });

    /** props untuk <Input type="number"> */
    const num = (key: keyof KendaraanFormValues) => ({
        id: id(String(key)),
        type: 'number' as const,
        inputMode: 'numeric' as const,
        value: ((value[key] as number | null | undefined) ?? '') as number | string,
        onChange: (e: ChangeEvent<HTMLInputElement>) =>
            onChange({
                [key]: e.target.value === '' ? null : Number(e.target.value),
            } as Partial<Kendaraan>),
    });

    return (
        <div className="space-y-6">
            <Section title="Identitas Kendaraan">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <Field id={id('noLambung')} label="Nomor Polisi" required>
                        <Input {...text('noLambung')} required placeholder="B 1234 ABC" />
                    </Field>
                    <Field id={id('merk')} label="Merk">
                        <Input {...text('merk')} placeholder="TOYOTA" />
                    </Field>
                    <Field id={id('tipe')} label="Type">
                        <Input {...text('tipe')} placeholder="RUSH 15S AT" />
                    </Field>
                    <Field id={id('jenisAlat')} label="Jenis" required>
                        <Input {...text('jenisAlat')} required placeholder="Mobil Penumpang" />
                    </Field>
                    <Field id={id('model')} label="Model">
                        <Input {...text('model')} placeholder="Minibus" />
                    </Field>
                    <Field id={id('warnaTnkb')} label="Warna TNKB">
                        <Input {...text('warnaTnkb')} placeholder="Hitam" />
                    </Field>
                    <Field id={id('namaAlat')} label="Nama Kendaraan (opsional)" className="sm:col-span-2 md:col-span-3">
                        <Input {...text('namaAlat')} placeholder="Kosongkan untuk diisi otomatis dari Merk + Type" />
                    </Field>
                </div>
            </Section>

            <Section title="Pemilik & Pengguna">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field id={id('namaPemilik')} label="Nama Pemilik">
                        <Input {...text('namaPemilik')} />
                    </Field>
                    <Field id={id('pengguna')} label="Pengguna">
                        <Input {...text('pengguna')} />
                    </Field>
                    <Field id={id('alamatPemilik')} label="Alamat" className="sm:col-span-2">
                        <Textarea
                            id={id('alamatPemilik')}
                            rows={2}
                            value={value.alamatPemilik ?? ''}
                            onChange={(e) => onChange({ alamatPemilik: e.target.value })}
                        />
                    </Field>
                </div>
            </Section>

            <Section title="Data Teknis">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <Field id={id('tahunPembuatan')} label="Tahun Pembuatan">
                        <Input {...num('tahunPembuatan')} placeholder="2015" />
                    </Field>
                    <Field id={id('isiSilinder')} label="Isi Silinder (cc)">
                        <Input {...num('isiSilinder')} placeholder="1495" />
                    </Field>
                    <Field id={id('nomorRangka')} label="Nomor Rangka">
                        <Input {...text('nomorRangka')} />
                    </Field>
                    <Field id={id('nomorMesin')} label="Nomor Mesin">
                        <Input {...text('nomorMesin')} />
                    </Field>
                </div>
            </Section>

            <Section title="Dokumen">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <Field id={id('tahunRegistrasi')} label="Tahun Registrasi">
                        <Input {...num('tahunRegistrasi')} placeholder="2020" />
                    </Field>
                    <Field id={id('nomorBpkb')} label="Nomor BPKB">
                        <Input {...text('nomorBpkb')} />
                    </Field>
                    <Field id={id('tglBerlakuStnk')} label="Tgl Berlaku STNK">
                        <Input {...text('tglBerlakuStnk')} type="date" />
                    </Field>
                    <Field id={id('tglBerlakuPajak')} label="Tgl Berlaku Pajak">
                        <Input {...text('tglBerlakuPajak')} type="date" />
                    </Field>
                </div>
            </Section>

            <Section title="Operasional (opsional)">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <Field id={id('lokasi')} label="Lokasi">
                        <ComboboxLokasiProyek
                            value={value.lokasi || ''}
                            onChange={(v) => onChange({ lokasi: v })}
                            required={false}
                        />
                    </Field>
                    <Field id={id('kondisi')} label="Kondisi">
                        <Select
                            value={value.kondisi || 'Baik'}
                            onValueChange={(v) => onChange({ kondisi: v })}
                        >
                            <SelectTrigger id={id('kondisi')}>
                                <SelectValue placeholder="Pilih kondisi" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Baik">Baik</SelectItem>
                                <SelectItem value="Maintenance">Maintenance</SelectItem>
                                <SelectItem value="Rusak">Rusak</SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field id={id('status')} label="Status">
                        <Select
                            value={(value.status || 'aktif').toLowerCase()}
                            onValueChange={(v) => onChange({ status: v })}
                        >
                            <SelectTrigger id={id('status')}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="aktif">Aktif</SelectItem>
                                <SelectItem value="non-aktif">Non-Aktif</SelectItem>
                                <SelectItem value="sedang digunakan">Sedang Digunakan</SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field id={id('serviceTerakhir')} label="Service Berkala Terakhir">
                        <Input {...text('serviceTerakhir')} type="date" />
                    </Field>
                    <Field id={id('serviceBerikutnya')} label="Service Berkala Berikutnya">
                        <Input {...text('serviceBerikutnya')} type="date" />
                    </Field>
                    <Field id={id('keterangan')} label="Keterangan" className="sm:col-span-2 md:col-span-3">
                        <Textarea
                            id={id('keterangan')}
                            rows={2}
                            value={value.keterangan ?? ''}
                            onChange={(e) => onChange({ keterangan: e.target.value })}
                        />
                    </Field>
                </div>
            </Section>

            <div className="pt-2 border-t border-slate-100">
                <MultiFotoUploader
                    value={value.foto ?? ''}
                    onChange={(fotos) => onChange({ foto: serializeFotoList(fotos) || '' })}
                />
            </div>
        </div>
    );
}