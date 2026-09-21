import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Menu, X, LogOut, ChevronDown, ChevronUp, ChevronRight, User, Users, Shield, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { useCurrentUserViewPermissions } from '@/hooks/useCurrentUserPermissions';

interface SubMenuItem {
  title: string;
  path?: string;
  subItems?: SubMenuItem[];
}

interface MenuItem {
  title: string;
  path?: string;
  adminOnly?: boolean;
  items?: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  { title: 'Dashboard', path: '/dashboard' },
  {
    title: 'DATABASE ALAT',
    items: [
      { title: 'Database Alat Berat', path: '/data-alat-berat' },
      { title: 'Database Alat Pendukung', path: '/data-alat-pendukung' },
      { title: 'Database Kendaraan', path: '/database-kendaraan' },
    ]
  },
  {
    title: 'OPERASIONAL ALAT',
    items: [
      { title: 'RPA', path: '/rpa' },
      {
        title: 'Sewa Alat',
        subItems: [
          { title: 'Sewa Alat Internal', path: '/sewa-alat-internal' },
          { title: 'Sewa Alat Eksternal', path: '/sewa-alat-eksternal' },
        ]
      },
      { title: 'Timesheet', path: '/time-sheet' },
      { title: 'Invoice', path: '/invoice' },
      { title: 'Lembur Operator', path: '/Lembur-Operator' }
    ]
  },
  {
    title: 'SERVICE ALAT',
    items: [
      { title: 'Permohonan Perawatan Berkala', path: '/ppa-perawatan-berkala' },
      { title: 'Permohonan Perbaikan Alat', path: '/ppa-perbaikan-berkala' },
    ]
  },
  {
    title: 'LAPORAN PROYEK',
    items: [
      { title: 'Lokasi Proyek', path: '/lokasi-proyek' },
      { title: 'Stok BBM', path: '/stock-bbm' },
      { title: 'Stok Sparepart', path: '/stock-sparepart' },
      { title: 'Stok Oli', path: '/stock-oli' },
    ]
  },
  {
    title: 'System',
    adminOnly: true,
    items: [
      { title: 'Manajemen User', path: '/system/manajemen-user' },
      { title: 'Manajemen Akses User', path: '/system/manajemen-akses-user' },
      { title: 'Audit Log', path: '/system/audit-log' },
      { title: 'Login History', path: '/system/login-history' },
    ]
  },
];

// Map a menu path to a pageKey used in the permissions database
function pathToPageKey(path: string): string {
  const map: Record<string, string> = {
    '/data-alat-berat': 'dataAlatBerat',
    '/data-alat-pendukung': 'dataAlatPendukung',
    '/database-kendaraan': 'databaseKendaraan',
    '/sewa-alat-internal': 'sewaAlatInternal',
    '/sewa-alat-eksternal': 'sewaAlatEksternal',
    '/rpa': 'rpa',
    '/riwayat-penggunaan-alat': 'riwayatPenggunaanAlat',
    '/laporan/kegiatan-mekanik': 'kegiatanMekanik',
    '/lokasi-proyek': 'lokasiProyek',
    '/stock-sparepart': 'stockSparepart',
    '/ppa': 'ppa',
    '/ppa-perawatan-berkala': 'ppa',
    '/ppa-perbaikan-berkala': 'ppa',
    '/form-perbaikan': 'formPerbaikan',
    '/stock-bbm': 'stockBBM',
    '/stock-oli': 'stockOli',
    '/time-sheet': 'timeSheet',
    '/invoice': 'invoice',
    '/dashboard': 'dashboard',
    '/system/manajemen-user': 'system',
    '/system/manajemen-akses-user': 'system',
    '/system/audit-log': 'system',
    '/system/login-history': 'system',
  };
  return map[path] || path.replace(/\//g, '').replace(/-/g, '').toLowerCase();
}

const NavBar = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();

  // Track activity on route change
  useActivityTracker();

  // Fetch per-user view permissions from database
  const { viewMap } = useCurrentUserViewPermissions();

  // User stats (total & online) - only for admin
  const [userStats, setUserStats] = useState<{ total: number; online: number } | null>(null);
  const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    if (!authUser) return;
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/api/system/user-stats`);
        const json = await res.json();
        if (json.data) setUserStats(json.data);
      } catch { /* non-critical */ }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [authUser]);

  // Map authUser ke format yang dipakai NavBar
  const user = authUser ? {
    id: authUser.id,
    username: authUser.username,
    email: authUser.email || '',
    full_name: authUser.name,
    role: authUser.role,
  } : null;

  // Check if a page path is accessible based on database permissions
  const isPathAccessible = (path: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const pageKey = pathToPageKey(path);
    if (Object.keys(viewMap).length === 0) return false;
    if (viewMap[pageKey] === true) return true;
    if (pageKey === 'databaseKendaraan' && (viewMap['databaseKendaraan'] === true || viewMap['dataAlatPendukung'] === true)) return true;
    if (pageKey === 'sewaAlatInternal' && (viewMap['sewaAlatInternal'] === true || viewMap['sewaAlatEksternal'] === true)) return true;
    return false;
  };

  // Filter menu items berdasarkan database permissions
  const getAccessibleMenuItems = (): MenuItem[] => {
    if (!user) return [];

    const result: MenuItem[] = [];

    for (const item of menuItems) {
      if (item.items) {
        if ((item as any).adminOnly) {
          const hasSystemAccess = user.role === 'admin' ||
            (Object.keys(viewMap).length > 0 && viewMap['system'] === true);
          if (hasSystemAccess) {
            result.push(item);
          }
          continue;
        }

        const filteredItems: SubMenuItem[] = [];
        for (const subItem of item.items) {
          if (subItem.subItems) {
            const accessibleNested = subItem.subItems.filter(n => n.path && isPathAccessible(n.path));
            if (accessibleNested.length > 0) {
              filteredItems.push({ ...subItem, subItems: accessibleNested });
            }
          } else if (subItem.path && isPathAccessible(subItem.path)) {
            filteredItems.push(subItem);
          }
        }

        if (filteredItems.length > 0) {
          result.push({ ...item, items: filteredItems });
        }
      } else if (item.path) {
        if (isPathAccessible(item.path)) {
          result.push(item);
        }
      }
    }

    return result;
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [openSubDropdown, setOpenSubDropdown] = useState<string | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const handleClickOutside = useCallback((event: MouseEvent) => {
    const isOutside = Object.values(dropdownRefs.current).every(
      ref => !ref || !ref.contains(event.target as Node)
    );
    if (isOutside) {
      setOpenDropdown(null);
      setOpenSubDropdown(null);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isMenuOpen]);

  const toggleDropdown = useCallback((title: string) => {
    setOpenDropdown(prev => prev === title ? null : title);
    setOpenSubDropdown(null);
  }, []);

  const handleNavigation = useCallback(() => {
    setOpenDropdown(null);
    setOpenSubDropdown(null);
  }, []);

  const setDropdownRef = (title: string, node: HTMLDivElement | null) => {
    dropdownRefs.current[title] = node;
  };

  const isSubItemActive = (subItem: SubMenuItem): boolean => {
    if (subItem.path && location.pathname === subItem.path) return true;
    if (subItem.subItems && subItem.subItems.some(n => n.path === location.pathname)) return true;
    return false;
  };

  const isMenuItemActive = (item: MenuItem): boolean => {
    if (item.path && location.pathname === item.path) return true;
    if (item.items && item.items.some(isSubItemActive)) return true;
    return false;
  };

  return (
    <nav className={`bg-white shadow-lg z-50 ${isMenuOpen ? 'fixed top-0 left-0 right-0' : 'sticky top-0 relative'}`}>
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="flex justify-between items-center h-16 lg:h-20">
          {/* Logo/Brand */}
          <div className="flex-shrink-0 mr-1 lg:mr-8 flex items-center gap-2 lg:gap-3">
            <Link to="/dashboard" className="flex items-center gap-2 lg:gap-3 hover:opacity-90 transition-opacity">
              <img
                src="/images/logo.png"
                alt="PT. REKA UTAMA PERSADA Logo"
                className="h-10 lg:h-12 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="text-sm font-bold text-blue-700 leading-tight">
                <div className="text-xs sm:text-sm lg:text-base font-bold">Sistem Informasi Peralatan</div>
                <div className="text-[10px] sm:text-xs font-medium text-blue-600">PT. REKA UTAMA PERSADA</div>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden lg:flex items-center space-x-0.5">
            {getAccessibleMenuItems().map((item) => (
              <div key={item.path || item.title} className="relative group">
                {item.items ? (
                  <div className="relative" ref={node => setDropdownRef(item.title, node)}>
                    <button
                      onClick={() => toggleDropdown(item.title)}
                      className={`px-4 py-2.5 rounded-md text-xs sm:text-sm font-semibold tracking-wide transition-all duration-200 flex items-center space-x-1.5 ${(item as any).adminOnly
                        ? isMenuItemActive(item)
                          ? 'bg-red-50 text-red-700 font-medium'
                          : 'text-red-600 hover:bg-red-50/50 hover:text-red-700'
                        : isMenuItemActive(item)
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-blue-50/50 hover:text-blue-600'
                        }`}
                    >
                      {(item as any).adminOnly && <Settings className="h-3.5 w-3.5" />}
                      <span>{item.title}</span>
                      {openDropdown === item.title ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    {openDropdown === item.title && (
                      <div className={`absolute left-0 mt-1 w-60 bg-white rounded-lg shadow-xl ring-1 overflow-visible z-50 ${(item as any).adminOnly ? 'ring-red-100' : 'ring-black ring-opacity-5'}`}>
                        {(item as any).adminOnly && (
                          <div className="px-4 py-2 bg-red-50 border-b border-red-100 rounded-t-lg">
                            <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
                              <Settings className="h-3 w-3" /> Administrasi Sistem
                            </p>
                          </div>
                        )}
                        <div className="py-1">
                          {item.items.map((subItem) => (
                            subItem.subItems ? (
                              <div
                                key={subItem.title}
                                className="relative group/nested"
                                onMouseEnter={() => setOpenSubDropdown(subItem.title)}
                                onMouseLeave={() => setOpenSubDropdown(null)}
                              >
                                <button
                                  type="button"
                                  onClick={() => setOpenSubDropdown(prev => prev === subItem.title ? null : subItem.title)}
                                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${isSubItemActive(subItem)
                                    ? 'bg-blue-50 text-blue-700 font-medium'
                                    : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                                    }`}
                                >
                                  <span>{subItem.title}</span>
                                  <ChevronRight className="h-4 w-4 text-gray-400" />
                                </button>
                                {/* Nested Flyout Dropdown */}
                                {openSubDropdown === subItem.title && (
                                  <div className="absolute left-full top-0 -ml-0.5 w-56 bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 py-1 z-50">
                                    {subItem.subItems.map((nested) => (
                                      <Link
                                        key={nested.path}
                                        to={nested.path!}
                                        onClick={handleNavigation}
                                        className={`block px-4 py-2.5 text-sm transition-colors ${location.pathname === nested.path
                                          ? 'bg-blue-50 text-blue-700 font-medium'
                                          : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                                          }`}
                                      >
                                        {nested.title}
                                      </Link>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <Link
                                key={subItem.path}
                                to={subItem.path!}
                                onClick={handleNavigation}
                                className={`block px-4 py-2.5 text-sm transition-colors ${location.pathname === subItem.path
                                  ? (item as any).adminOnly
                                    ? 'bg-red-50 text-red-700 font-medium'
                                    : 'bg-blue-50 text-blue-700 font-medium'
                                  : (item as any).adminOnly
                                    ? 'text-gray-700 hover:bg-red-50/50 hover:text-red-600'
                                    : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                                  }`}
                              >
                                {subItem.title}
                              </Link>
                            )
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : item.path ? (
                  <Link
                    to={item.path}
                    className={`px-4 py-2.5 rounded-md text-xs sm:text-sm font-semibold tracking-wide transition-all duration-200 ${location.pathname === item.path
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-blue-50/50 hover:text-blue-600'
                      }`}
                  >
                    {item.title}
                  </Link>
                ) : null}
              </div>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            {/* User Info */}
            {user && (
              <div className="hidden lg:flex items-center space-x-3 pr-4 border-r border-gray-200">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{user.full_name}</div>
                  <div className="flex items-center text-xs text-gray-500 gap-1">
                    <Shield className="w-3 h-3" />
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </div>
                  {userStats && (
                    <div className="flex items-center text-[10px] text-gray-400 gap-1 mt-0.5 whitespace-nowrap">
                      <Users className="w-2.5 h-2.5 text-gray-400" />
                      <span>{userStats.total} user</span>
                      <span className="text-gray-300">•</span>
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-green-600 font-medium">{userStats.online} online</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900 hidden lg:flex items-center space-x-1"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-xs">Keluar</span>
            </Button>
            {/* Mobile User Info */}
            {user && isMenuOpen && (
              <div className="lg:hidden flex items-center space-x-1 bg-blue-50/50 py-0.5 px-1.5 rounded-md border border-blue-100 mr-0.5 max-w-[100px] flex-shrink-0">
                <div className="flex items-center justify-center w-5 h-5 bg-blue-100 rounded-full flex-shrink-0">
                  <User className="w-2.5 h-2.5 text-blue-600" />
                </div>
                <div className="text-[9px] leading-tight truncate">
                  <div className="font-semibold text-gray-900 truncate max-w-[50px]">{user.full_name}</div>
                  {userStats && (
                    <div className="flex items-center text-[7.5px] text-gray-500 gap-0.5 whitespace-nowrap">
                      <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-green-600 font-medium">{userStats.online} on</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="lg:hidden flex items-center space-x-1">
              {!isMenuOpen && (
                <button
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-red-600 flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-red-50 transition-colors text-xs font-semibold mr-1"
                  title="Keluar"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              )}
              <button
                onClick={toggleMenu}
                className="text-gray-600 hover:text-gray-900 w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu (Scrollable drawer) */}
        <div className={`lg:hidden absolute top-full left-0 right-0 bg-white border-t border-gray-100 shadow-xl overflow-y-auto transition-all duration-300 ease-in-out ${isMenuOpen ? 'max-h-[75vh] py-2' : 'max-h-0'}`}>
          <div className="space-y-1">
            {getAccessibleMenuItems().map((item, index) => (
              <div key={`${item.title}-${index}`} className="px-2">
                {item.items ? (
                  <div className="space-y-1">
                    <div className="px-3 py-2 text-xs font-bold text-gray-800 tracking-wider">
                      {item.title}
                    </div>
                    <div className="pl-4 space-y-1 border-l-2 border-gray-100">
                      {item.items.map((subItem, subIndex) => (
                        subItem.subItems ? (
                          <div key={`${subItem.title}-${subIndex}`} className="py-1">
                            <div className="px-3 py-1 text-xs font-semibold text-gray-500">
                              {subItem.title}
                            </div>
                            <div className="pl-3 space-y-1 border-l border-gray-200">
                              {subItem.subItems.map((nested, nIdx) => (
                                <Link
                                  key={`${nested.path}-${nIdx}`}
                                  to={nested.path!}
                                  onClick={() => {
                                    handleNavigation();
                                    toggleMenu();
                                  }}
                                  className={`block px-3 py-2 rounded-md text-sm transition-colors ${location.pathname === nested.path
                                    ? 'bg-blue-50 text-blue-700 font-medium'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
                                    }`}
                                >
                                  {nested.title}
                                </Link>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <Link
                            key={`${subItem.path}-${subIndex}`}
                            to={subItem.path!}
                            onClick={() => {
                              handleNavigation();
                              toggleMenu();
                            }}
                            className={`block px-3 py-2 rounded-md text-sm transition-colors ${location.pathname === subItem.path
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
                              }`}
                          >
                            {subItem.title}
                          </Link>
                        )
                      ))}
                    </div>
                  </div>
                ) : item.path ? (
                  <Link
                    to={item.path}
                    onClick={toggleMenu}
                    className={`block px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${location.pathname === item.path
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
                      }`}
                  >
                    {item.title}
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
