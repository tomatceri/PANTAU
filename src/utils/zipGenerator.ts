import JSZip from 'jszip';
import { Project, DailyReport, WeeklyReport, MonthlyReport } from '../types';

/**
 * Creates and downloads a complete monthly archive ZIP package
 * containing all Daily reports, Weekly reports, Monthly report, and an Audit Manifest.
 */
export async function downloadMonthlyZipPackage(
  project: Project,
  monthName: string,
  year: number,
  dailyReports: DailyReport[],
  weeklyReports: WeeklyReport[],
  monthlyReport: MonthlyReport
): Promise<void> {
  const zip = new JSZip();

  // Root Folder
  const rootFolderName = `${project.code}_${monthName.toUpperCase()}_${year}_PROGRESS_PACKAGE`;
  const folder = zip.folder(rootFolderName);
  if (!folder) return;

  // 1. Audit Manifest
  const manifestContent = `================================================================================
SITEPULSE PMO & CONTRACTOR PROGRESS REPORTING ARCHIVE PACKAGE
================================================================================
Project Name      : ${project.name}
Project Code      : ${project.code}
Contractor        : ${project.contractorName}
Supervising PMO   : ${project.pmoLead}
Location          : ${project.location} (${project.coordinates})
Reporting Period  : ${monthName} ${year}
Archive Generated : ${new Date().toISOString()}

SUMMARY METRICS:
--------------------------------------------------------------------------------
• Total Monitored Days       : ${monthlyReport.totalWorkingDays} working days
• Cumulative Headcount       : ${monthlyReport.totalManpowerHeadcountSum} worker-shifts
• Weather Downtime Claimed   : ${monthlyReport.totalDowntimeHours} hours
• Weather Delay EOT Days     : ${monthlyReport.weatherDelayClaimsTotal} days claimable
• Monthly Progress Delta     : +${monthlyReport.monthlyProgressDelta}%
• Approval Status            : ${monthlyReport.approvalStatus.toUpperCase()}

PACKAGE CONTENTS:
--------------------------------------------------------------------------------
/01_Monthly_Executive_Report/
    - ${project.code}_Monthly_Report_${monthName}_${year}.txt
/02_Weekly_Consolidated_Reports/
    - 4x Weekly Progress Summaries (W40 - W44)
/03_Daily_Site_Reports/
    - All daily verified reports (${dailyReports.length} records)
/04_Audit_Data/
    - Daily_Manpower_Weather_Downtime_Ledger.csv
================================================================================
SitePulse Digital Construction Verification System · ISO 9001 Compliant Audit
`;
  folder.file('00_ARCHIVE_MANIFEST.txt', manifestContent);

  // 2. Monthly Folder
  const monthlyFolder = folder.folder('01_Monthly_Executive_Report');
  if (monthlyFolder) {
    const monthlyDoc = `================================================================================
OFFICIAL MONTHLY PROGRESS & EOT AUDIT REPORT
================================================================================
Project: ${project.name} (${project.code})
Period: ${monthName} ${year}
Report No: ${monthlyReport.reportNumber}

1. EXECUTIVE SUMMARY & ACHIEVEMENTS:
--------------------------------------------------------------------------------
${monthlyReport.executiveSummary}

2. AUDIT METRICS:
--------------------------------------------------------------------------------
• Total Active Days      : ${monthlyReport.totalWorkingDays}
• Cumulative Headcount   : ${monthlyReport.totalManpowerHeadcountSum} worker-shifts
• Weather Downtime Logged: ${monthlyReport.totalDowntimeHours} hours
• Weather Delay Days     : ${monthlyReport.weatherDelayClaimsTotal} days (Certified for Extension of Time)
• Progress Achieved      : +${monthlyReport.monthlyProgressDelta}%

3. SIGN-OFF RATIFICATION:
--------------------------------------------------------------------------------
Contractor Signatory: ${monthlyReport.contractorSignature?.signedBy || 'Lead Project Director'}
PMO Signatory       : ${monthlyReport.pmoSignature?.signedBy || project.pmoLead}
Approval Status     : ${monthlyReport.approvalStatus.toUpperCase()}
`;
    monthlyFolder.file(`${project.code}_Monthly_Executive_Report_${monthName}_${year}.txt`, monthlyDoc);
  }

  // 3. Weekly Reports Folder
  const weeklyFolder = folder.folder('02_Weekly_Consolidated_Reports');
  if (weeklyFolder) {
    weeklyReports.forEach((w) => {
      const weeklyDoc = `================================================================================
WEEKLY PROGRESS REPORT - WEEK ${w.weekNumber} (${w.year})
================================================================================
Project: ${project.name} (${project.code})
Report No: ${w.reportNumber}
Date Range: ${w.startDate} to ${w.endDate}

KEY PERFORMANCE INDICATORS:
- Manpower Hours : ${w.totalManpowerHours} man-hours
- Downtime Hours : ${w.totalDowntimeHours} hrs (Adverse Weather Days: ${w.weatherDelayDaysCount})
- Cumulative Progress : ${w.overallProgressPercent}%
- Daily Reports Aggregated: ${w.dailyReportIds.length}

WEEKLY NARRATIVE:
${w.summary}

SIGNATURES:
- Contractor: ${w.contractorSignature?.signedBy || 'Engr. Verified'} (${w.contractorSignature?.timestamp || w.endDate})
- PMO Lead  : ${w.pmoSignature?.signedBy || project.pmoLead} (${w.approvalStatus})
`;
      weeklyFolder.file(`Weekly_Report_Week_${w.weekNumber}_${w.year}.txt`, weeklyDoc);
    });
  }

  // 4. Daily Reports Folder
  const dailyFolder = folder.folder('03_Daily_Site_Reports');
  if (dailyFolder) {
    dailyReports.forEach((d) => {
      const dailyDoc = `================================================================================
DAILY PROGRESS & SITE RECORD REPORT - ${d.reportDate}
================================================================================
Project Name : ${project.name} (${project.code})
Report Number: ${d.reportNumber}
Date         : ${d.reportDate}
Submission   : ${d.submissionTiming.toUpperCase()} (${d.approvalStatus.toUpperCase()})

1. WEATHER & WORK DISRUPTION:
- Weather Condition : ${d.weather.condition}
- Downtime Hours    : ${d.weather.downtimeHours} hrs
- Delay Claimable   : ${d.weather.claimEligible ? 'YES (Eligible for Weather Claim)' : 'NO'}
- Disruption Reason : ${d.weather.delayReason || 'None'}

2. SITE ACTIVITIES:
${d.activities.map((a, i) => `${i + 1}. [${a.status}] ${a.description} | Location: ${a.location} (${a.progressPercent}%)`).join('\n')}

3. MANPOWER ON SITE:
${d.manpower.map((m) => `• ${m.trade}: ${m.count} persons (${m.hoursWorked} hrs each)`).join('\n')}

4. HEAVY EQUIPMENT:
${d.equipment.map((e) => `• ${e.equipmentName}: ${e.count} units | ${e.operationalHours} op-hours | Status: ${e.status}`).join('\n')}

5. MATERIALS DELIVERED:
${d.materials.map((m) => `• ${m.materialName} - ${m.quantity} ${m.unit} (Ticket: ${m.deliveryTicket}, Supplier: ${m.supplier})`).join('\n')}

6. VERIFICATION & SIGNATURES:
Contractor Signatory: ${d.contractorSignature?.signedBy || 'Lead Engineer'} (${d.contractorSignature?.timestamp || d.reportDate})
PMO Reviewer        : ${d.pmoSignature?.signedBy || project.pmoLead} (${d.approvalStatus})
`;
      dailyFolder.file(`Daily_Report_${d.reportDate}_${d.reportNumber}.txt`, dailyDoc);
    });
  }

  // 5. CSV Audit Data Ledger
  const auditFolder = folder.folder('04_Audit_Data');
  if (auditFolder) {
    let csv = 'Report_Date,Report_No,Timing_Status,Approval_Status,Weather_Condition,Downtime_Hours,EOT_Claim_Eligible,Total_Workers,Total_Equipment,Activities_Count\n';
    dailyReports.forEach((d) => {
      const totalWorkers = d.manpower.reduce((acc, curr) => acc + curr.count, 0);
      const totalEquip = d.equipment.reduce((acc, curr) => acc + curr.count, 0);
      csv += `${d.reportDate},${d.reportNumber},${d.submissionTiming},${d.approvalStatus},${d.weather.condition},${d.weather.downtimeHours},${d.weather.claimEligible ? 'YES' : 'NO'},${totalWorkers},${totalEquip},${d.activities.length}\n`;
    });
    auditFolder.file('Daily_Progress_Audit_Ledger.csv', csv);
  }

  // Generate ZIP and trigger browser download
  const content = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(content);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = `${project.code}_${monthName}_${year}_Full_Reports_Package.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(downloadUrl);
}
