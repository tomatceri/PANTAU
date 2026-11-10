import React, { useState, useRef } from 'react';
import { Project, DailyReport, UserRole, ContractorAccount } from '../types';
import { 
  Building2, MapPin, Plus, ArrowRight, CheckCircle2, 
  AlertTriangle, AlertCircle, Calendar, Clock, Eye, 
  ShieldCheck, HardHat, Info, ChevronRight, CheckCheck, 
  RotateCcw, RefreshCw, Trash2, Users, Upload, Image as ImageIcon, 
  Settings2, Copy, Check, Lock, EyeOff, KeyRound, ExternalLink, X,
  Pencil
} from 'lucide-react';
import { getRealTodayStr } from '../utils/formDefaults';
import { getMonthCalendarSummary, parseLocalDate } from '../utils/calendarStatus';

interface ProjectListProps {
  projects: Project[];
  allReports: DailyReport[];
  currentRole: UserRole;
  contractorAccounts?: ContractorAccount[];
  loggedInUsername?: string;
  onSelectProject: (project: Project) => void;
  onSelectReportForReview: (project: Project, reportDate: string) => void;
  onAddProject: (newProject: Project) => void;
  onUpdateProject?: (updatedProject: Project) => void;
  onDeleteProject?: (projectId: string) => void;
  onToggleProjectStatus?: (projectId: string, newStatus: 'Active' | 'Completed') => void;
  onSaveContractorAccounts?: (accounts: ContractorAccount[]) => void;
  onSyncFromCloud?: () => Promise<void>;
  isSyncingCloud?: boolean;
}

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  allReports,
  currentRole,
  contractorAccounts = [],
  loggedInUsername,
  onSelectProject,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  onSelectReportForReview,
  onToggleProjectStatus,
  onSaveContractorAccounts,
  onSyncFromCloud,
  isSyncingCloud,
}) => {
  // Real-time today string & current month/year for synchronized calendar counters
  const todayStr = getRealTodayStr();
  const todayDateObj = parseLocalDate(todayStr);
  const currentYear = todayDateObj.getFullYear();
  const currentMonth = todayDateObj.getMonth();

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showContractorModal, setShowContractorModal] = useState(false);
  const [projectForLogoAccess, setProjectForLogoAccess] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectFilterTab, setProjectFilterTab] = useState<'all' | 'active' | 'completed'>('all');

  // Form state for "Tambah Proyek Baru"
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [contractor, setContractor] = useState('');
  const [pmo, setPmo] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState(todayStr);
  const [addProjectLogo, setAddProjectLogo] = useState<string>('');
  const [selectedContractorUsernames, setSelectedContractorUsernames] = useState<string[]>([]);
  
  // Inline contractor creation in Tambah Proyek modal
  const [showInlineContractorForm, setShowInlineContractorForm] = useState(false);
  const [inlineUsername, setInlineUsername] = useState('');
  const [inlinePassword, setInlinePassword] = useState('');

  // Form state for "Logo & Akses" modal
  const [logoModalUrl, setLogoModalUrl] = useState<string>('');
  const [logoModalAssignedUsers, setLogoModalAssignedUsers] = useState<string[]>([]);

  // State for Contractor "Logo PDF" modal
  const [projectForContractorLogo, setProjectForContractorLogo] = useState<Project | null>(null);
  const [contractorLogoUrl, setContractorLogoUrl] = useState<string>('');
  const contractorFileInputRef = useRef<HTMLInputElement>(null);

  // State for "Kelola Akun Kontraktor" modal
  const [newAccUsername, setNewAccUsername] = useState('');
  const [newAccPassword, setNewAccPassword] = useState('1234');
  const [newAccCompany, setNewAccCompany] = useState('');
  const [newAccContact, setNewAccContact] = useState('');
  const [newAccPhone, setNewAccPhone] = useState('');
  const [newAccProjects, setNewAccProjects] = useState<string[]>([]);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedAccountId, setCopiedAccountId] = useState<string | null>(null);
  const [editingPasswordId, setEditingPasswordId] = useState<string | null>(null);
  const [tempNewPassword, setTempNewPassword] = useState('');

  // Full Edit Account state (PMO can edit username, password, company, contact, phone, projects)
  const [editingAccount, setEditingAccount] = useState<ContractorAccount | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editProjects, setEditProjects] = useState<string[]>([]);

  // Instant optimistic removal for deleted contractor accounts (avoids delay or iframe popup blocking)
  const [deletedAccountIds, setDeletedAccountIds] = useState<Set<string>>(new Set());
  
  // Safe helper ensuring assignedProjectIds is always an array
  const safeAssigned = (arr?: string[]): string[] => (Array.isArray(arr) ? arr : []);

  const activeContractorAccounts = (contractorAccounts || [])
    .filter((a): a is ContractorAccount => Boolean(a && a.id && !deletedAccountIds.has(a.id)))
    .map((acc) => ({
      ...acc,
      assignedProjectIds: Array.isArray(acc.assignedProjectIds)
        ? acc.assignedProjectIds
        : Array.isArray((acc as any).assigned_project_ids)
        ? (acc as any).assigned_project_ids
        : [],
      companyName: acc.companyName || 'PT Kontraktor Lapangan',
      username: acc.username || '@kontraktor',
      password: acc.password || '1234',
    }));

  const fileInputAddRef = useRef<HTMLInputElement>(null);
  const fileInputLogoAccessRef = useRef<HTMLInputElement>(null);

  // Find all reports pending PMO review across all projects
  const pendingApprovalReports = allReports.filter(
    (r) => r.approvalStatus === 'submitted' || r.approvalStatus === 'under_review'
  );

  // Find all reports needing revision by contractors across all projects
  const needsRevisionReports = allReports.filter(
    (r) => r.approvalStatus === 'needs_revision'
  );

  // Handle image upload to Base64 Data URL
  const handleLogoUpload = (file: File, callback: (dataUrl: string) => void) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih file gambar yang valid (.png, .jpg, .jpeg, .webp, .svg)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        callback(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Create Project handler
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    const projectId = `proj-${Date.now()}`;
    let finalAssignedUsers = [...selectedContractorUsernames];

    // Check if PMO created a new contractor account inline
    if (showInlineContractorForm && inlineUsername.trim()) {
      let cleanUser = inlineUsername.trim();
      if (!cleanUser.startsWith('@')) cleanUser = `@${cleanUser}`;
      
      const newAcc: ContractorAccount = {
        id: `acc-${Date.now()}`,
        username: cleanUser,
        password: inlinePassword.trim() || '1234',
        companyName: contractor.trim() || 'PT Kontraktor Lapangan',
        contactPerson: 'Supervisor Lapangan',
        phone: '',
        assignedProjectIds: [projectId],
        createdAt: new Date().toISOString(),
      };

      if (!finalAssignedUsers.includes(cleanUser)) {
        finalAssignedUsers.push(cleanUser);
      }

      const updatedAccounts = [...contractorAccounts, newAcc];
      onSaveContractorAccounts?.(updatedAccounts);
    }

    const newProj: Project = {
      id: projectId,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      contractorName: contractor.trim() || 'PT Kontraktor Lapangan',
      pmoLead: pmo.trim() || 'Tim Pengawas PMO',
      location: location.trim() || 'Lokasi Proyek',
      coordinates: '-6.2088° S, 106.8456° E',
      startDate: startDate || todayStr,
      targetDate: '2027-12-31',
      status: 'Active',
      description: 'Pekerjaan konstruksi dan pelaporan progres fisik harian.',
      targetSubmissionHour: 9,
      logoUrl: addProjectLogo || undefined,
      assignedContractorUsernames: finalAssignedUsers.length > 0 ? finalAssignedUsers : undefined,
    };

    onAddProject(newProj);

    // Also update any selected existing contractor accounts to include this new projectId
    if (finalAssignedUsers.length > 0 && onSaveContractorAccounts) {
      const updatedAccounts = contractorAccounts.map((acc) => {
        if (finalAssignedUsers.includes(acc.username)) {
          const currentSet = new Set(acc.assignedProjectIds);
          currentSet.add(projectId);
          return { ...acc, assignedProjectIds: Array.from(currentSet) };
        }
        return acc;
      });
      onSaveContractorAccounts(updatedAccounts);
    }

    // Reset Form
    setName('');
    setCode('');
    setContractor('');
    setPmo('');
    setLocation('');
    setStartDate(todayStr);
    setAddProjectLogo('');
    setSelectedContractorUsernames([]);
    setShowInlineContractorForm(false);
    setInlineUsername('');
    setInlinePassword('');
    setShowAddModal(false);
    onSelectProject(newProj);
  };

  // Open "Logo & Akses" modal
  const openLogoAccessModal = (proj: Project) => {
    setProjectForLogoAccess(proj);
    setLogoModalUrl(proj.logoUrl || '');
    setLogoModalAssignedUsers(proj.assignedContractorUsernames || []);
  };

  // Open Contractor "Logo PDF" modal
  const openContractorLogoModal = (proj: Project) => {
    setProjectForContractorLogo(proj);
    setContractorLogoUrl(proj.logoUrl || '');
  };

  // Save Contractor "Logo PDF" changes
  const handleSaveContractorLogo = () => {
    if (!projectForContractorLogo) return;

    const updatedProj: Project = {
      ...projectForContractorLogo,
      logoUrl: contractorLogoUrl || undefined,
    };

    onUpdateProject?.(updatedProj);
    setProjectForContractorLogo(null);
  };

  // Save "Logo & Akses" changes
  const handleSaveLogoAccess = () => {
    if (!projectForLogoAccess) return;

    const updatedProj: Project = {
      ...projectForLogoAccess,
      logoUrl: logoModalUrl || undefined,
      assignedContractorUsernames: logoModalAssignedUsers.length > 0 ? logoModalAssignedUsers : undefined,
    };

    onUpdateProject?.(updatedProj);

    // Update contractor accounts project assignment
    if (onSaveContractorAccounts) {
      const updatedAccounts = contractorAccounts.map((acc) => {
        const isAssigned = logoModalAssignedUsers.includes(acc.username);
        const set = new Set(acc.assignedProjectIds);
        if (isAssigned) {
          set.add(projectForLogoAccess.id);
        } else {
          set.delete(projectForLogoAccess.id);
        }
        return { ...acc, assignedProjectIds: Array.from(set) };
      });
      onSaveContractorAccounts(updatedAccounts);
    }

    setProjectForLogoAccess(null);
  };

  // Create contractor account handler (Kelola Akun Kontraktor)
  const handleCreateContractorAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccUsername.trim() || !newAccCompany.trim()) return;

    let cleanUser = newAccUsername.trim();
    if (!cleanUser.startsWith('@')) cleanUser = `@${cleanUser}`;

    // Prevent duplicate username
    if (contractorAccounts.some((a) => a.username.toLowerCase() === cleanUser.toLowerCase())) {
      alert(`Username ${cleanUser} sudah digunakan! Silakan gunakan username lain.`);
      return;
    }

    const newAcc: ContractorAccount = {
      id: `acc-${Date.now()}`,
      username: cleanUser,
      password: newAccPassword.trim() || '1234',
      companyName: newAccCompany.trim(),
      contactPerson: newAccContact.trim() || undefined,
      phone: newAccPhone.trim() || undefined,
      assignedProjectIds: newAccProjects,
      createdAt: new Date().toISOString(),
    };

    const updated = [...contractorAccounts, newAcc];
    onSaveContractorAccounts?.(updated);

    // Sync projects assignedContractorUsernames
    if (onUpdateProject && newAccProjects.length > 0) {
      newAccProjects.forEach((pId) => {
        const proj = projects.find((p) => p.id === pId);
        if (proj) {
          const currentUsers = proj.assignedContractorUsernames || [];
          if (!currentUsers.includes(cleanUser)) {
            onUpdateProject({
              ...proj,
              assignedContractorUsernames: [...currentUsers, cleanUser],
            });
          }
        }
      });
    }

    // Reset inputs
    setNewAccUsername('');
    setNewAccPassword('1234');
    setNewAccCompany('');
    setNewAccContact('');
    setNewAccPhone('');
    setNewAccProjects([]);
  };

  // Copy credentials to clipboard
  const handleCopyCredentials = (acc: ContractorAccount) => {
    const assignedIds = safeAssigned(acc.assignedProjectIds);
    const textToCopy = `PORTAL PANTAU - KREDENSIAL LOGIN KONTRAKTOR:
----------------------------------------
Nama Kontraktor: ${acc.companyName || 'PT Kontraktor'}
Username       : ${acc.username}
Password       : ${acc.password}
Akses Proyek   : ${
      assignedIds.length > 0
        ? assignedIds
            .map((id) => projects.find((p) => p.id === id)?.name || id)
            .join(', ')
        : 'Belum di-assign'
    }
Role           : Kontraktor Lapangan
----------------------------------------
Gunakan kredensial di atas untuk masuk ke sistem pelaporan harian.`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedAccountId(acc.id);
    setTimeout(() => setCopiedAccountId(null), 2500);
  };

  // Open full edit for contractor account
  const handleStartEditAccount = (acc: ContractorAccount) => {
    setEditingAccount(acc);
    setEditUsername(acc.username);
    setEditPassword(acc.password);
    setEditCompany(acc.companyName || '');
    setEditContact(acc.contactPerson || '');
    setEditPhone(acc.phone || '');
    const accAssigned = safeAssigned(acc.assignedProjectIds);
    const assignedIds = (projects || [])
      .filter((p) => accAssigned.includes(p.id) || (Array.isArray(p.assignedContractorUsernames) && p.assignedContractorUsernames.includes(acc.username)))
      .map((p) => p.id);
    setEditProjects(Array.from(new Set(assignedIds)));
  };

  // Save edited contractor account (username, password, company, contact, phone, projects)
  const handleSaveEditAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    let cleanUser = editUsername.trim();
    if (!cleanUser) return;
    if (!cleanUser.startsWith('@')) cleanUser = `@${cleanUser}`;

    const oldUsername = editingAccount.username;
    if (
      cleanUser.toLowerCase() !== oldUsername.toLowerCase() &&
      contractorAccounts.some(
        (a) => a.id !== editingAccount.id && a.username.toLowerCase() === cleanUser.toLowerCase()
      )
    ) {
      alert(`Username ${cleanUser} sudah digunakan oleh akun lain!`);
      return;
    }

    const updatedAccount: ContractorAccount = {
      ...editingAccount,
      username: cleanUser,
      password: editPassword.trim() || editingAccount.password,
      companyName: editCompany.trim() || editingAccount.companyName,
      contactPerson: editContact.trim() || undefined,
      phone: editPhone.trim() || undefined,
      assignedProjectIds: editProjects,
    };

    const updatedAccountsList = contractorAccounts.map((a) =>
      a.id === editingAccount.id ? updatedAccount : a
    );
    onSaveContractorAccounts?.(updatedAccountsList);

    // Sync all projects' assignedContractorUsernames
    if (onUpdateProject) {
      projects.forEach((proj) => {
        const currentUsers = proj.assignedContractorUsernames || [];
        const isAssignedToThisProj = editProjects.includes(proj.id);
        const hadOldUsername = currentUsers.includes(oldUsername);

        let nextUsers = [...currentUsers];
        if (hadOldUsername && cleanUser !== oldUsername) {
          nextUsers = nextUsers.filter((u) => u !== oldUsername);
        }

        if (isAssignedToThisProj) {
          if (!nextUsers.includes(cleanUser)) {
            nextUsers.push(cleanUser);
          }
        } else {
          nextUsers = nextUsers.filter((u) => u !== cleanUser && u !== oldUsername);
        }

        const isDifferent =
          nextUsers.length !== currentUsers.length ||
          nextUsers.some((u) => !currentUsers.includes(u));

        if (isDifferent) {
          onUpdateProject({
            ...proj,
            assignedContractorUsernames: nextUsers,
          });
        }
      });
    }

    setEditingAccount(null);
  };

  // Delete contractor account and remove its username from assigned projects (direct instant deletion, avoids window.confirm being blocked by iframe sandbox)
  const handleDeleteContractorAccount = (accId: string) => {
    const acc = contractorAccounts.find((a) => a.id === accId);
    if (!acc) return;

    // 1. Instant optimistic UI removal in current component
    setDeletedAccountIds((prev) => new Set(prev).add(accId));
    setSelectedContractorUsernames((prev) => prev.filter((u) => u !== acc.username));
    setLogoModalAssignedUsers((prev) => prev.filter((u) => u !== acc.username));

    // 2. Propagate to parent state & storage
    const updated = contractorAccounts.filter((a) => a.id !== accId);
    onSaveContractorAccounts?.(updated);

    // 3. Remove access from all associated projects
    if (onUpdateProject) {
      projects.forEach((proj) => {
        if (proj.assignedContractorUsernames?.includes(acc.username)) {
          onUpdateProject({
            ...proj,
            assignedContractorUsernames: proj.assignedContractorUsernames.filter(
              (u) => u !== acc.username
            ),
          });
        }
      });
    }
  };

  // Change password for contractor account (quick inline action)
  const handleSaveChangedPassword = (accId: string) => {
    if (!tempNewPassword.trim()) {
      setEditingPasswordId(null);
      return;
    }
    const updated = contractorAccounts.map((a) =>
      a.id === accId ? { ...a, password: tempNewPassword.trim() } : a
    );
    onSaveContractorAccounts?.(updated);
    setEditingPasswordId(null);
    setTempNewPassword('');
  };

  // Filter projects by tab
  const filteredProjects = projects.filter((p) => {
    if (projectFilterTab === 'active') return p.status !== 'Completed';
    if (projectFilterTab === 'completed') return p.status === 'Completed';
    return true;
  });

  const activeCount = projects.filter((p) => p.status !== 'Completed').length;
  const completedCount = projects.filter((p) => p.status === 'Completed').length;

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* HERO BANNER: JELASKAN KEPANJANGAN PANTAU & PORTAL PERAN */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-3 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/25 border border-indigo-400/40 text-indigo-100 text-xs font-semibold">
            <span className="font-extrabold text-white">PANTAU</span>
            <span aria-hidden="true">·</span>
            <span>Project Activity, Notification, Tracking &amp; Approval Unit</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-tight">
            Sistem Informasi &amp; Monitoring Laporan Harian Proyek
          </h1>

          <p className="text-sm md:text-base text-blue-100/90 leading-relaxed">
            <strong className="text-white font-bold">PANTAU</strong> merupakan singkatan dari{' '}
            <strong className="text-cyan-200 font-semibold">
              Project Activity, Notification, Tracking &amp; Approval Unit
            </strong>{' '}
            — unit sistem pelaporan progres konstruksi harian terpadu untuk pencatatan aktivitas lapangan, pengingat otomatis, pemantauan kalender real-time, serta verifikasi dan persetujuan dokumen resmi.
          </p>

          {/* Active Role Context Only (Strict Interface Separation) */}
          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
            {currentRole === 'contractor' ? (
              <div className="px-3.5 py-1.5 rounded-lg flex items-center gap-2 font-semibold bg-amber-400 text-slate-950 shadow-xs">
                <HardHat className="w-4 h-4 shrink-0" />
                <span>
                  Portal Kontraktor ({loggedInUsername || '@kontraktor'}): Terisolasi khusus proyek yang di-assign oleh PMO
                </span>
              </div>
            ) : (
              <div className="px-3.5 py-1.5 rounded-lg flex items-center gap-2 font-semibold bg-blue-400 text-slate-950 shadow-xs">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Portal Pengawas PMO (@pmo): Akses penuh seluruh proyek lintas kontraktor, kelola akun &amp; otorisasi</span>
              </div>
            )}
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KHUSUS KONTRAKTOR VIEW: PENGINGAT REVISI LAPORAN */}
      {currentRole === 'contractor' && (
        <div className="bg-amber-50/70 border-2 border-amber-400 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
                📝
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                  <span>Pengingat Revisi Laporan</span>
                  {needsRevisionReports.length > 0 ? (
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 bg-amber-600 text-white rounded-full">
                      {needsRevisionReports.length} Laporan Perlu Direvisi Segera
                    </span>
                  ) : (
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 bg-emerald-600 text-white rounded-full">
                      Tidak Ada Revisi Pending
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Daftar laporan harian yang dikembalikan oleh Tim Pengawas PMO dengan catatan perbaikan yang wajib segera diperbarui oleh kontraktor.
                </p>
              </div>
            </div>
          </div>

          {needsRevisionReports.length > 0 ? (
            <div className="divide-y divide-slate-200 border border-amber-200 rounded-lg overflow-hidden bg-white">
              {needsRevisionReports.map((rep) => {
                const repProject = projects.find((p) => p.id === rep.projectId) || projects[0];
                const latestNote =
                  rep.revisionNotes && rep.revisionNotes.length > 0
                    ? rep.revisionNotes[rep.revisionNotes.length - 1]
                    : null;

                return (
                  <div key={rep.id} className="p-3.5 space-y-2 hover:bg-amber-50/40 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">
                          {repProject.name}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                          Tanggal Laporan: {rep.reportDate}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectReportForReview(repProject, rep.reportDate)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-xs shrink-0 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Buka & Perbaiki Laporan Sekarang →</span>
                      </button>
                    </div>

                    {latestNote && (
                      <div className="bg-amber-50/90 border border-amber-200 rounded p-2 text-xs text-amber-950 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-amber-900">
                            Catatan Perbaikan PMO ({latestNote.author}):{' '}
                          </span>
                          <span className="italic text-slate-800">"{latestNote.text}"</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3 text-xs text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <strong>Bagus Sekali!</strong> Saat ini tidak ada laporan yang memerlukan revisi. Semua laporan yang dikirim telah disetujui atau sedang dalam antrean review PMO.
              </div>
            </div>
          )}
        </div>
      )}

      {/* KHUSUS PMO VIEW: WIDGET DAFTAR LAPORAN YANG MEMERLUKAN PERSETUJUAN */}
      {currentRole === 'pmo' && (
        <div className="bg-white border-2 border-blue-500/40 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Laporan Menunggu Persetujuan PMO</span>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 bg-blue-600 text-white rounded-full">
                    {pendingApprovalReports.length} Laporan
                  </span>
                </h2>
                <p className="text-xs text-slate-600">
                  Laporan harian yang telah dikirim oleh kontraktor dan siap diverifikasi oleh tim pengawas PMO.
                </p>
              </div>
            </div>

            {needsRevisionReports.length > 0 && (
              <span className="text-xs font-bold text-amber-900 bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-300 self-start sm:self-auto">
                {needsRevisionReports.length} Laporan Sedang Dalam Status Revisi
              </span>
            )}
          </div>

          {/* Pending Reports List */}
          {pendingApprovalReports.length > 0 ? (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
              {pendingApprovalReports.map((rep) => {
                const repProject = projects.find((p) => p.id === rep.projectId) || projects[0];

                return (
                  <div
                    key={rep.id}
                    className="p-3.5 bg-slate-50/60 hover:bg-blue-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">
                          {repProject.name}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs font-bold text-blue-700">
                          Tanggal Laporan: {rep.reportDate}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        <span>Kontraktor: <strong className="text-slate-800">{repProject.contractorName}</strong></span>
                        <span>·</span>
                        <span>PMO Lead: {repProject.pmoLead}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectReportForReview(repProject, rep.reportDate)}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shadow-xs cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Review & Setujui Laporan</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3 text-xs text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <strong>Semua Laporan Telah Selesai Diverifikasi.</strong> Tidak ada laporan baru yang menunggu persetujuan PMO saat ini.
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION HEADER: DAFTAR PROYEK DENGAN FILTER AKTIF / SELESAI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Daftar Proyek Konstruksi</span>
            <span className="text-xs font-mono font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              {projects.length} Proyek {currentRole === 'contractor' ? 'Diberikan Akses' : 'Total'}
            </span>
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            {currentRole === 'contractor'
              ? 'Berikut proyek yang telah di-assign oleh PMO ke akun Anda. Klik kartu untuk membuka kalender pelaporan.'
              : 'Kelola seluruh proyek konstruksi, atur logo kop laporan harian, dan kelola akun kontraktor pelaksana.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Status Proyek: Aktif vs Selesai */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
            <button
              onClick={() => setProjectFilterTab('all')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                projectFilterTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({projects.length})
            </button>
            <button
              onClick={() => setProjectFilterTab('active')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                projectFilterTab === 'active'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>Aktif ({activeCount})</span>
            </button>
            <button
              onClick={() => setProjectFilterTab('completed')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                projectFilterTab === 'completed'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🏁 Selesai ({completedCount})</span>
            </button>
          </div>

          {onSyncFromCloud && (
            <button
              type="button"
              onClick={onSyncFromCloud}
              disabled={isSyncingCloud}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors shrink-0 shadow-xs cursor-pointer disabled:opacity-50"
              title="Perbarui & sinkronkan data proyek serta laporan dari Vercel / Cloud Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin text-emerald-600' : 'text-emerald-700'}`} />
              <span>{isSyncingCloud ? 'Sinkronisasi...' : 'Sinkron dari Vercel / Cloud'}</span>
            </button>
          )}

          {currentRole === 'pmo' && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowContractorModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-indigo-700 bg-white border border-indigo-300 hover:bg-indigo-50 rounded-lg transition-colors shrink-0 shadow-xs cursor-pointer"
                title="Buka panel kelola dan otorisasi akun kontraktor"
              >
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Kelola Akun Kontraktor</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setName('');
                  setCode('');
                  setContractor('');
                  setPmo('');
                  setLocation('');
                  setStartDate(todayStr);
                  setAddProjectLogo('');
                  setSelectedContractorUsernames([]);
                  setShowInlineContractorForm(false);
                  setInlineUsername('');
                  setInlinePassword('');
                  setShowAddModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shrink-0 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Proyek Baru</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* GRID KARTU PROYEK */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredProjects.map((proj) => {
          const projReports = allReports.filter((r) => r.projectId === proj.id);
          const projSummary = getMonthCalendarSummary(
            proj,
            projReports,
            currentYear,
            currentMonth,
            todayStr
          );
          const approvedCount = projSummary.approvedCount;
          const submittedCount = projSummary.submittedCount;
          const revisionCount = projSummary.needsRevisionCount;
          const isCompleted = proj.status === 'Completed';
          const overdueCount = projSummary.overdueCount;

          return (
            <div
              key={proj.id}
              onClick={() => onSelectProject(proj)}
              className={`border-2 rounded-xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group space-y-4 ${
                isCompleted 
                  ? 'bg-slate-50/70 border-slate-300 hover:border-slate-400 opacity-90' 
                  : 'bg-white border-slate-200 hover:border-blue-500'
              }`}
            >
              <div className="space-y-3">
                {/* Header Kartu: Status, Logo & Aksi */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {submittedCount > 0 && currentRole === 'pmo' && !isCompleted && (
                      <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full border border-blue-300">
                        {submittedCount} Perlu Ditinjau
                      </span>
                    )}

                    {/* Fitur Logo PDF untuk Kontraktor & Indikator Logo untuk PMO */}
                    {currentRole === 'contractor' ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openContractorLogoModal(proj);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                        title="Upload atau ganti Logo PDF untuk Laporan Harian"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                        <span>Logo PDF</span>
                      </button>
                    ) : (
                      proj.logoUrl && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700" title="Logo Kop PDF Terpasang">
                          <ImageIcon className="w-3 h-3 text-blue-600" />
                          <span>Logo PDF</span>
                        </span>
                      )
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Status Badge */}
                    {isCompleted ? (
                      <span className="text-xs text-slate-700 font-bold flex items-center gap-1.5 bg-slate-200 px-2.5 py-0.5 rounded-full border border-slate-300">
                        <span>🏁 Proyek Selesai</span>
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-700 font-bold flex items-center gap-1.5 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Proyek Aktif</span>
                      </span>
                    )}

                    {/* Fitur Logo & Akses (Khusus PMO) */}
                    {currentRole === 'pmo' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openLogoAccessModal(proj);
                        }}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded transition-colors border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 flex items-center gap-1 shadow-2xs cursor-pointer"
                        title="Atur Logo Laporan Harian (Kop Kiri PDF) & Akses Kontraktor"
                      >
                        <Settings2 className="w-3 h-3 text-indigo-600" />
                        <span>Logo & Akses</span>
                      </button>
                    )}

                    {/* Fitur Penyelesaian Proyek: Toggle Status */}
                    {onToggleProjectStatus && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleProjectStatus(proj.id, isCompleted ? 'Active' : 'Completed');
                        }}
                        className={`text-[11px] font-semibold px-2 py-1 rounded transition-colors border cursor-pointer ${
                          isCompleted
                            ? 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                            : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                        }`}
                        title={isCompleted ? 'Aktifkan kembali proyek ini' : 'Tandai proyek ini telah selesai dikerjakan'}
                      >
                        {isCompleted ? 'Aktifkan Lagi' : 'Tandai Selesai'}
                      </button>
                    )}

                    {/* Fitur Hapus Proyek (Khusus PMO) */}
                    {currentRole === 'pmo' && onDeleteProject && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectToDelete(proj);
                        }}
                        className="text-[11px] font-semibold px-2 py-1 rounded transition-colors border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 flex items-center gap-1 shadow-2xs cursor-pointer"
                        title="Hapus proyek ini secara permanen"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Nama Proyek & Logo Preview */}
                <div className="flex items-start gap-3">
                  {proj.logoUrl && (
                    <div className="w-12 h-12 rounded-lg border border-slate-200 bg-white p-1 shrink-0 flex items-center justify-center overflow-hidden shadow-2xs">
                      <img src={proj.logoUrl} alt="Logo Proyek" className="max-h-full max-w-full object-contain" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className={`text-base md:text-lg font-bold transition-colors leading-snug ${
                      isCompleted ? 'text-slate-700' : 'text-slate-900 group-hover:text-blue-700'
                    }`}>
                      {proj.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{proj.description}</p>
                  </div>
                </div>

                {/* Metadata Lapangan & Info Kontraktor */}
                <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Kontraktor: <strong className="text-slate-900">{proj.contractorName}</strong></span>
                    </div>

                    {proj.assignedContractorUsernames && proj.assignedContractorUsernames.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px] font-mono font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                        <Users className="w-3 h-3" />
                        <span>{proj.assignedContractorUsernames.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Project Manager: <strong className="text-slate-900">{proj.pmoLead}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{proj.location}</span>
                  </div>
                </div>

                {/* Kepatuhan Status Sesuai 4 Kategori */}
                <div className="grid grid-cols-4 gap-2 pt-1 text-center text-xs">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                    <div className="text-[10px] text-emerald-800 font-semibold">Disetujui</div>
                    <div className="font-mono font-bold text-emerald-700 text-base">{approvedCount}</div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                    <div className="text-[10px] text-blue-800 font-semibold">Menunggu</div>
                    <div className="font-mono font-bold text-blue-700 text-base">{submittedCount}</div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                    <div className="text-[10px] text-amber-800 font-semibold">Revisi</div>
                    <div className="font-mono font-bold text-amber-700 text-base">{revisionCount}</div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                    <div className="text-[10px] text-red-800 font-semibold">Terlambat</div>
                    <div className="font-mono font-bold text-red-700 text-base">{overdueCount}</div>
                  </div>
                </div>
              </div>

              {/* Tombol Utama Buka Kalender */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-700 group-hover:text-blue-800 transition-colors">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>{isCompleted ? 'Lihat Arsip Kalender Proyek Selesai' : 'Pilih Proyek & Buka Kalender'}</span>
                </span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: TAMBAH PROYEK BARU DENGAN UPLOAD LOGO & ASSIGN KONTRAKTOR */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full my-auto p-5 sm:p-7 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Tambah Proyek Konstruksi Baru</h3>
                <p className="text-xs text-slate-500">Buat proyek, upload logo PDF laporan, dan tentukan akses kontraktor.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Jenis Pekerjaan *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">PR/PO ID *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Mulai Proyek</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Kontraktor Pelaksana</label>
                  <input
                    type="text"
                    value={contractor}
                    onChange={(e) => setContractor(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Project Manager / PMO Lead</label>
                  <input
                    type="text"
                    value={pmo}
                    onChange={(e) => setPmo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Lokasi Proyek</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* SECTION: UPLOAD LOGO LAPORAN HARIAN */}
              <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      <span>Upload Logo Laporan Harian</span>
                    </span>
                  </div>

                  <input
                    type="file"
                    ref={fileInputAddRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload(file, setAddProjectLogo);
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputAddRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-white border border-blue-300 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{addProjectLogo ? 'Ganti Logo' : 'Pilih File Logo'}</span>
                  </button>
                </div>

                {/* PRATINJAU LANGSUNG KOP HEADER LAPORAN HARIAN */}
                <div className="bg-white border-2 border-slate-800 rounded-lg p-2.5 space-y-1 shadow-xs">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                    <span>Pratinjau Langsung Kop Header Dokumen PDF:</span>
                    {addProjectLogo && (
                      <button
                        type="button"
                        onClick={() => setAddProjectLogo('')}
                        className="text-red-600 hover:underline cursor-pointer"
                      >
                        Hapus Logo
                      </button>
                    )}
                  </div>

                  <div className="border border-black p-1.5 sm:p-2 flex items-center justify-between gap-1 sm:gap-2 min-h-[44px] sm:min-h-[52px] bg-white overflow-hidden w-full">
                    {/* Left: Uploaded Logo */}
                    <div className="w-12 sm:w-[105px] flex items-center justify-start shrink-0">
                      {addProjectLogo ? (
                        <img
                          src={addProjectLogo}
                          alt="Logo Laporan Harian"
                          className="max-h-7 sm:max-h-11 max-w-[46px] sm:max-w-[100px] object-contain"
                        />
                      ) : (
                        <div className="h-7 sm:h-9 w-12 sm:w-24 border border-dashed border-slate-300 rounded flex items-center justify-center text-[7px] sm:text-[9px] text-slate-400 italic text-center px-0.5 leading-none">
                          <span className="sm:hidden">(Logo)</span>
                          <span className="hidden sm:inline">(Logo Kiri PDF)</span>
                        </div>
                      )}
                    </div>

                    {/* Center: Title */}
                    <div className="text-center flex-1 min-w-0 px-1">
                      <div className="text-[9.5px] sm:text-xs font-black tracking-normal sm:tracking-wider uppercase text-slate-950 leading-tight truncate">
                        LAPORAN HARIAN
                      </div>
                      <div className="text-[6.5px] sm:text-[9px] font-bold tracking-tight sm:tracking-wide uppercase text-slate-800 leading-tight truncate">
                        DAILY ACTIVITY REPORT
                      </div>
                    </div>

                    {/* Right: Form Metadata */}
                    <div className="shrink-0 text-right text-[7px] sm:text-[8px] space-y-0.5 font-medium text-slate-800 leading-tight pl-1">
                      <div className="whitespace-nowrap">No. Form: <span className="font-mono font-bold">AAA/CONS/FM-014</span></div>
                      <div className="whitespace-nowrap">Tgl: 14 Juli 2025</div>
                    </div>
                  </div>
                </div>
              </div>



              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Simpan & Buka Proyek</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ATUR LOGO & HAK AKSES PROYEK (UNTUK PROYEK YANG SUDAH ADA) */}
      {projectForLogoAccess && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full my-auto p-5 sm:p-7 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-indigo-600" />
                  <span>Atur Logo Laporan & Hak Akses Proyek</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Proyek: <strong className="text-slate-800">{projectForLogoAccess.name}</strong> ({projectForLogoAccess.code})
                </p>
              </div>
              <button
                onClick={() => setProjectForLogoAccess(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* UPLOAD / GANTI LOGO KOP HEADER */}
              <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      <span>Logo Laporan Harian</span>
                    </span>
                  </div>

                  <input
                    type="file"
                    ref={fileInputLogoAccessRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload(file, setLogoModalUrl);
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputLogoAccessRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-white border border-blue-300 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{logoModalUrl ? 'Ganti Logo' : 'Pilih Logo'}</span>
                  </button>
                </div>

                {/* PRATINJAU LANGSUNG KOP HEADER */}
                <div className="bg-white border-2 border-slate-800 rounded-lg p-2.5 space-y-1 shadow-xs">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                    <span>Pratinjau Kop Header Laporan Harian (1:1 Cetak PDF):</span>
                    {logoModalUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoModalUrl('')}
                        className="text-red-600 hover:underline cursor-pointer"
                      >
                        Hapus Logo
                      </button>
                    )}
                  </div>

                  <div className="border border-black p-1.5 sm:p-2 flex items-center justify-between gap-1 sm:gap-2 min-h-[44px] sm:min-h-[52px] bg-white overflow-hidden w-full">
                    {/* Left: Uploaded Logo */}
                    <div className="w-12 sm:w-[105px] flex items-center justify-start shrink-0">
                      {logoModalUrl ? (
                        <img
                          src={logoModalUrl}
                          alt="Logo Laporan Harian"
                          className="max-h-7 sm:max-h-11 max-w-[46px] sm:max-w-[100px] object-contain"
                        />
                      ) : (
                        <div className="h-7 sm:h-9 w-12 sm:w-24 border border-dashed border-slate-300 rounded flex items-center justify-center text-[7px] sm:text-[9px] text-slate-400 italic text-center px-0.5 leading-none">
                          <span className="sm:hidden">(Logo)</span>
                          <span className="hidden sm:inline">(Belum Ada Logo)</span>
                        </div>
                      )}
                    </div>

                    {/* Center: Title */}
                    <div className="text-center flex-1 min-w-0 px-1">
                      <div className="text-[9.5px] sm:text-xs font-black tracking-normal sm:tracking-wider uppercase text-slate-950 leading-tight truncate">
                        LAPORAN HARIAN
                      </div>
                      <div className="text-[6.5px] sm:text-[9px] font-bold tracking-tight sm:tracking-wide uppercase text-slate-800 leading-tight truncate">
                        DAILY ACTIVITY REPORT
                      </div>
                    </div>

                    {/* Right: Form Metadata */}
                    <div className="shrink-0 text-right text-[7px] sm:text-[8px] space-y-0.5 font-medium text-slate-800 leading-tight pl-1">
                      <div className="whitespace-nowrap">No. Form: <span className="font-mono font-bold">AAA/CONS/FM-014</span></div>
                      <div className="whitespace-nowrap">Tgl: 14 Juli 2025</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* OTORISASI AKUN KONTRAKTOR */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
                <div>
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>Akun Kontraktor yang Diberikan Hak Akses</span>
                  </span>
                </div>

                <div className="space-y-1 bg-white p-2 border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
                  {activeContractorAccounts.map((acc) => {
                    const isChecked = logoModalAssignedUsers.includes(acc.username);
                    const linkedProj = projects.find(
                      (p) =>
                        p.assignedContractorUsernames?.includes(acc.username) ||
                        acc.assignedProjectIds?.includes(p.id)
                    );
                    const companyLabel = acc.companyName?.trim() || linkedProj?.contractorName || linkedProj?.name || 'Kontraktor';

                    return (
                      <div
                        key={acc.id}
                        className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors text-xs border border-slate-100 hover:border-slate-200 group"
                      >
                        <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setLogoModalAssignedUsers((prev) => [...prev, acc.username]);
                              } else {
                                setLogoModalAssignedUsers((prev) =>
                                  prev.filter((u) => u !== acc.username)
                                );
                              }
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                            <span className="font-mono font-bold text-slate-900">{acc.username}</span>
                            <span className="text-slate-600 truncate font-medium">({companyLabel})</span>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-mono font-bold">
                              <span className="text-amber-700">Pass:</span>
                              <span className="text-slate-900">{acc.password || '1234'}</span>
                            </span>
                          </div>
                        </label>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteContractorAccount(acc.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer shrink-0 ml-2"
                          title={`Hapus akun ${acc.username}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProjectForLogoAccess(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveLogoAccess}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Perubahan Logo & Akses</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2B: UPLOAD LOGO PDF KHUSUS KONTRAKTOR */}
      {projectForContractorLogo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full my-auto p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-blue-600" />
                  <span>Logo PDF Laporan Harian</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Proyek: <strong className="text-slate-800">{projectForContractorLogo.name}</strong> ({projectForContractorLogo.code})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProjectForContractorLogo(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Tutup (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Tambahkan atau perbarui logo perusahaan kontraktor Anda. Logo ini otomatis tampil pada bagian kop kiri <strong>Laporan Harian (AAA/CONS/FM-014)</strong> saat pratinjau dan ekspor dokumen PDF resmi.
              </p>

              {/* Upload Box */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>File Logo Perusahaan</span>
                  </span>

                  <input
                    type="file"
                    ref={contractorFileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload(file, setContractorLogoUrl);
                    }}
                  />

                  <div className="flex items-center gap-2">
                    {contractorLogoUrl && (
                      <button
                        type="button"
                        onClick={() => setContractorLogoUrl('')}
                        className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                      >
                        Hapus
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => contractorFileInputRef.current?.click()}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{contractorLogoUrl ? 'Ganti Logo' : 'Pilih Logo'}</span>
                    </button>
                  </div>
                </div>

                {/* Pratinjau Kop Header 1:1 Cetak PDF */}
                <div className="bg-white border-2 border-slate-800 rounded-lg p-2.5 space-y-1 shadow-xs">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                    Pratinjau Kop Header Laporan Harian (1:1 Cetak PDF):
                  </div>

                  <div className="border border-black p-2 flex items-center justify-between gap-2 min-h-[52px] bg-white overflow-hidden w-full">
                    {/* Left: Uploaded Logo */}
                    <div className="w-[105px] flex items-center justify-start shrink-0">
                      {contractorLogoUrl ? (
                        <img
                          src={contractorLogoUrl}
                          alt="Logo Laporan Harian"
                          className="max-h-11 max-w-[100px] object-contain"
                        />
                      ) : (
                        <div className="h-9 w-24 border border-dashed border-slate-300 rounded flex items-center justify-center text-[9px] text-slate-400 italic text-center px-0.5 leading-none">
                          (Belum Ada Logo)
                        </div>
                      )}
                    </div>

                    {/* Center: Title */}
                    <div className="text-center flex-1 min-w-0 px-1">
                      <div className="text-xs font-black tracking-wider uppercase text-slate-950 leading-tight truncate">
                        LAPORAN HARIAN
                      </div>
                      <div className="text-[9px] font-bold tracking-wide uppercase text-slate-800 leading-tight truncate">
                        DAILY ACTIVITY REPORT
                      </div>
                    </div>

                    {/* Right: Form Metadata */}
                    <div className="shrink-0 text-right text-[8px] space-y-0.5 font-medium text-slate-800 leading-tight pl-1">
                      <div className="whitespace-nowrap">No. Form: <span className="font-mono font-bold">AAA/CONS/FM-014</span></div>
                      <div className="whitespace-nowrap">Tgl: 14 Juli 2025</div>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 italic">
                  * Format: PNG, JPG, JPEG, SVG, WebP. Disarankan gambar dengan latar transparan / rasio horizontal agar pas di kop PDF.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProjectForContractorLogo(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveContractorLogo}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Logo PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: KELOLA AKUN KONTRAKTOR (PMO ONLY) */}
      {/* MODAL 3: KELOLA AKUN KONTRAKTOR & HAK AKSES PROYEK (PMO ONLY - EXACT USER DESIGN) */}
      {showContractorModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-auto p-5 sm:p-7 space-y-6 max-h-[94vh] overflow-y-auto border border-slate-200">
            {/* Top Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Users className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Kelola Akun Kontraktor & Hak Akses Proyek
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Buat akun login masing-masing kontraktor. Tiap kontraktor hanya bisa melihat proyek yang di-assign ke akunnya.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowContractorModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CARD 1: + BUAT AKUN KONTRAKTOR BARU */}
            <div className="p-4 sm:p-5 rounded-xl border border-blue-200 bg-blue-50/20 space-y-3.5">
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Buat Akun Kontraktor Baru</span>
              </div>

              <form onSubmit={handleCreateContractorAccount} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Perusahaan Kontraktor *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="PT. Nama Kontraktor"
                      value={newAccCompany}
                      onChange={(e) => setNewAccCompany(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Username Login *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: @kontraktor_a"
                      value={newAccUsername}
                      onChange={(e) => setNewAccUsername(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Password Login *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: pass1234"
                      value={newAccPassword}
                      onChange={(e) => setNewAccPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Assign Langsung ke Proyek (Opsional) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Assign Langsung ke Proyek (Opsional):
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {projects.map((p) => {
                      const isChecked = newAccProjects.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setNewAccProjects((prev) =>
                              isChecked ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                            isChecked
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-semibold'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span>{isChecked ? '✓' : '+'}</span>
                          <span>{p.name} {p.code ? `(${p.code})` : ''}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Simpan Akun Kontraktor Baru</span>
                  </button>
                </div>
              </form>
            </div>

            {/* SECTION: DAFTAR AKUN KONTRAKTOR TERDAFTAR */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-1 border-b border-slate-100 pb-2">
                <h4 className="font-bold text-slate-900 text-sm">
                  Daftar Akun Kontraktor Terdaftar ({activeContractorAccounts.length})
                </h4>
                <span className="text-slate-500 text-[11px] sm:text-xs">
                  Centang proyek di bawah tiap akun untuk mengatur akses proyeknya
                </span>
              </div>

              {/* LIST OF CONTRACTOR ACCOUNTS */}
              <div className="space-y-3">
                {activeContractorAccounts.length === 0 ? (
                  <div className="text-xs text-slate-500 bg-slate-50 p-6 rounded-xl border border-slate-200 text-center italic">
                    Belum ada akun kontraktor. Gunakan form di atas untuk menambahkan akun kontraktor baru.
                  </div>
                ) : (
                  activeContractorAccounts.map((acc) => {
                    const isPassVisible = visiblePasswords[acc.id] || false;
                    const isCopied = copiedAccountId === acc.id;
                    const accAssignedIds = safeAssigned(acc.assignedProjectIds);
                    const assignedProjList = (projects || []).filter(
                      (p) =>
                        accAssignedIds.includes(p.id) ||
                        (Array.isArray(p.assignedContractorUsernames) && p.assignedContractorUsernames.includes(acc.username))
                    );

                    return (
                      <div
                        key={acc.id}
                        className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 sm:p-5 space-y-3 shadow-2xs transition-all"
                      >
                        {/* Row 1: Company Name, Username Pill, Assigned Count Badge, Actions (Salin & Trash) */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm uppercase">
                              {acc.companyName || 'PT Kontraktor'}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono text-xs font-bold">
                              {acc.username}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                              {assignedProjList.length} Proyek Di-assign
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                            {/* Salin Akun */}
                            <button
                              type="button"
                              onClick={() => handleCopyCredentials(acc)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-2xs ${
                                isCopied
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                              }`}
                              title="Salin kredensial username & password"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                              <span>{isCopied ? 'Tersalin!' : 'Salin Akun'}</span>
                            </button>

                            {/* Hapus Akun */}
                            <button
                              type="button"
                              onClick={() => handleDeleteContractorAccount(acc.id)}
                              className="p-1.5 text-rose-600 hover:text-white bg-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg transition-colors cursor-pointer shadow-2xs"
                              title={`Hapus akun ${acc.username}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Row 2: Password, Toggle Eye, Ubah Username & Password */}
                        <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span>Password:</span>
                            <span className="font-mono font-bold tracking-widest text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                              {isPassVisible ? acc.password : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setVisiblePasswords((prev) => ({
                                  ...prev,
                                  [acc.id]: !prev[acc.id],
                                }))
                              }
                              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer ml-0.5"
                              title={isPassVisible ? 'Sembunyikan password' : 'Lihat password'}
                            >
                              {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleStartEditAccount(acc)}
                            className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer hover:underline"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Ubah Username & Password</span>
                          </button>
                        </div>

                        {/* Row 3: Proyek yang Dipegang Akun @username */}
                        <div className="space-y-1.5 pt-1 border-t border-slate-100">
                          <div className="text-[11px] font-semibold text-slate-700">
                            Proyek yang Dipegang Akun {acc.username}:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(projects || []).map((p) => {
                              const itemAssignedIds = safeAssigned(acc.assignedProjectIds);
                              const isAssigned =
                                itemAssignedIds.includes(p.id) ||
                                (Array.isArray(p.assignedContractorUsernames) && p.assignedContractorUsernames.includes(acc.username));

                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    // Toggle project assignment for this contractor
                                    const updated = contractorAccounts.map((a) => {
                                      if (a.id === acc.id) {
                                        const set = new Set(safeAssigned(a.assignedProjectIds));
                                        if (isAssigned) {
                                          set.delete(p.id);
                                        } else {
                                          set.add(p.id);
                                        }
                                        return { ...a, assignedProjectIds: Array.from(set) };
                                      }
                                      return a;
                                    });
                                    onSaveContractorAccounts?.(updated);

                                    // Also update project's assignedContractorUsernames
                                    if (onUpdateProject) {
                                      const currUsers = p.assignedContractorUsernames || [];
                                      const nextUsers = isAssigned
                                        ? currUsers.filter((u) => u !== acc.username)
                                        : [...currUsers, acc.username];
                                      onUpdateProject({
                                        ...p,
                                        assignedContractorUsernames: nextUsers,
                                      });
                                    }
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                                    isAssigned
                                      ? 'bg-emerald-600 text-white border-emerald-600'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  <span>{isAssigned ? '✓' : '+'}</span>
                                  <span>{p.name} {p.code ? `(${p.code})` : ''}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Modal Footer: Selesai Button */}
            <div className="pt-2 flex items-center justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowContractorModal(false)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-xs cursor-pointer text-xs"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3.5: EDIT DETAIL AKUN KONTRAKTOR (USERNAME, PASSWORD, PERUSAHAAN, DLL) */}
      {editingAccount && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full my-auto p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto animate-scale-up border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-indigo-600" />
                  <span>Edit Akun Kontraktor: {editingAccount.username}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Perbarui username, password, kontak, dan penugasan proyek untuk akun ini.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAccount} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Username Akun *</label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400">Otomatis diawali tanda @</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Password Baru *</label>
                  <input
                    type="text"
                    required
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-slate-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Nama Perusahaan Kontraktor *</label>
                  <input
                    type="text"
                    required
                    value={editCompany}
                    onChange={(e) => setEditCompany(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Kontak Person</label>
                  <input
                    type="text"
                    value={editContact}
                    onChange={(e) => setEditContact(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">No. WhatsApp / HP</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Otorisasi Proyek */}
              <div className="space-y-1.5 p-3 rounded-xl border border-slate-200 bg-slate-50">
                <label className="block font-bold text-slate-800">
                  Proyek yang Diberikan Hak Akses ({editProjects.length}):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-2.5 rounded-lg border border-slate-200 max-h-36 overflow-y-auto">
                  {projects.map((p) => {
                    const isChecked = editProjects.includes(p.id);
                    return (
                      <label key={p.id} className="flex items-center gap-2 text-[11px] cursor-pointer hover:bg-slate-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditProjects((prev) => [...prev, p.id]);
                            } else {
                              setEditProjects((prev) => prev.filter((id) => id !== p.id));
                            }
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="truncate font-medium text-slate-800">{p.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Perubahan Akun</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS PROYEK */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Hapus Proyek Konstruksi?</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-2 bg-rose-50/60 border border-rose-200 p-3.5 rounded-lg">
              <p>
                Anda akan menghapus proyek <strong className="text-slate-900">"{projectToDelete.name}"</strong> (ID: <span className="font-mono font-bold text-slate-900">{projectToDelete.code}</span>).
              </p>
              <p className="text-rose-800 font-medium">
                ⚠️ Seluruh data histori kalender harian dan laporan verifikasi terkait proyek ini akan ikut terhapus dari sistem.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteProject) {
                    onDeleteProject(projectToDelete.id);
                  }
                  setProjectToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Proyek Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
