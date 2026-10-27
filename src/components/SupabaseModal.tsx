import React, { useState, useEffect } from 'react';
import { 
  checkSupabaseConnection, 
  saveReportToSupabase, 
  loadReportsFromSupabase,
  SUPABASE_SETUP_SQL, 
  SUPABASE_TABLE_NAME, 
  SupabaseSyncStatus 
} from '../services/supabaseReportService';
import { SUPABASE_URL } from '../lib/supabase';
import { DailyReport } from '../types';
import { 
  Database, CheckCircle2, AlertTriangle, RefreshCw, 
  Copy, Check, ExternalLink, X, UploadCloud, Server
} from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  dailyReports: DailyReport[];
  onReportsReloaded?: (reports: DailyReport[]) => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  dailyReports,
  onReportsReloaded,
}) => {
  const [status, setStatus] = useState<SupabaseSyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [feedback, setFeedback] = useState('');

  const refreshStatus = async () => {
    setIsLoading(true);
    setFeedback('');
    try {
      const res = await checkSupabaseConnection();
      setStatus(res);
    } catch (err: any) {
      setStatus({
        connected: false,
        tableExists: false,
        message: err?.message || 'Gagal memeriksa koneksi',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleSyncAllToSupabase = async () => {
    if (dailyReports.length === 0) return;
    setIsSyncingAll(true);
    setFeedback('');
    setSyncProgress({ current: 0, total: dailyReports.length });

    let successCount = 0;
    let failCount = 0;
    let lastError = '';

    for (let i = 0; i < dailyReports.length; i++) {
      const rep = dailyReports[i];
      setSyncProgress({ current: i + 1, total: dailyReports.length });
      const res = await saveReportToSupabase(rep);
      if (res.success) {
        successCount++;
      } else {
        failCount++;
        lastError = res.message;
      }
    }

    setIsSyncingAll(false);
    setSyncProgress(null);

    if (failCount === 0) {
      setFeedback(`✓ Berhasil menyinkronkan seluruh ${successCount} laporan harian ke tabel '${SUPABASE_TABLE_NAME}' di Supabase!`);
    } else {
      setFeedback(`⚠ Berhasil: ${successCount}, Gagal: ${failCount}. Pesan: ${lastError}`);
    }

    refreshStatus();
  };

  const handleFetchFromSupabase = async () => {
    setIsLoading(true);
    setFeedback('');
    try {
      const reports = await loadReportsFromSupabase();
      if (reports && reports.length > 0) {
        if (onReportsReloaded) {
          onReportsReloaded(reports);
        }
        setFeedback(`✓ Berhasil memuat ${reports.length} laporan harian dari Supabase.`);
      } else {
        setFeedback('Belum ada data laporan harian yang tersimpan di database Supabase.');
      }
    } catch (e: any) {
      setFeedback(`Gagal memuat: ${e.message}`);
    } finally {
      setIsLoading(false);
      refreshStatus();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-auto flex flex-col max-h-[92vh] overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                <span>Integrasi Database Supabase</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  PostgreSQL
                </span>
              </h2>
              <p className="text-xs text-slate-300 font-mono truncate max-w-md">
                {SUPABASE_URL}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs text-slate-700">
          {/* Connection Status Card */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            status?.tableExists
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : status?.connected
              ? 'bg-amber-50/70 border-amber-200 text-amber-900'
              : 'bg-red-50/70 border-red-200 text-red-900'
          }`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm">
                {status?.tableExists ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Database Terhubung &amp; Siap Digunakan</span>
                  </>
                ) : status?.connected ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Terkoneksi ke Supabase (Tabel Belum Dibuat)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>Koneksi Supabase Belum Terhubung</span>
                  </>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {status?.message || 'Memeriksa status koneksi ke Supabase...'}
              </p>
              {status?.tableExists && (
                <p className="text-[11px] font-semibold text-emerald-700">
                  Total Laporan di Database: <span className="font-mono">{status.reportCount ?? 0}</span> data
                </p>
              )}
            </div>

            <button
              onClick={refreshStatus}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg shrink-0 transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Cek Status</span>
            </button>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Table not created notice & SQL script */}
          {!status?.tableExists && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">
                    Langkah: Buat Tabel &lsquo;{SUPABASE_TABLE_NAME}&rsquo; di Supabase
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Buka Supabase Dashboard &gt; <strong>SQL Editor</strong> &gt; buat query baru, paste skrip di bawah lalu klik <strong>Run</strong>.
                  </p>
                </div>
                <button
                  onClick={handleCopySql}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Skrip SQL</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg text-[10.5px] font-mono overflow-x-auto max-h-48 leading-relaxed border border-slate-800">
                  {SUPABASE_SETUP_SQL}
                </pre>
              </div>
            </div>
          )}

          {/* Sync Actions */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-blue-600" />
              <span>Aksi Sinkronisasi Data Laporan</span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Setiap kali form laporan harian disimpan (Simpan Draft, Kirim ke PMO, atau Persetujuan PMO), data secara otomatis tersimpan ke tabel Supabase. Anda juga dapat menyinkronkan seluruh data sekaligus menggunakan tombol berikut:
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleSyncAllToSupabase}
                disabled={isSyncingAll}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>
                  {isSyncingAll
                    ? `Menyinkronkan (${syncProgress?.current}/${syncProgress?.total})...`
                    : `Upload Semua (${dailyReports.length}) Laporan ke Supabase`}
                </span>
              </button>

              <button
                type="button"
                onClick={handleFetchFromSupabase}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Muat Ulang dari Database</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-500">
          <span>Target Tabel: <strong className="font-mono text-slate-700">{SUPABASE_TABLE_NAME}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
