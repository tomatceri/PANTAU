import React, { useState } from 'react';
import { UserRole } from '../types';
import { PantauLogoMark } from './PantauLogo';
import { Lock, User, Eye, EyeOff, ArrowRight, AlertCircle, ShieldCheck, HardHat } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (role: UserRole, username: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (normalizedUser === '@kontraktor' && cleanPass === '1234') {
      onLoginSuccess('contractor', '@kontraktor');
      return;
    }

    if (normalizedUser === '@pmo' && cleanPass === '5678') {
      onLoginSuccess('pmo', '@pmo');
      return;
    }

    setError('Username atau password salah. Gunakan akun resmi @kontraktor atau @pmo sesuai otorisasi Anda.');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row font-sans">
      {/* Left Brand & Acronym Panel */}
      <div className="lg:w-[52%] bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute -right-24 -bottom-24 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3.5">
            <PantauLogoMark size="lg" />
            <div>
              <div className="text-2xl font-black tracking-tight text-white leading-none">
                PANTAU
              </div>
              <div className="text-xs text-cyan-300 font-medium mt-1">
                Project Activity, Notification, Tracking &amp; Approval Unit
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 my-10 lg:my-0 space-y-6 max-w-xl">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Sistem Informasi &amp; Monitoring Laporan Harian Proyek
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Portal terintegrasi dengan pemisahan akses penuh antara pelaksana lapangan (<strong className="text-white">Kontraktor</strong>) dan tim pengawas (<strong className="text-white">PMO</strong>) untuk menjaga akuntabilitas pelaporan, verifikasi progres fisik, dan persetujuan dokumen harian.
          </p>

          {/* Info Pembagian Hak Akses */}
          <div className="pt-5 border-t border-white/15 space-y-2.5 text-xs text-slate-300">
            <div className="font-semibold text-cyan-300">Pemisahan Hak Akses Portal:</div>
            <div className="grid grid-cols-1 gap-2.5">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10">
                <HardHat className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">Akun Kontraktor</span> hanya dapat mengakses pengisian laporan harian, revisi, dan monitoring proyek tanpa akses ke panel persetujuan PMO.
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">Akun PMO</span> hanya dapat mengakses verifikasi laporan, persetujuan/revisi, dan peringatan keterlambatan tanpa mengubah input kontraktor.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>PANTAU Portal Resmi</span>
          <span aria-hidden="true">·</span>
          <span>Akses Terpisah Kontraktor &amp; PMO</span>
        </div>
      </div>

      {/* Right Authentication Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-slate-50">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-7 sm:p-9 shadow-sm space-y-6">
          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Masuk ke Akun Anda
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Masukkan username dan password sesuai peran kerja Anda untuk membuka dashboard khusus.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="pantau-username" className="block text-xs font-bold text-slate-700">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="pantau-username"
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="Contoh: @kontraktor atau @pmo"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError('');
                  }}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-shadow"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="pantau-password" className="block text-xs font-bold text-slate-700">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="pantau-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Masukkan password akun"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  className="w-full pl-10 pr-11 py-2.5 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>Masuk ke Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
