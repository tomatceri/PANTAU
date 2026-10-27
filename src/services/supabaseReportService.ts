import { supabase } from '../lib/supabase';
import { DailyReport } from '../types';

export const SUPABASE_TABLE_NAME = 'laporan_harian';

export const SUPABASE_SETUP_SQL = `-- Skrip SQL untuk membuat tabel Laporan Harian di Supabase
-- Buka Supabase Dashboard > SQL Editor > New Query, lalu paste dan Run skrip berikut:

CREATE TABLE IF NOT EXISTS public.laporan_harian (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  report_number TEXT,
  report_date TEXT NOT NULL,
  nomor_bpmpo TEXT,
  doc_code TEXT,
  doc_effective_date TEXT,
  doc_footer_code TEXT,
  submission_timing TEXT,
  approval_status TEXT DEFAULT 'draft',
  submitted_at TEXT,
  is_rest_day BOOLEAN DEFAULT FALSE,
  weather JSONB,
  hourly_weather JSONB,
  boq_items JSONB,
  bom_items JSONB,
  manpower JSONB,
  equipment JSONB,
  attendees JSONB,
  materials JSONB,
  activities JSONB,
  photos JSONB,
  notes TEXT,
  general_notes TEXT,
  contractor_signatory JSONB,
  consultant_signatory JSONB,
  pmo_signatory JSONB,
  scanned_hardcopy JSONB,
  revision_notes JSONB,
  raw_data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aktifkan Row Level Security (RLS) & Kebijakan Akses Publik (Anon Key)
ALTER TABLE public.laporan_harian ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read" ON public.laporan_harian 
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow anon insert" ON public.laporan_harian 
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow anon update" ON public.laporan_harian 
  FOR UPDATE TO anon, authenticated USING (true);

CREATE POLICY "Allow anon delete" ON public.laporan_harian 
  FOR DELETE TO anon, authenticated USING (true);

-- Index untuk performa pencarian berdasarkan project_id dan report_date
CREATE INDEX IF NOT EXISTS idx_laporan_harian_proj_date 
  ON public.laporan_harian (project_id, report_date);
`;

export interface SupabaseSyncStatus {
  connected: boolean;
  tableExists: boolean;
  message: string;
  reportCount?: number;
}

/**
 * Checks connectivity to Supabase and verifies if public.laporan_harian table exists
 */
export async function checkSupabaseConnection(): Promise<SupabaseSyncStatus> {
  try {
    const { data, error, count } = await supabase
      .from(SUPABASE_TABLE_NAME)
      .select('id', { count: 'exact', head: true });

    if (error) {
      if (error.code === 'PGRST205' || error.message.includes('not find the table')) {
        return {
          connected: true,
          tableExists: false,
          message: `Terkoneksi ke Supabase, namun tabel '${SUPABASE_TABLE_NAME}' belum dibuat. Jalankan skrip SQL di editor Supabase.`,
        };
      }
      return {
        connected: false,
        tableExists: false,
        message: error.message || 'Gagal terhubung ke Supabase.',
      };
    }

    return {
      connected: true,
      tableExists: true,
      message: `Terhubung & sinkron dengan Supabase (${count ?? 0} data laporan).`,
      reportCount: count ?? 0,
    };
  } catch (err: any) {
    return {
      connected: false,
      tableExists: false,
      message: err?.message || 'Gagal memeriksa koneksi Supabase.',
    };
  }
}

/**
 * Converts a database record back to DailyReport format
 */
function recordToDailyReport(record: any): DailyReport {
  if (record.raw_data && typeof record.raw_data === 'object' && record.raw_data.id) {
    return {
      ...record.raw_data,
      id: record.id || record.raw_data.id,
      projectId: record.project_id || record.raw_data.projectId,
      reportNumber: record.report_number || record.raw_data.reportNumber,
      reportDate: record.report_date || record.raw_data.reportDate,
      approvalStatus: record.approval_status || record.raw_data.approvalStatus,
    };
  }

  return {
    id: record.id,
    projectId: record.project_id,
    reportNumber: record.report_number || `REP-D-${record.report_date?.replace(/-/g, '')}`,
    reportDate: record.report_date,
    nomorBpmpo: record.nomor_bpmpo || '',
    docCode: record.doc_code || 'AAA/CONS/FM-014 Rev01',
    docEffectiveDate: record.doc_effective_date || '14 Juli 2025',
    docFooterCode: record.doc_footer_code || 'Daily Report-P2-ND000-JDU-09',
    submissionTiming: record.submission_timing || 'on-time',
    approvalStatus: record.approval_status || 'draft',
    submittedAt: record.submitted_at,
    isRestDay: record.is_rest_day ?? false,
    weather: record.weather || { condition: 'Clear', downtimeHours: 0, claimEligible: false, delayReason: '' },
    hourlyWeather: record.hourly_weather || {},
    boqItems: record.boq_items || [],
    bomItems: record.bom_items || [],
    manpower: record.manpower || [],
    equipment: record.equipment || [],
    attendees: record.attendees || [],
    materials: record.materials || [],
    activities: record.activities || [],
    photos: record.photos || [],
    notes: record.notes,
    generalNotes: record.general_notes,
    contractorSignatory: record.contractor_signatory,
    consultantSignatory: record.consultant_signatory,
    pmoSignatory: record.pmo_signatory,
    scannedHardcopy: record.scanned_hardcopy,
    revisionNotes: record.revision_notes || [],
  };
}

/**
 * Loads all Daily Reports stored in Supabase
 */
export async function loadReportsFromSupabase(): Promise<DailyReport[] | null> {
  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLE_NAME)
      .select('*')
      .order('report_date', { ascending: false });

    if (error) {
      console.warn('[Supabase] Failed to fetch laporan_harian:', error.message);
      return null;
    }

    if (!data) return [];
    return data.map(recordToDailyReport);
  } catch (err) {
    console.warn('[Supabase] Unexpected error fetching reports:', err);
    return null;
  }
}

/**
 * Saves or updates a Daily Report in Supabase database
 */
export async function saveReportToSupabase(report: DailyReport): Promise<{ success: boolean; message: string; error?: any }> {
  // Try saving with full normalized columns
  const payload = {
    id: report.id,
    project_id: report.projectId,
    report_number: report.reportNumber,
    report_date: report.reportDate,
    nomor_bpmpo: report.nomorBpmpo,
    doc_code: report.docCode,
    doc_effective_date: report.docEffectiveDate,
    doc_footer_code: report.docFooterCode,
    submission_timing: report.submissionTiming,
    approval_status: report.approvalStatus,
    submitted_at: report.submittedAt || null,
    is_rest_day: report.isRestDay ?? false,
    weather: report.weather,
    hourly_weather: report.hourlyWeather,
    boq_items: report.boqItems,
    bom_items: report.bomItems,
    manpower: report.manpower,
    equipment: report.equipment,
    attendees: report.attendees,
    materials: report.materials,
    activities: report.activities,
    photos: report.photos,
    notes: report.notes || null,
    general_notes: report.generalNotes || null,
    contractor_signatory: report.contractorSignatory || null,
    consultant_signatory: report.consultantSignatory || null,
    pmo_signatory: report.pmoSignatory || null,
    scanned_hardcopy: report.scannedHardcopy || null,
    revision_notes: report.revisionNotes || [],
    raw_data: report,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLE_NAME)
      .upsert(payload, { onConflict: 'id' })
      .select('id');

    if (error) {
      // If error is missing column or schema mismatch, try simplified raw_data fallback
      if (error.code === '42703' || error.message.includes('column')) {
        const simplePayload = {
          id: report.id,
          project_id: report.projectId,
          report_date: report.reportDate,
          raw_data: report,
          updated_at: new Date().toISOString(),
        };
        const { error: simpleErr } = await supabase
          .from(SUPABASE_TABLE_NAME)
          .upsert(simplePayload, { onConflict: 'id' });

        if (!simpleErr) {
          return { success: true, message: 'Laporan berhasil disimpan ke Supabase.' };
        }
      }

      return {
        success: false,
        message: `Supabase: ${error.message}`,
        error,
      };
    }

    return {
      success: true,
      message: 'Laporan berhasil disimpan dan disinkronkan ke Supabase.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Gagal menyimpan ke Supabase.',
      error: err,
    };
  }
}
