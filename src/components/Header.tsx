import React from 'react';
import { UserRole, Project } from '../types';
import { PantauLogoMark } from './PantauLogo';
import { HardHat, ShieldCheck, Calendar, FileText, Bell, ArrowLeft, LogOut } from 'lucide-react';

interface HeaderProps {
  currentRole: UserRole;
  loggedInUsername: string;
  onLogout: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  overdueCount: number;
  onOpenEscalations: () => void;
  selectedProject: Project | null;
  onBackToProjects: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  loggedInUsername,
  onLogout,
  activeTab,
  onTabChange,
  overdueCount,
  onOpenEscalations,
  selectedProject,
  onBackToProjects,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="w-full px-3 lg:px-4 flex items-center justify-between gap-1.5 lg:gap-3 h-16">
        {/* Zone 1: Stylized P Brand Mark & Back Icon Button */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-2.5 shrink-0">
            <PantauLogoMark size="sm" />
            <div className="min-w-0">
              <div className="text-sm font-black text-slate-900 leading-tight flex items-center gap-1.5 tracking-tight">
                <span>PANTAU</span>
              </div>
              <div
                className="text-[10px] text-slate-500 leading-tight hidden xl:block font-medium truncate max-w-[235px] 2xl:max-w-none"
                title="Project Activity, Notification, Tracking & Approval Unit"
              >
                Project Activity, Notification, Tracking &amp; Approval Unit
              </div>
            </div>
          </div>

          {selectedProject && (
            <div className="flex items-center gap-1 pl-2 border-l border-slate-200 min-w-0">
              <button
                onClick={onBackToProjects}
                className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                title="Kembali ke Halaman Utama (Daftar Proyek)"
                aria-label="Kembali ke Halaman Utama"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-800 truncate max-w-[180px]" title={selectedProject.name}>
                {selectedProject.name}
              </span>
            </div>
          )}
        </div>

        {/* Zone 2: Navigation Links (Calendar & Daily Report & Escalation Alert) */}
        {selectedProject && (
          <nav className="flex items-center gap-1 lg:gap-1.5 text-[11.5px] 2xl:text-xs font-semibold text-slate-600 shrink-0">
            <button
              onClick={() => onTabChange('calendar')}
              className={`flex items-center gap-1 py-1.5 px-2 2xl:px-2.5 rounded-lg transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'calendar'
                  ? 'bg-blue-50 text-blue-800 font-bold border border-blue-200'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>Kalender Monitoring</span>
            </button>

            <button
              onClick={() => onTabChange('daily')}
              className={`flex items-center gap-1 py-1.5 px-2 2xl:px-2.5 rounded-lg transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'daily'
                  ? 'bg-blue-50 text-blue-800 font-bold border border-blue-200'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>Form Laporan Harian</span>
            </button>

            {currentRole === 'pmo' && (
              <button
                onClick={onOpenEscalations}
                className={`flex items-center gap-1 text-[11.5px] 2xl:text-xs py-1.5 px-2 2xl:px-2.5 rounded-lg transition-colors shrink-0 font-semibold border whitespace-nowrap ${
                  overdueCount > 0
                    ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
                title="Buka Peringatan Keterlambatan Pelaporan (Kirim Notifikasi WhatsApp & Email ke Kontraktor)"
              >
                <Bell className={`w-3.5 h-3.5 shrink-0 ${overdueCount > 0 ? 'text-red-600' : 'text-slate-500'}`} />
                <span>Peringatan Keterlambatan{overdueCount > 0 ? ` (${overdueCount})` : ''}</span>
              </button>
            )}
          </nav>
        )}

        {/* Zone 3: Locked Role Account Identity & Logout (No cross-role switching) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-[11.5px] 2xl:text-xs font-bold text-slate-800 whitespace-nowrap">
            {currentRole === 'contractor' ? (
              <>
                <HardHat className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="hidden sm:inline">KONTRAKTOR</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="hidden sm:inline">PMO</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1 px-2 2xl:px-2.5 py-1.5 text-[11.5px] 2xl:text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            title="Keluar dari akun saat ini"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>
    </header>
  );
};
