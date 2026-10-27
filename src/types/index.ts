export type UserRole = 'contractor' | 'pmo';

export type SubmissionTimingStatus = 'on-time' | 'late' | 'overdue' | 'upcoming' | 'rest-day';

export type ApprovalStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'needs_revision';

export type WeatherCondition = 'Clear' | 'Sunny' | 'Cloudy' | 'Light Rain' | 'Heavy Rain' | 'Storm';

export interface WeatherLog {
  condition: WeatherCondition;
  downtimeHours: number;
  claimEligible: boolean;
  delayReason: string;
}

export interface ManpowerEntry {
  id: string;
  trade: string;
  count: number;
  hoursWorked: number;
}

export interface EquipmentEntry {
  id: string;
  equipmentName: string;
  count: number;
  operationalHours: number;
  status: 'Operating' | 'Standby' | 'Breakdown' | string;
}

export interface MaterialEntry {
  id: string;
  materialName: string;
  quantity: number;
  unit: string;
  supplier: string;
  deliveryTicket: string;
}

export interface WorkActivity {
  id: string;
  description: string;
  location: string;
  progressPercent: number;
  status: 'Completed' | 'In Progress' | 'Delayed' | 'Planned';
}

export interface SitePhoto {
  id: string;
  url: string;
  caption: string;
  timestamp: string;
  coordinates: string;
  projectName: string;
  watermarked: boolean;
}

export interface RevisionNote {
  id: string;
  author: string;
  role: 'PMO' | 'Contractor';
  text: string;
  timestamp: string;
}

export type HourlyWeatherCode = 'C' | 'M' | 'G' | 'H';

export interface AttendeeItem {
  id: string;
  nama: string;
  jabatan: string;
  instansi: string;
}

export interface BoqItem {
  id: string;
  kode: string;
  deskripsi: string;
  satuan: string;
  install: number | string;
}

export interface BomItem {
  id: string;
  kode: string;
  jenisMaterial: string;
  satuan: string;
  install: number | string;
}

export interface SignatoryInfo {
  signedBy: string;
  title: string;
  companyName?: string;
  roleLabel?: string;
  timestamp?: string;
  signatureDataUrl?: string;
}

export type Signature = SignatoryInfo;

export interface ScannedHardcopyDoc {
  fileUrl: string;
  fileName: string;
  uploadedAt: string;
  uploadedBy: string;
  physicalSignDate?: string;
  fileSize?: string;
  notes?: string;
}

export interface DailyReport {
  id: string;
  projectId: string;
  reportNumber: string;
  reportDate: string; // YYYY-MM-DD
  submittedAt?: string;
  submissionTiming: SubmissionTimingStatus;
  approvalStatus: ApprovalStatus;
  
  // Official Indonesian PDF Form Fields (AAA/CONS/FM-014)
  nomorBpmpo?: string;
  docCode?: string; // "AAA/CONS/FM-014 Rev01"
  docEffectiveDate?: string; // "14 Juli 2025"
  docFooterCode?: string; // "Daily Report-P2-ND000-JDU-09"
  attendees?: AttendeeItem[];
  hourlyWeather?: Record<string, HourlyWeatherCode>; // "01:00" to "24:00"
  boqItems?: BoqItem[];
  bomItems?: BomItem[];
  consultantSignatory?: SignatoryInfo;
  
  // Core Operational Data
  weather: WeatherLog;
  manpower: ManpowerEntry[];
  equipment: EquipmentEntry[];
  materials: MaterialEntry[];
  activities: WorkActivity[];
  photos: SitePhoto[];
  revisionNotes: RevisionNote[];
  contractorSignatory?: SignatoryInfo;
  pmoSignatory?: SignatoryInfo;
  contractorSignature?: SignatoryInfo;
  pmoSignature?: SignatoryInfo;
  scannedHardcopy?: ScannedHardcopyDoc;
  generalNotes?: string;
  notes?: string;
  isRestDay?: boolean;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  contractorName: string;
  pmoLead: string;
  location: string;
  coordinates: string;
  startDate: string;
  targetDate: string;
  status: 'Active' | 'Under Review' | 'Completed';
  description: string;
  targetSubmissionHour: number; // e.g. 09:00 AM (H+1)
}

export interface WeeklyReport {
  id: string;
  projectId: string;
  reportNumber: string;
  weekNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  dailyReportIds: string[];
  totalManpowerHours: number;
  totalDowntimeHours: number;
  weatherDelayDaysCount: number;
  overallProgressPercent: number;
  summary: string;
  approvalStatus: ApprovalStatus;
  contractorSignatory?: SignatoryInfo;
  pmoSignatory?: SignatoryInfo;
  contractorSignature?: SignatoryInfo;
  pmoSignature?: SignatoryInfo;
}

export interface MonthlyReport {
  id: string;
  projectId: string;
  reportNumber: string;
  month: number; // 1-12
  monthName: string;
  year: number;
  dailyReportIds: string[];
  totalWorkingDays: number;
  totalDowntimeHours: number;
  weatherDelayClaimsTotal: number;
  totalManpowerHeadcountSum: number;
  monthlyProgressDelta: number;
  executiveSummary: string;
  approvalStatus: ApprovalStatus;
  contractorSignatory?: SignatoryInfo;
  pmoSignatory?: SignatoryInfo;
  contractorSignature?: SignatoryInfo;
  pmoSignature?: SignatoryInfo;
}

export interface EscalationAlert {
  id: string;
  projectId: string;
  reportDate: string;
  daysOverdue: number;
  recipientName: string;
  recipientTitle: string;
  whatsappNumber: string;
  emailAddress: string;
  channel: 'whatsapp' | 'email';
  subject: string;
  message: string;
  sentAt: string;
}
