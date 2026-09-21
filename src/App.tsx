// @ts-nocheck
// Simple working App - Security fixes applied successfully ✅
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster as Sonner } from "sonner";
import { Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";

import Index from "./pages/Index";
import LoginRegister from "./pages/LoginRegister";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import PageGuard from "./components/PageGuard";

// Data pages
import DataAlatBerat from "./pages/DataAlatBerat";
import DataAlatPendukung from "./pages/DataAlatPendukung";
import DatabaseKendaraan from "./pages/DatabaseKendaraan";
import SewaAlatEksternal from "./pages/SewaAlatEksternal";
import SewaAlatInternal from "./pages/SewaAlatInternal";
import RPA from "./pages/RPA";
import RiwayatPenggunaanAlat from "./pages/RiwayatPenggunaanAlat";
import LokasiProyek from "./pages/LokasiProyek";

// Repair report pages
import FormPerbaikan from "./pages/FormPerbaikan";
import StockSparepart from "./pages/StockSparepart";
import PPA from "./pages/PPA";
import PPAPerawatanBerkala from "./pages/PPAPerawatanBerkala";
import PPAPerbaikanBerkala from "./pages/PPAPerbaikanBerkala";
import LaporanKegiatanMekanik from "./pages/laporan/LaporanKegiatanMekanik";

// Monthly report pages
import StockBBM from "./pages/StockBBM";
import StockOli from "./pages/StockOli";
import TimeSheet from "./pages/TimeSheet";
import Invoice from "./pages/Invoice";

// System pages
import ManajemenUser from "./pages/system/ManajemenUser";
import ManajemenAksesUser from "./pages/system/ManajemenAksesUser";
import AuditLog from "./pages/system/AuditLog";
import LoginHistory from "./pages/system/LoginHistory";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}>
            <ErrorBoundary>
              <div className="min-h-screen bg-background font-sans antialiased">
                <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/login" element={<LoginRegister />} />
                    <Route path="/admin" element={<AdminPanel />} />
                    <Route element={<ProtectedRoute />}>
                      <Route path="/dashboard" element={<Dashboard />} />
                      {/* Database Alat routes */}
                      <Route path="/data-alat-berat" element={<PageGuard pageKey="dataAlatBerat"><DataAlatBerat /></PageGuard>} />
                      <Route path="/data-alat-pendukung" element={<PageGuard pageKey="dataAlatPendukung"><DataAlatPendukung /></PageGuard>} />
                      <Route path="/database-kendaraan" element={<PageGuard pageKey="databaseKendaraan"><DatabaseKendaraan /></PageGuard>} />

                      {/* Operasional Alat routes */}
                      <Route path="/rpa" element={<PageGuard pageKey="rpa"><RPA /></PageGuard>} />
                      <Route path="/sewa-alat-internal" element={<PageGuard pageKey="sewaAlatInternal"><SewaAlatInternal /></PageGuard>} />
                      <Route path="/sewa-alat-eksternal" element={<PageGuard pageKey="sewaAlatEksternal"><SewaAlatEksternal /></PageGuard>} />
                      <Route path="/riwayat-penggunaan-alat" element={<PageGuard pageKey="riwayatPenggunaanAlat"><RiwayatPenggunaanAlat /></PageGuard>} />

                      {/* Service Alat / Perbaikan routes */}
                      <Route path="/ppa-perawatan-berkala" element={<PageGuard pageKey="permohonanPerawatanBerkala"><PPAPerawatanBerkala /></PageGuard>} />
                      <Route path="/ppa-perbaikan-berkala" element={<PageGuard pageKey="permohonanPerbaikanAlat"><PPAPerbaikanBerkala /></PageGuard>} />
                      <Route path="/ppa" element={<PageGuard pageKey="permohonanPerbaikanAlat"><PPAPerbaikanBerkala /></PageGuard>} />
                      <Route path="/form-perbaikan" element={<PageGuard pageKey="formPerbaikan"><FormPerbaikan /></PageGuard>} />
                      <Route path="/laporan/kegiatan-mekanik" element={<PageGuard pageKey="kegiatanMekanik"><LaporanKegiatanMekanik /></PageGuard>} />
                      {/* Laporan Proyek routes */}
                      <Route path="/lokasi-proyek" element={<PageGuard pageKey="lokasiProyek"><LokasiProyek /></PageGuard>} />
                      <Route path="/stock-bbm" element={<PageGuard pageKey="stockBBM"><StockBBM /></PageGuard>} />
                      <Route path="/stock-sparepart" element={<PageGuard pageKey="stockSparepart"><StockSparepart /></PageGuard>} />
                      <Route path="/stock-oli" element={<PageGuard pageKey="stockOli"><StockOli /></PageGuard>} />
                      <Route path="/time-sheet" element={<PageGuard pageKey="timeSheet"><TimeSheet /></PageGuard>} />
                      <Route path="/invoice" element={<PageGuard pageKey="invoice"><Invoice /></PageGuard>} />
                      {/* System routes */}
                      <Route path="/system/manajemen-user" element={<PageGuard pageKey="system"><ManajemenUser /></PageGuard>} />
                      <Route path="/system/manajemen-akses-user" element={<PageGuard pageKey="system"><ManajemenAksesUser /></PageGuard>} />
                      <Route path="/system/audit-log" element={<PageGuard pageKey="system"><AuditLog /></PageGuard>} />
                      <Route path="/system/login-history" element={<PageGuard pageKey="system"><LoginHistory /></PageGuard>} />
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </div>
            </ErrorBoundary>
            <Toaster />
            <Sonner />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;