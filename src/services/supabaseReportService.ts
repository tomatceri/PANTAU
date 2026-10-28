import { supabase } from '../lib/supabase';
import { DailyReport, Project } from '../types';

export const SUPABASE_TABLE_NAME = 'laporan_harian';

/**
 * SQL script for users who already created the table and need to add human-readable columns
 * and fix the "policy already exists" error (42710).
 */
export const SUPABASE_ADD_COLUMNS_SQL = `-- SKRIP PEMBARUAN: Tambah Kolom Detail Laporan & Perbaikan Policy
-- Jalankan di Supabase Dashboard > SQL Editor > New Query > Paste > Run

-- 1. Tambahkan kolom-kolom teks yang langsung terbaca di Supabase Table Editor
ALTER TABLE public.laporan_harian 
  ADD COLUMN IF NOT EXISTS nama_proyek TEXT,
  ADD COLUMN IF NOT EXISTS nama_kontraktor TEXT,
  ADD COLUMN IF NOT EXISTS lokasi_proyek TEXT,
  ADD COLUMN IF NOT EXISTS nomor_bpmpo TEXT,
  ADD COLUMN IF NOT EXISTS tanggal_laporan TEXT,
  ADD COLUMN IF NOT EXISTS status_laporan TEXT,
  ADD COLUMN IF NOT EXISTS kondisi_cuaca TEXT,
  ADD COLUMN IF NOT EXISTS total_tenaga_kerja INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rincian_tenaga_kerja TEXT,
  ADD COLUMN IF NOT EXISTS total_peralatan INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rincian_peralatan TEXT,
  ADD COLUMN IF NOT EXISTS rincian_pekerjaan TEXT,
  ADD COLUMN IF NOT EXISTS rincian_boq TEXT,
  ADD COLUMN IF NOT EXISTS rincian_material TEXT,
  ADD COLUMN IF NOT EXISTS daftar_hadir TEXT,
  ADD COLUMN IF NOT EXISTS catatan_pekerjaan TEXT,
  ADD COLUMN IF NOT EXISTS ttd_kontraktor TEXT,
  ADD COLUMN IF NOT EXISTS ttd_konsultan TEXT,
  ADD COLUMN IF NOT EXISTS ttd_pmo TEXT,
  ADD COLUMN IF NOT EXISTS jumlah_foto INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS keterangan_foto TEXT,
  ADD COLUMN IF NOT EXISTS scanned_hardcopy_info TEXT;

-- 2. Hapus policy lama terlebih dahulu (Mencegah ERROR 42710: policy already exists)
DROP POLICY IF EXISTS "Allow anon read" ON public.laporan_harian;
DROP POLICY IF EXISTS "Allow anon insert" ON public.laporan_harian;
DROP POLICY IF EXISTS "Allow anon update" ON public.laporan_harian;
DROP POLICY IF EXISTS "Allow anon delete" ON public.laporan_harian;

-- 3. Buat ulang policy akses publik
CREATE POLICY "Allow anon read" ON public.laporan_harian 
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow anon insert" ON public.laporan_harian 
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow anon update" ON public.laporan_harian 
  FOR UPDATE TO anon, authenticated USING (true);

CREATE POLICY "Allow anon delete" ON public.laporan_harian 
  FOR DELETE TO anon, authenticated USING (true);
`;

/**
 * Full idempotent SQL script to create the table from scratch with all readable and JSON columns.
 */
export const SUPABASE_SETUP_SQL = `-- SKRIP LENGKAP: Buat Tabel Laporan Harian dengan Kolom Rinci Terbaca
-- Buka Supabase Dashboard > SQL Editor > New Query, paste skrip ini lalu klik Run

-- 1. Buat tabel utama
CREATE TABLE IF NOT EXISTS public.laporan_harian (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  nama_proyek TEXT,
  nama_kontraktor TEXT,
  lokasi_proyek TEXT,
  report_number TEXT,
  report_date TEXT NOT NULL,
  tanggal_laporan TEXT,
  nomor_bpmpo TEXT,
  doc_code TEXT,
  doc_effective_date TEXT,
  doc_footer_code TEXT,
  submission_timing TEXT,
  approval_status TEXT DEFAULT 'draft',
  status_laporan TEXT,
  submitted_at TEXT,
  is_rest_day BOOLEAN DEFAULT FALSE,
  kondisi_cuaca TEXT,
  weather JSONB,
  hourly_weather JSONB,
  total_tenaga_kerja INTEGER DEFAULT 0,
  rincian_tenaga_kerja TEXT,
  manpower JSONB,
  total_peralatan INTEGER DEFAULT 0,
  rincian_peralatan TEXT,
  equipment JSONB,
  rincian_pekerjaan TEXT,
  activities JSONB,
  rincian_boq TEXT,
  boq_items JSONB,
  bom_items JSONB,
  rincian_material TEXT,
  materials JSONB,
  daftar_hadir TEXT,
  attendees JSONB,
  catatan_pekerjaan TEXT,
  notes TEXT,
  general_notes TEXT,
  ttd_kontraktor TEXT,
  contractor_signatory JSONB,
  ttd_konsultan TEXT,
  consultant_signatory JSONB,
  ttd_pmo TEXT,
  pmo_signatory JSONB,
  jumlah_foto INTEGER DEFAULT 0,
  keterangan_foto TEXT,
  photos JSONB,
  scanned_hardcopy_info TEXT,
  scanned_hardcopy JSONB,
  revision_notes JSONB,
  raw_data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Pastikan kolom-kolom detail ada (jika tabel sudah pernah dibuat sebelumnya)
ALTER TABLE public.laporan_harian 
  ADD COLUMN IF NOT EXISTS nama_proyek TEXT,
  ADD COLUMN IF NOT EXISTS nama_kontraktor TEXT,
  ADD COLUMN IF NOT EXISTS lokasi_proyek TEXT,
  ADD COLUMN IF NOT EXISTS nomor_bpmpo TEXT,
  ADD COLUMN IF NOT EXISTS tanggal_laporan TEXT,
  ADD COLUMN IF NOT EXISTS status_laporan TEXT,
  ADD COLUMN IF NOT EXISTS kondisi_cuaca TEXT,
  ADD COLUMN IF NOT EXISTS total_tenaga_kerja INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rincian_tenaga_kerja TEXT,
  ADD COLUMN IF NOT EXISTS total_peralatan INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rincian_peralatan TEXT,
  ADD COLUMN IF NOT EXISTS rincian_pekerjaan TEXT,
  ADD COLUMN IF NOT EXISTS rincian_boq TEXT,
  ADD COLUMN IF NOT EXISTS rincian_material TEXT,
  ADD COLUMN IF NOT EXISTS daftar_hadir TEXT,
  ADD COLUMN IF NOT EXISTS catatan_pekerjaan TEXT,
  ADD COLUMN IF NOT EXISTS ttd_kontraktor TEXT,
  ADD COLUMN IF NOT EXISTS ttd_konsultan TEXT,
  ADD COLUMN IF NOT EXISTS ttd_pmo TEXT,
  ADD COLUMN IF NOT EXISTS jumlah_foto INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS keterangan_foto TEXT,
  ADD COLUMN IF NOT EXISTS scanned_hardcopy_info TEXT;

-- 3. Aktifkan Row Level Security (RLS)
ALTER TABLE public.laporan_harian ENABLE ROW LEVEL SECURITY;

-- 4. Hapus policy lama jika ada agar TIDAK ERROR 42710 saat dijalankan ulang
DROP POLICY IF EXISTS "Allow anon read" ON public.laporan_harian;
DROP POLICY IF EXISTS "Allow anon insert" ON public.laporan_harian;
DROP POLICY IF EXISTS "Allow anon update" ON public.laporan_harian;
DROP POLICY IF EXISTS "Allow anon delete" ON public.laporan_harian;

-- 5. Buat kebijakan akses publik (Anon Key)
CREATE POLICY "Allow anon read" ON public.laporan_harian 
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow anon insert" ON public.laporan_harian 
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow anon update" ON public.laporan_harian 
  FOR UPDATE TO anon, authenticated USING (true);

CREATE POLICY "Allow anon delete" ON public.laporan_harian 
  FOR DELETE TO anon, authenticated USING (true);

-- 6. Index untuk kecepatan query
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
 * Project meta lookup to fill human-readable project details in database
 */
const PROJECT_LOOKUP: Record<string, { name: string; contractor: string; location: string }> = {
  'proj-0': {
    name: 'Pemasangan pipa transmisi Air Baku unit Prasedimentasi',
    contractor: 'PT Mandiri',
    location: 'Unit Prasedimentasi - Saluran Transmisi Air Baku',
  },
  'proj-1': {
    name: 'Metro Elevated Viaduct Section 2A',
    contractor: 'PT Jaya Konstruksi - Obayashi JV',
    location: 'Central Corridor, Station 14+200 to 18+600',
  },
  'proj-2': {
    name: 'Harbor Logistics Hub - Phase 3 Wharf Expansion',
    contractor: 'Adhi Karya - McConnell Dowell Consortium',
    location: 'Port Basin Area 4, Berth 12-15',
  },
  'proj-1793091923901': {
    name: 'Renewal Tube Settler',
    contractor: 'PT. BESTINDO PUTRA MANDIRI',
    location: 'Unit Sedimentasi & Tube Settler',
  },
};

export function registerProjectMeta(project: Project) {
  PROJECT_LOOKUP[project.id] = {
    name: project.name,
    contractor: project.contractorName,
    location: project.location,
  };
}

const LOCAL_STORAGE_PROJECTS_KEY = 'pantau_saved_projects_v2';

export function getStoredCustomProjects(): Project[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PROJECTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveStoredCustomProjects(projects: Project[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(projects));
  } catch {
    // ignore
  }
}

/**
 * Automatically discovers any projects referenced by reports from Supabase / Vercel
 * so that they immediately appear in the Project List and Calendar.
 */
export function inferProjectsFromReports(reports: DailyReport[], existingProjects: Project[]): Project[] {
  const projectMap = new Map<string, Project>();
  existingProjects.forEach((p) => {
    projectMap.set(p.id, p);
    registerProjectMeta(p);
  });

  for (const report of reports) {
    if (!projectMap.has(report.projectId)) {
      const raw = (report as any).raw_data || {};
      const foundName =
        raw.photos?.[0]?.projectName ||
        report.photos?.[0]?.projectName ||
        raw.projectName ||
        (report as any).nama_proyek ||
        (report.projectId === 'proj-1793091923901' ? 'Renewal Tube Settler' : `Proyek ${report.projectId}`);

      const foundContractor =
        report.contractorSignatory?.companyName ||
        raw.contractorSignatory?.companyName ||
        (report as any).nama_kontraktor ||
        (report.projectId === 'proj-1793091923901' ? 'PT. BESTINDO PUTRA MANDIRI' : 'PT Kontraktor Lapangan');

      const foundPmo =
        report.pmoSignatory?.signedBy
          ? `${report.pmoSignatory.signedBy} (${report.pmoSignatory.companyName || 'PMO'})`
          : (report.projectId === 'proj-1793091923901' ? 'Simun Riyanto (PT AubreyKeylaRapli)' : 'Tim Pengawas PMO');

      const foundLocation =
        (report as any).lokasi_proyek ||
        raw.location ||
        (report.projectId === 'proj-1793091923901' ? 'Unit Sedimentasi & Tube Settler' : 'Lokasi Proyek');

      const newProject: Project = {
        id: report.projectId,
        name: foundName,
        code: report.projectId === 'proj-1793091923901' ? 'RTS-01' : `PRJ-${report.projectId.replace(/\D/g, '').slice(-4) || 'NEW'}`,
        contractorName: foundContractor,
        pmoLead: foundPmo,
        location: foundLocation,
        coordinates: '-6.2088° S, 106.8456° E',
        startDate: report.reportDate || '2026-10-01',
        targetDate: '2027-12-31',
        status: 'Active',
        description: 'Proyek pelaporan harian sinkronisasi otomatis dari cloud Vercel & Supabase.',
        targetSubmissionHour: 9,
      };

      projectMap.set(report.projectId, newProject);
      registerProjectMeta(newProject);
    }
  }

  const result = Array.from(projectMap.values());
  saveStoredCustomProjects(result);
  return result;
}

/**
 * Subscribes to realtime Postgres changes in Supabase laporan_harian table
 */
export function subscribeToSupabaseReports(onUpdate: () => void): () => void {
  try {
    const channel = supabase
      .channel('realtime_laporan_harian')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: SUPABASE_TABLE_NAME,
        },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[Supabase] Realtime error:', err);
    return () => {};
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
      nomorBpmpo: record.nomor_bpmpo || record.raw_data.nomorBpmpo || '',
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
 * Formats manpower into readable summary string
 */
function formatManpowerSummary(manpower: any[]): { total: number; summary: string } {
  if (!Array.isArray(manpower) || manpower.length === 0) {
    return { total: 0, summary: 'Tidak ada data tenaga kerja' };
  }
  const total = manpower.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  const parts = manpower
    .filter(item => (Number(item.count) || 0) > 0 || item.trade)
    .map(item => `${item.trade || 'Pekerja'}: ${item.count || 0} org (${item.hoursWorked || 8} jam)`);
  return {
    total,
    summary: parts.length > 0 ? `${parts.join(' | ')} (Total: ${total} orang)` : '0 orang',
  };
}

/**
 * Formats equipment into readable summary string
 */
function formatEquipmentSummary(equipment: any[]): { total: number; summary: string } {
  if (!Array.isArray(equipment) || equipment.length === 0) {
    return { total: 0, summary: 'Tidak ada alat berat digunakan' };
  }
  const total = equipment.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  const parts = equipment
    .filter(item => item.equipmentName)
    .map(item => `${item.equipmentName}: ${item.count || 1} unit (${item.operationalHours || 0} jam - ${item.status || 'Standby'})`);
  return {
    total,
    summary: parts.length > 0 ? parts.join(' | ') : 'Tidak ada alat berat',
  };
}

/**
 * Formats activities into numbered lines
 */
function formatActivitiesSummary(activities: any[]): string {
  if (!Array.isArray(activities) || activities.length === 0) {
    return 'Tidak ada aktivitas pekerjaan tercatat';
  }
  return activities
    .map((act, idx) => `${idx + 1}. ${act.description || 'Pekerjaan'} [${act.location || 'Site'}] - ${act.progressPercent ?? 0}% (${act.status || 'In Progress'})`)
    .join('\n');
}

/**
 * Formats BOQ items
 */
function formatBoqSummary(boqItems: any[]): string {
  if (!Array.isArray(boqItems) || boqItems.length === 0) return '-';
  return boqItems
    .map(b => `${b.itemCode || ''} ${b.description || ''}: Harian ${b.dailyVolume || 0} ${b.unit || ''} (Kum: ${b.cumulativeVolume || 0}/${b.contractVolume || 0} - ${b.cumulativePercentage || 0}%)`)
    .join(' | ');
}

/**
 * Formats materials
 */
function formatMaterialsSummary(materials: any[]): string {
  if (!Array.isArray(materials) || materials.length === 0) return 'Tidak ada material masuk hari ini';
  return materials
    .map(m => `${m.materialName || 'Material'}: ${m.quantity || 0} ${m.unit || ''} (Pemasok: ${m.supplier || '-'}, Tiket: ${m.deliveryTicket || '-'})`)
    .join(' | ');
}

/**
 * Formats attendees
 */
function formatAttendeesSummary(attendees: any[]): string {
  if (!Array.isArray(attendees) || attendees.length === 0) return '-';
  return attendees
    .map(a => `${a.name || '-'} (${a.role || 'Staff'} - ${a.institution || '-'}) [${a.attendanceStatus || 'Hadir'}]`)
    .join(', ');
}

/**
 * Formats signature info
 */
function formatSignatoryText(sig: any): string {
  if (!sig || !sig.signedBy) return 'Belum ditandatangani';
  return `${sig.signedBy} (${sig.title || 'Penanggung Jawab'}) - TTD Terverifikasi [${sig.timestamp || 'Digital'}]`;
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
 * Saves or updates a Daily Report in Supabase database with human-readable explicit columns
 */
export async function saveReportToSupabase(report: DailyReport): Promise<{ success: boolean; message: string; error?: any }> {
  const projMeta = PROJECT_LOOKUP[report.projectId] || {
    name: report.projectId,
    contractor: 'Kontraktor Pelaksana',
    location: 'Lokasi Proyek',
  };

  // Ensure nomor_bpmpo is never NULL
  const nomorBpmpo = report.nomorBpmpo && report.nomorBpmpo.trim() !== ''
    ? report.nomorBpmpo
    : `BPMPO/2026/X/${report.reportDate.split('-')[2] || '001'}`;

  const mpSummary = formatManpowerSummary(report.manpower || []);
  const eqSummary = formatEquipmentSummary(report.equipment || []);
  const actSummary = formatActivitiesSummary(report.activities || []);
  const boqSummary = formatBoqSummary(report.boqItems || []);
  const matSummary = formatMaterialsSummary(report.materials || []);
  const attSummary = formatAttendeesSummary(report.attendees || []);

  const statusLabel = 
    report.approvalStatus === 'approved' ? 'DISETUJUI / APPROVED' :
    report.approvalStatus === 'submitted' ? 'MENUNGGU PERSETUJUAN / SUBMITTED' :
    report.approvalStatus === 'needs_revision' ? 'PERLU REVISI / REVISION' :
    report.approvalStatus === 'under_review' ? 'SEDANG DITINJAU / UNDER REVIEW' : 'DRAFT (KONTRAKTOR)';

  const cuacaText = `${report.weather?.condition || 'Cerah'} (Downtime: ${report.weather?.downtimeHours || 0} jam${report.weather?.delayReason ? `, Keterangan: ${report.weather.delayReason}` : ''})`;

  const photoCount = report.photos?.length || 0;
  const photoDetails = photoCount > 0
    ? report.photos.map((p, idx) => `Foto ${idx + 1}: ${p.caption || 'Dokumentasi Lapangan'}`).join('; ')
    : 'Tidak ada foto terlampir';

  const scanInfo = report.scannedHardcopy
    ? `${report.scannedHardcopy.fileName} (Diupload: ${report.scannedHardcopy.uploadedBy || 'PMO'} pada ${report.scannedHardcopy.uploadedAt})`
    : 'Tidak ada scan hardcopy';

  // Complete payload with BOTH readable columns AND structured JSON
  const richPayload: Record<string, any> = {
    id: report.id,
    project_id: report.projectId,
    nama_proyek: projMeta.name,
    nama_kontraktor: projMeta.contractor,
    lokasi_proyek: projMeta.location,
    report_number: report.reportNumber,
    report_date: report.reportDate,
    tanggal_laporan: report.reportDate,
    nomor_bpmpo: nomorBpmpo,
    doc_code: report.docCode || 'AAA/CONS/FM-014 Rev01',
    doc_effective_date: report.docEffectiveDate || '14 Juli 2025',
    doc_footer_code: report.docFooterCode || 'Daily Report-P2-ND000-JDU-09',
    submission_timing: report.submissionTiming,
    approval_status: report.approvalStatus,
    status_laporan: statusLabel,
    submitted_at: report.submittedAt || null,
    is_rest_day: report.isRestDay ?? false,
    kondisi_cuaca: cuacaText,
    weather: report.weather,
    hourly_weather: report.hourlyWeather,
    total_tenaga_kerja: mpSummary.total,
    rincian_tenaga_kerja: mpSummary.summary,
    manpower: report.manpower,
    total_peralatan: eqSummary.total,
    rincian_peralatan: eqSummary.summary,
    equipment: report.equipment,
    rincian_pekerjaan: actSummary,
    activities: report.activities,
    rincian_boq: boqSummary,
    boq_items: report.boqItems,
    bom_items: report.bomItems,
    rincian_material: matSummary,
    materials: report.materials,
    daftar_hadir: attSummary,
    attendees: report.attendees,
    catatan_pekerjaan: report.generalNotes || report.notes || 'Tidak ada catatan khusus.',
    notes: report.notes || null,
    general_notes: report.generalNotes || null,
    ttd_kontraktor: formatSignatoryText(report.contractorSignatory),
    contractor_signatory: report.contractorSignatory || null,
    ttd_konsultan: formatSignatoryText(report.consultantSignatory),
    consultant_signatory: report.consultantSignatory || null,
    ttd_pmo: formatSignatoryText(report.pmoSignatory),
    pmo_signatory: report.pmoSignatory || null,
    jumlah_foto: photoCount,
    keterangan_foto: photoDetails,
    photos: report.photos,
    scanned_hardcopy_info: scanInfo,
    scanned_hardcopy: report.scannedHardcopy || null,
    revision_notes: report.revisionNotes || [],
    raw_data: {
      ...report,
      nomorBpmpo,
    },
    updated_at: new Date().toISOString(),
  };

  try {
    // Attempt 1: Upsert with rich columns
    const { error: richErr } = await supabase
      .from(SUPABASE_TABLE_NAME)
      .upsert(richPayload, { onConflict: 'id' });

    if (!richErr) {
      return {
        success: true,
        message: 'Laporan berhasil disimpan ke Supabase lengkap dengan rincian tenaga kerja, peralatan, dan TTD!',
      };
    }

    // Attempt 2: If rich columns don't exist yet (e.g. PGRST204 column not found), fallback to original 32 base columns
    if (richErr.code === 'PGRST204' || richErr.code === '42703' || richErr.message.includes('column')) {
      const basePayload: Record<string, any> = {
        id: report.id,
        project_id: report.projectId,
        report_number: report.reportNumber,
        report_date: report.reportDate,
        nomor_bpmpo: nomorBpmpo,
        doc_code: report.docCode || 'AAA/CONS/FM-014 Rev01',
        doc_effective_date: report.docEffectiveDate || '14 Juli 2025',
        doc_footer_code: report.docFooterCode || 'Daily Report-P2-ND000-JDU-09',
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
        raw_data: {
          ...report,
          nomorBpmpo,
        },
        updated_at: new Date().toISOString(),
      };

      const { error: baseErr } = await supabase
        .from(SUPABASE_TABLE_NAME)
        .upsert(basePayload, { onConflict: 'id' });

      if (!baseErr) {
        return {
          success: true,
          message: 'Laporan tersimpan (Jalankan ALTER TABLE di Supabase untuk mengaktifkan kolom tenaga kerja & TTD langsung).',
        };
      }

      // Attempt 3: Minimal fallback
      const minimalPayload = {
        id: report.id,
        project_id: report.projectId,
        report_date: report.reportDate,
        raw_data: report,
        updated_at: new Date().toISOString(),
      };
      const { error: minErr } = await supabase
        .from(SUPABASE_TABLE_NAME)
        .upsert(minimalPayload, { onConflict: 'id' });

      if (!minErr) {
        return { success: true, message: 'Laporan disimpan dalam format raw_data.' };
      }

      return {
        success: false,
        message: `Gagal simpan ke Supabase: ${richErr.message}`,
        error: richErr,
      };
    }

    return {
      success: false,
      message: `Supabase: ${richErr.message}`,
      error: richErr,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Gagal menyimpan ke Supabase.',
      error: err,
    };
  }
}
