/**
 * Role-Based Access Control (RBAC) Configuration
 * Mendefinisikan setiap role dan permissions-nya
 */

export type UserRole = 'admin' | 'commentator' | 'viewer';

export interface Permission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
}

export interface RolePermissions {
  [key: string]: Permission;
}

const FULL: Permission = { view: true, create: true, edit: true, delete: true, approve: true };
const VIEW_ONLY: Permission = { view: true, create: false, edit: false, delete: false, approve: false };
const WRITE_NO_APPROVE: Permission = { view: true, create: true, edit: true, delete: false, approve: false };
const NONE: Permission = { view: false, create: false, edit: false, delete: false, approve: false };

/**
 * Definisi semua halaman/form yang tampil di Manajemen Akses User.
 * Sinkronkan dengan backend/server.js ALL_PAGES.
 */
export const ALL_PAGES: { key: string; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'dataAlatBerat', label: 'Database Alat Berat' },
  { key: 'dataAlatPendukung', label: 'Database Alat Pendukung' },
  { key: 'databaseKendaraan', label: 'Database Kendaraan' },
  { key: 'rpa', label: 'RPA' },
  { key: 'riwayatPenggunaanAlat', label: 'Riwayat Penggunaan Alat (tab RPA)' },
  { key: 'sewaAlatInternal', label: 'Sewa Alat Internal' },
  { key: 'sewaAlatEksternal', label: 'Sewa Alat Eksternal' },
  { key: 'timeSheet', label: 'Timesheet' },
  { key: 'invoice', label: 'Invoice' },
  { key: 'lemburOperator', label: 'Lembur Operator' },
  { key: 'permohonanPerawatanBerkala', label: 'Permohonan Perawatan Berkala' },
  { key: 'spkPerawatanBerkala', label: 'Form SPK Perawatan Berkala' },
  { key: 'permohonanPerbaikanAlat', label: 'Permohonan Perbaikan Alat' },
  { key: 'pemeriksaanPerbaikanAlat', label: 'Form Pemeriksaan Perbaikan Alat' },
  { key: 'spkPerbaikanAlat', label: 'Form SPK Perbaikan Alat' },
  { key: 'lokasiProyek', label: 'Lokasi Proyek' },
  { key: 'stockBBM', label: 'Stok BBM' },
  { key: 'stockSparepart', label: 'Stok Sparepart' },
  { key: 'stockOli', label: 'Stok Oli' },
  { key: 'system', label: 'System' },
];

/**
 * Semua jenis permission yang tersedia
 */
export const ALL_PERMISSION_TYPES: { key: string; label: string }[] = [
  { key: 'can_view', label: 'View' },
  { key: 'can_create', label: 'Create' },
  { key: 'can_edit', label: 'Edit' },
  { key: 'can_delete', label: 'Delete' },
  { key: 'can_export_excel', label: 'Export Excel' },
  { key: 'can_export_pdf', label: 'Export PDF' },
  { key: 'can_import', label: 'Import' },
  { key: 'can_approve', label: 'Approve' },
  { key: 'can_print', label: 'Print' },
];

const COMMENTATOR_WRITE_KEYS = [
  'permohonanPerawatanBerkala',
  'spkPerawatanBerkala',
  'permohonanPerbaikanAlat',
  'pemeriksaanPerbaikanAlat',
  'spkPerbaikanAlat',
];

/** Key lama di database → key baru di Manajemen Akses (agar akses existing tetap jalan). */
const LEGACY_PAGE_KEY_MAP: Record<string, string[]> = {
  ppa: [
    'permohonanPerawatanBerkala',
    'spkPerawatanBerkala',
    'permohonanPerbaikanAlat',
    'pemeriksaanPerbaikanAlat',
    'spkPerbaikanAlat',
  ],
  ppaPerawatanBerkala: ['permohonanPerawatanBerkala'],
  ppaPerbaikanBerkala: ['permohonanPerbaikanAlat'],
  perawatanBerkala: ['permohonanPerawatanBerkala', 'spkPerawatanBerkala'],
  formPerbaikan: ['pemeriksaanPerbaikanAlat', 'spkPerbaikanAlat'],
};

export function expandPageKeys(pageKey: string): string[] {
  return LEGACY_PAGE_KEY_MAP[pageKey] || [pageKey];
}

/**
 * Definisi akses untuk setiap role
 */
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: Object.fromEntries(ALL_PAGES.map(p => [p.key, FULL])),

  commentator: Object.fromEntries(
    ALL_PAGES.map(p => {
      if (p.key === 'system') return [p.key, NONE];
      if (COMMENTATOR_WRITE_KEYS.includes(p.key)) return [p.key, WRITE_NO_APPROVE];
      return [p.key, VIEW_ONLY];
    })
  ),

  viewer: Object.fromEntries(
    ALL_PAGES.map(p => [p.key, p.key === 'system' ? NONE : VIEW_ONLY])
  ),
};

/**
 * Template permission per role untuk Manajemen Akses User
 * Digunakan saat "Reset ke Template Role"
 */
export const ROLE_PERMISSION_TEMPLATE: Record<UserRole, Record<string, Record<string, boolean>>> = {
  admin: Object.fromEntries(
    ALL_PAGES.map(p => [p.key, {
      can_view: true, can_create: true, can_edit: true, can_delete: true,
      can_export_excel: true, can_export_pdf: true, can_import: true,
      can_approve: true, can_print: true,
    }])
  ),
  commentator: Object.fromEntries(
    ALL_PAGES.map(p => {
      const isSystem = p.key === 'system';
      const canWrite = COMMENTATOR_WRITE_KEYS.includes(p.key);
      return [p.key, {
        can_view: !isSystem,
        can_create: canWrite,
        can_edit: canWrite,
        can_delete: false,
        can_export_excel: false,
        can_export_pdf: false,
        can_import: false,
        can_approve: false,
        can_print: canWrite,
      }];
    })
  ),
  viewer: Object.fromEntries(
    ALL_PAGES.map(p => [p.key, {
      can_view: p.key !== 'system',
      can_create: false,
      can_edit: false,
      can_delete: false,
      can_export_excel: false,
      can_export_pdf: false,
      can_import: false,
      can_approve: false,
      can_print: p.key !== 'system',
    }])
  ),
};

/**
 * Deskripsi role untuk ditampilkan di UI
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'Admin dapat mengakses semua fitur, membuat, mengedit, dan menghapus data',
  commentator: 'Commentator dapat melihat data, membuat permohonan dan form SPK/pemeriksaan',
  viewer: 'Viewer hanya dapat melihat semua data tanpa dapat membuat atau mengedit',
};

/**
 * Cek apakah user memiliki permission untuk melakukan action
 */
export const hasPermission = (
  role: UserRole | undefined,
  resource: string,
  action: 'view' | 'create' | 'edit' | 'delete' | 'approve'
): boolean => {
  const effectiveRole = role || 'viewer';
  const rolePerms = ROLE_PERMISSIONS[effectiveRole as UserRole];
  if (!rolePerms) return false;

  const resourcePerms = rolePerms[resource];
  if (!resourcePerms) return false;

  return resourcePerms[action] === true;
};

/**
 * Get all accessible resources untuk user dengan role tertentu
 */
export const getAccessibleResources = (role: UserRole): string[] => {
  const rolePerms = ROLE_PERMISSIONS[role];
  return Object.keys(rolePerms).filter(resource => rolePerms[resource].view);
};

/**
 * Menu items untuk ditampilkan berdasarkan role
 */
export const ROLE_MENU_ACCESS: Record<UserRole, string[]> = {
  admin: ALL_PAGES.map(p => p.key),
  commentator: ALL_PAGES.filter(p => p.key !== 'system').map(p => p.key),
  viewer: ALL_PAGES.filter(p => p.key !== 'system').map(p => p.key),
};

/**
 * Helper functions untuk UI-level access control
 */

export const shouldShowActionColumn = (role: UserRole | undefined, resource: string): boolean => {
  const effectiveRole = role || 'viewer';
  const permission = ROLE_PERMISSIONS[effectiveRole as UserRole]?.[resource];
  return permission ? (permission.edit || permission.delete) : false;
};

export const shouldShowCreateButton = (role: UserRole | undefined, resource: string): boolean => {
  return hasPermission(role, resource, 'create');
};

export const shouldShowEditButton = (role: UserRole | undefined, resource: string): boolean => {
  return hasPermission(role, resource, 'edit');
};

export const shouldShowDeleteButton = (role: UserRole | undefined, resource: string): boolean => {
  return hasPermission(role, resource, 'delete');
};

export const shouldShowApproveButton = (role: UserRole | undefined, resource: string): boolean => {
  return hasPermission(role, resource, 'approve');
};
