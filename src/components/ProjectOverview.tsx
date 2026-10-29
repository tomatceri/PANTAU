import React, { useState } from 'react';
import { Project, DailyReport, UserRole } from '../types';
import { CheckCircle2, AlertTriangle, AlertCircle, CalendarDays, Archive, Plus, MapPin, Building, ChevronDown, Check } from 'lucide-react';

interface ProjectOverviewProps {
  projects: Project[];
  selectedProject: Project;
  onSelectProject: (proj: Project) => void;
  onAddProject: (proj: Project) => void;
  reports: DailyReport[];
  currentRole: UserRole;
  onDownloadMonthlyZip: () => void;
  onOpenReportForDate: (date: string) => void;
}

export const ProjectOverview: React.FC<ProjectOverviewProps> = ({
  projects,
  selectedProject,
  onSelectProject,
  onAddProject,
  reports,
  currentRole,
  onDownloadMonthlyZip,
  onOpenReportForDate,
}) => {
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Form for new project
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectCode, setNewProjectCode] = useState('');
  const [newContractorName, setNewContractorName] = useState('');
  const [newPmoLead, setNewPmoLead] = useState('');
  const [newLocation, setNewLocation] = useState('');

  // Calculate metrics for current project
  const projectReports = reports.filter((r) => r.projectId === selectedProject.id);
  const onTimeCount = projectReports.filter((r) => r.submissionTiming === 'on-time').length;
  const lateCount = projectReports.filter((r) => r.submissionTiming === 'late').length;
  const overdueCount = projectReports.filter((r) => r.submissionTiming === 'overdue').length;
  const approvedCount = projectReports.filter((r) => r.approvalStatus === 'approved').length;

  const todayStr = '2026-10-21';
  const todayReport = projectReports.find((r) => r.reportDate === todayStr);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName || !newProjectCode) return;

    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name: newProjectName.trim(),
      code: newProjectCode.trim().toUpperCase(),
      contractorName: newContractorName.trim() || 'General Contractor JV',
      pmoLead: newPmoLead.trim() || 'PMO Resident Engineer',
      location: newLocation.trim() || 'Site Sector 1',
      coordinates: '-6.2088° S, 106.8456° E',
      startDate: new Date().toISOString().split('T')[0],
      targetDate: '2027-12-31',
      status: 'Active',
      description: 'Infrastructure civil works and progress monitoring package.',
      targetSubmissionHour: 9,
    };

    onAddProject(newProj);
    onSelectProject(newProj);
    setShowProjectModal(false);
    setNewProjectName('');
    setNewProjectCode('');
  };

  return (
    <div className="space-y-4">
      {/* Top Banner: Project Title, Switcher & Quick Actions */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Project Selector Dropdown */}
              <div className="relative inline-block text-left">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="inline-flex items-center gap-2 text-xl font-bold text-slate-900 hover:text-slate-700 transition-colors"
                >
                  <span>{selectedProject.name}</span>
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                </button>

                {dropdownOpen && (
                  <div className="origin-top-left absolute left-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-slate-100 z-50">
                    <div className="py-1">
                      <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Select Active Project
                      </div>
                      {projects.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            onSelectProject(p);
                            setDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                            p.id === selectedProject.id ? 'font-semibold text-slate-900 bg-slate-50' : 'text-slate-700'
                          }`}
                        >
                          <div>
                            <div>{p.name}</div>
                            <div className="text-slate-400 font-mono text-[11px]">{p.code}</div>
                          </div>
                          {p.id === selectedProject.id && <Check className="w-4 h-4 text-slate-900" />}
                        </button>
                      ))}
                    </div>
                    {currentRole === 'pmo' && (
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            setShowProjectModal(true);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Create New Project
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {selectedProject.code}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>Contractor: <strong className="text-slate-700">{selectedProject.contractorName}</strong></span>
              </span>
              <span>·</span>
              <span>PMO Lead: <strong className="text-slate-700">{selectedProject.pmoLead}</strong></span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{selectedProject.location}</span>
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {todayReport && (
              <button
                onClick={() => onOpenReportForDate(todayStr)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded transition-colors ${
                  todayReport.approvalStatus === 'approved'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-500 text-white hover:bg-amber-600'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>
                  {todayReport.approvalStatus === 'approved' ? "Today's Report (Approved)" : "Edit Today's Report (Oct 21)"}
                </span>
              </button>
            )}

            <button
              onClick={onDownloadMonthlyZip}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded transition-colors"
              title="Download consolidated Monthly ZIP archive"
            >
              <Archive className="w-3.5 h-3.5 text-slate-600" />
              <span>Export Monthly ZIP Package</span>
            </button>
          </div>
        </div>

        {/* Contractor Reminder Banner if today is draft */}
        {currentRole === 'contractor' && todayReport && todayReport.approvalStatus === 'draft' && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Reminder for Contractor:</strong> Today&apos;s daily report (21 Oct 2026) is still in draft. Submit before tomorrow at 09:00 AM (H+1) to ensure on-time compliance.
              </span>
            </div>
            <button
              onClick={() => onOpenReportForDate(todayStr)}
              className="px-2.5 py-1 text-xs font-semibold bg-amber-600 text-white rounded hover:bg-amber-700 shrink-0 whitespace-nowrap"
            >
              Finish Today&apos;s Report
            </button>
          </div>
        )}
      </div>

      {/* Simple Status Cards (No complex scoring, clean metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* On-Time Submissions (🟢 H+1) */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">On-Time Submissions</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-600 tabular-nums">
              {onTimeCount}
            </span>
            <span className="text-xs text-slate-400">days (H+1 cut-off)</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Submitted within 24 hours of shift</p>
        </div>

        {/* Late Submissions (🟡 H+2 / H+3) */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Late Submissions</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-600 tabular-nums">
              {lateCount}
            </span>
            <span className="text-xs text-slate-400">days (H+2/H+3 delayed)</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Submitted with 1-2 days delay</p>
        </div>

        {/* Missing / Overdue Reports (🔴 >H+3) */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Overdue / Missing</span>
            <AlertCircle className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-red-600 tabular-nums">
              {overdueCount}
            </span>
            <span className="text-xs text-slate-400">unsubmitted</span>
          </div>
          <p className="text-[11px] text-red-600 font-medium mt-1">
            {overdueCount > 0 ? 'Requires immediate PM escalation' : 'No critical delinquencies'}
          </p>
        </div>

        {/* Total Monitored Reports */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Approved by PMO</span>
            <Check className="w-4 h-4 text-slate-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {approvedCount}
            </span>
            <span className="text-xs text-slate-400">/ {projectReports.length} records</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Signed-off & ready for billing</p>
        </div>
      </div>

      {/* Modal to Create New Project */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Create New Project</h3>
              <button
                onClick={() => setShowProjectModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. South Bypass Highway Flyover"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">PR/PO ID *</label>
                <input
                  type="text"
                  required
                  value={newProjectCode}
                  onChange={(e) => setNewProjectCode(e.target.value)}
                  placeholder="e.g. PR-2026-001 / RTS-01"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Contractor JV / Company</label>
                <input
                  type="text"
                  value={newContractorName}
                  onChange={(e) => setNewContractorName(e.target.value)}
                  placeholder="e.g. PT. Bestindo Putra Mandiri"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Project Manager</label>
                <input
                  type="text"
                  value={newPmoLead}
                  onChange={(e) => setNewPmoLead(e.target.value)}
                  placeholder="e.g. Simun Riyanto / Winduri Purba"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Site Location</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g. KM 24+500 South Sector"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded"
                >
                  Create & Open
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
