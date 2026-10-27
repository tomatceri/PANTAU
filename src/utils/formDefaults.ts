import { BoqItem, BomItem, HourlyWeatherCode, AttendeeItem, SignatoryInfo, ManpowerEntry, EquipmentEntry } from '../types';

export const HOURS_24: string[] = [
  '01:00', '02:00', '03:00', '04:00', '05:00', '06:00',
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  '19:00', '20:00', '21:00', '22:00', '23:00', '24:00',
];

export const WEATHER_LEGEND: { code: HourlyWeatherCode; label: string; desc: string; color: string }[] = [
  { code: 'C', label: 'Cerah', desc: 'Cuaca cerah panas / tanpa hambatan', color: 'bg-amber-100 text-amber-900 border-amber-300' },
  { code: 'M', label: 'Mendung', desc: 'Berawan / mendung tipis', color: 'bg-slate-200 text-slate-800 border-slate-300' },
  { code: 'G', label: 'Gerimis', desc: 'Hujan ringan / gerimis', color: 'bg-blue-100 text-blue-900 border-blue-300' },
  { code: 'H', label: 'Hujan', desc: 'Hujan lebat / pekerjaan terhenti (Downtime EOT)', color: 'bg-indigo-100 text-indigo-900 border-indigo-400 font-bold' },
];

export function createDefault24hWeather(pattern: 'clear' | 'afternoon_rain' | 'cloudy' = 'clear'): Record<string, HourlyWeatherCode> {
  const result: Record<string, HourlyWeatherCode> = {};
  for (const hour of HOURS_24) {
    if (pattern === 'afternoon_rain') {
      const hNum = parseInt(hour.split(':')[0], 10);
      if (hNum >= 14 && hNum <= 16) {
        result[hour] = 'H';
      } else if (hNum === 13 || hNum === 17) {
        result[hour] = 'M';
      } else {
        result[hour] = 'C';
      }
    } else if (pattern === 'cloudy') {
      result[hour] = 'M';
    } else {
      result[hour] = 'C';
    }
  }
  return result;
}

export function calculateWeatherDowntime(hourly: Record<string, HourlyWeatherCode> | undefined): { downtimeHours: number; claimEligible: boolean } {
  if (!hourly) return { downtimeHours: 0, claimEligible: false };
  let rainCount = 0;
  for (const hour of HOURS_24) {
    const code = hourly[hour];
    if (code === 'H') rainCount += 1;
    else if (code === 'G') rainCount += 0.5;
  }
  return {
    downtimeHours: rainCount,
    claimEligible: rainCount > 0,
  };
}

export const DEFAULT_ATTENDEES: AttendeeItem[] = [
  { id: 'att-1', nama: 'Adhe Juliawaludin', jabatan: 'Supervisor', instansi: '' },
  { id: 'att-2', nama: 'Anis Sulfuad', jabatan: 'HSE', instansi: '' },
];

export const DEFAULT_MANPOWER: ManpowerEntry[] = [
  { id: 'mp-1', trade: 'Mandor Lapangan', count: 2, hoursWorked: 8 },
  { id: 'mp-2', trade: 'Tukang Pipa HDPE', count: 6, hoursWorked: 8 },
  { id: 'mp-3', trade: 'Welder HDPE (Butt Fusion)', count: 3, hoursWorked: 8 },
  { id: 'mp-4', trade: 'Operator Alat Berat (Excavator)', count: 3, hoursWorked: 8 },
  { id: 'mp-5', trade: 'Pekerja Umum / Helper', count: 14, hoursWorked: 8 },
  { id: 'mp-6', trade: 'Safety / HSE Officer', count: 1, hoursWorked: 8 },
  { id: 'mp-7', trade: 'Surveyor & Staf Teknik', count: 2, hoursWorked: 8 },
];

export const DEFAULT_EQUIPMENT: EquipmentEntry[] = [
  { id: 'eq-1', equipmentName: 'Excavator PC200', count: 2, operationalHours: 8, status: 'Operating' },
  { id: 'eq-2', equipmentName: 'Mesin Las HDPE Butt Fusion 630', count: 2, operationalHours: 7, status: 'Operating' },
  { id: 'eq-3', equipmentName: 'Dump Truck 20 Ton', count: 4, operationalHours: 8, status: 'Operating' },
  { id: 'eq-4', equipmentName: 'Genset 50 kVA Silent', count: 2, operationalHours: 8, status: 'Operating' },
  { id: 'eq-5', equipmentName: 'Water Pump Submersible 4"', count: 2, operationalHours: 4, status: 'Operating' },
  { id: 'eq-6', equipmentName: 'Mobil Pick Up Operasional', count: 1, operationalHours: 8, status: 'Standby' },
];

export const DEFAULT_BOQ_ITEMS: BoqItem[] = [
  { id: 'boq-1', kode: '1.01', deskripsi: 'Pembersihan & perataan jalur pipa transmisi', satuan: 'm²', install: 150 },
  { id: 'boq-2', kode: '1.02', deskripsi: 'Galian tanah mekanis jalur pipa kedalaman 2.5m', satuan: 'm³', install: 85 },
  { id: 'boq-3', kode: '1.03', deskripsi: 'Pasir urug bedding t=15cm bawah pipa', satuan: 'm³', install: 18 },
  { id: 'boq-4', kode: '2.01', deskripsi: 'Penggelaran pipa HDPE OD 630mm PN10 SDR17', satuan: 'm', install: 60 },
  { id: 'boq-5', kode: '2.02', deskripsi: 'Penyambungan pipa metode Butt Fusion OD 630', satuan: 'joint', install: 5 },
  { id: 'boq-6', kode: '2.03', deskripsi: 'Pemasangan stub end & backing ring DN600', satuan: 'unit', install: 2 },
  { id: 'boq-7', kode: '3.01', deskripsi: 'Urugan tanah kembali & pemadatan lapis per lapis', satuan: 'm³', install: 65 },
  { id: 'boq-8', kode: '3.02', deskripsi: 'Uji tekan hidrostatis pipa (Hydrotest 10 bar)', satuan: 'm', install: 0 },
];

export const DEFAULT_BOM_ITEMS: BomItem[] = [
  { id: 'bom-1', kode: 'M-01', jenisMaterial: 'Pipa HDPE OD 630mm PN10 PE100 SDR17', satuan: 'btg', install: 5 },
  { id: 'bom-2', kode: 'M-02', jenisMaterial: 'Stub End HDPE OD 630mm', satuan: 'bh', install: 2 },
  { id: 'bom-3', kode: 'M-03', jenisMaterial: 'Backing Ring Steel Galvanized DN600', satuan: 'bh', install: 2 },
  { id: 'bom-4', kode: 'M-04', jenisMaterial: 'Pasir Urug Bersih', satuan: 'm³', install: 18 },
  { id: 'bom-5', kode: 'M-05', jenisMaterial: 'Baut & Mur Flange M24 High-Tensile', satuan: 'set', install: 24 },
  { id: 'bom-6', kode: 'M-06', jenisMaterial: 'Pita Peringatan Pipa Air Baku (Warning Tape)', satuan: 'roll', install: 1 },
];

export const DEFAULT_SIGNATORIES: {
  contractor: SignatoryInfo;
  consultant: SignatoryInfo;
  pmo: SignatoryInfo;
} = {
  contractor: {
    signedBy: 'Ir. Budi Santoso',
    title: 'Project Manager',
    companyName: 'PT Mandiri',
    roleLabel: 'Project Manager',
  },
  consultant: {
    signedBy: 'Hendra Wijaya, ST',
    title: 'Team Leader',
    companyName: 'PT KeylaAubreyRapli',
    roleLabel: 'Project Manager Konsultan,',
  },
  pmo: {
    signedBy: 'Aubrey F., M.T.',
    title: 'Project Manager',
    companyName: 'PT AubreyKeylaRapli',
    roleLabel: 'Project Manager,',
  },
};

export function getRealTodayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatIndonesianDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

export interface EquipmentStatusOption {
  value: string;
  label: string;
  color?: string;
  isCustom?: boolean;
}

export const INITIAL_EQUIPMENT_STATUS_OPTIONS: EquipmentStatusOption[] = [
  { value: 'Operating', label: 'Baik / Operasi', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'Standby', label: 'Standby di site', color: 'bg-amber-100 text-amber-800' },
  { value: 'Breakdown', label: 'Breakdown / Servis', color: 'bg-red-100 text-red-800' },
  { value: 'Dalam Perbaikan', label: 'Dalam Perbaikan', color: 'bg-orange-100 text-orange-800' },
  { value: 'Mobilisasi', label: 'Mobilisasi', color: 'bg-blue-100 text-blue-800' },
  { value: 'Demobilisasi', label: 'Demobilisasi', color: 'bg-purple-100 text-purple-800' },
  { value: 'Rusak Ringan', label: 'Rusak Ringan', color: 'bg-rose-100 text-rose-800' },
];
