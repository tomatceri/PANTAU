import React from 'react';
import { DailyReport, Project } from '../types';
import { HOURS_24 } from '../utils/formDefaults';
import { FileCheck, Calendar, ShieldCheck, MapPin } from 'lucide-react';

interface OfficialDailyReportViewProps {
  report: DailyReport;
  project: Project;
  showAttachments?: boolean;
}

export const OfficialDailyReportView: React.FC<OfficialDailyReportViewProps> = ({
  report,
  project,
  showAttachments = true,
}) => {
  // Format execution date
  const formatIndoDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const months = [
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        return `${parseInt(parts[2], 10)} ${months[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  // 24h weather split into 2 halves (01:00-12:00 and 13:00-24:00)
  const morningHours = HOURS_24.slice(0, 12);
  const afternoonHours = HOURS_24.slice(12, 24);
  const hourlyWeather = report.hourlyWeather || {};

  // BOQ items split into Left & Right columns
  const boqItems = report.boqItems || [];
  const boqHalf = Math.max(8, Math.ceil(boqItems.length / 2));
  const leftBoq = boqItems.slice(0, boqHalf);
  const rightBoq = boqItems.slice(boqHalf);

  // BOM items split into Left & Right columns
  const bomItems = report.bomItems || [];
  const bomHalf = Math.max(4, Math.ceil(bomItems.length / 2));
  const leftBom = bomItems.slice(0, bomHalf);
  const rightBom = bomItems.slice(bomHalf);

  // Manpower & Equipment
  const manpower = report.manpower || [];
  const equipment = report.equipment || [];

  // Weather code visual color
  const getWeatherBadgeClass = (code?: string) => {
    switch (code) {
      case 'C': return 'bg-amber-100 text-amber-950 font-bold';
      case 'M': return 'bg-slate-200 text-slate-800 font-medium';
      case 'G': return 'bg-sky-100 text-sky-900 font-semibold';
      case 'H': return 'bg-blue-600 text-white font-bold';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* PAGE 1: EXACT REPLICA OF AAA/CONS/FM-014 */}
      <div 
        id="official-daily-report-page-1"
        className="bg-white text-black font-sans border-2 border-black max-w-[210mm] mx-auto p-4 sm:p-6 shadow-md print:shadow-none print:border-black print:p-2 print:m-0"
        style={{ minHeight: '290mm' }}
      >
        {/* Top Header Box */}
        <div className="border border-black p-2.5 mb-1.5 relative flex items-center justify-center min-h-[52px]">
          <div className="text-center">
            <h1 className="text-base sm:text-lg font-black tracking-wider uppercase text-slate-950 leading-tight">
              LAPORAN HARIAN
            </h1>
            <h2 className="text-xs sm:text-sm font-bold tracking-wide uppercase text-slate-800">
              DAILY ACTIVITY REPORT
            </h2>
          </div>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-right text-[9px] sm:text-[10px] space-y-0.5 font-medium">
            <div className="flex justify-end gap-1.5">
              <span className="font-bold text-slate-700">No. Form :</span>
              <span className="font-mono font-bold text-slate-950">{report.docCode || 'AAA/CONS/FM-014 Rev01'}</span>
            </div>
            <div className="flex justify-end gap-1.5">
              <span className="font-bold text-slate-700">Tgl. Berlaku :</span>
              <span className="text-slate-900">{report.docEffectiveDate || '14 Juli 2025'}</span>
            </div>
          </div>
        </div>

        {/* Separator spacing */}
        <div className="border-t border-b border-black h-1.5 mb-1.5 bg-slate-100"></div>

        {/* Project Metadata Table (100% Symmetric Grid) */}
        <table className="w-full border-collapse border border-black text-[9px] sm:text-[10px] mb-1.5 leading-tight">
          <tbody>
            <tr>
              <td className="border border-black px-2.5 py-1 font-bold w-[18%] bg-slate-50">
                PR/ PO ID :
              </td>
              <td className="border border-black px-2.5 py-1 font-mono font-medium w-[32%]">
                {report.nomorBpmpo || report.reportNumber || 'TKCMPO - 2505010'}
              </td>
              <td className="border border-black px-2.5 py-1 font-bold w-[22%] bg-slate-50">
                Tanggal Pelaksanaan :
              </td>
              <td className="border border-black px-2.5 py-1 font-medium text-slate-900 w-[28%]">
                {formatIndoDate(report.reportDate)}
              </td>
            </tr>
            <tr>
              <td className="border border-black px-2.5 py-1 font-bold bg-slate-50">
                Jenis Pekerjaan :
              </td>
              <td colSpan={3} className="border border-black px-2.5 py-1 font-medium">
                {project.name || 'Renewal Tube Settler'}
              </td>
            </tr>
            <tr>
              <td className="border border-black px-2.5 py-1 font-bold bg-slate-50">
                Lokasi Proyek :
              </td>
              <td colSpan={3} className="border border-black px-2.5 py-1 font-medium">
                {project.location || 'PT. TIRTA KENCANA CAHAYA MANDIRI'}
              </td>
            </tr>
            <tr>
              <td className="border border-black px-2.5 py-1 font-bold bg-slate-50">
                Kontraktor :
              </td>
              <td colSpan={3} className="border border-black px-2.5 py-1 font-medium">
                {report.contractorSignatory?.companyName || project.contractorName || 'PT. BESTINDO PUTRA MANDIRI'}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Catatan (Notes) & Attendee (Daftar Hadir) Row */}
        <div className="grid grid-cols-12 border border-black mb-2 text-[8.5px] sm:text-[9.5px]">
          {/* Left Column: Catatan */}
          <div className="col-span-5 border-r border-black p-2 flex flex-col justify-start bg-white">
            <div className="font-bold underline text-[9px] sm:text-[10px] mb-1">
              Catatan :
            </div>
            <div className="text-[8px] sm:text-[8.5px] text-slate-800 leading-relaxed whitespace-pre-wrap">
              {report.notes || report.generalNotes || report.weather?.delayReason || 'Pekerjaan dilaksanakan sesuai dengan jadwal dan instruksi pengawas lapangan.'}
            </div>
          </div>

          {/* Right Column: Daftar Hadir Table */}
          <div className="col-span-7">
            <table className="w-full border-collapse h-full">
              <thead>
                <tr className="bg-slate-50 border-b border-black text-center font-bold">
                  <th className="border-r border-black py-1 px-2 w-[40%]">NAMA</th>
                  <th className="border-r border-black py-1 px-2 w-[35%]">JABATAN / INSTANSI</th>
                  <th className="py-1 px-2 w-[25%]">TANDA TANGAN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {(report.attendees && report.attendees.length > 0
                  ? report.attendees.slice(0, 2)
                  : [
                      { id: '1', nama: 'Adhe Juliawaludin', jabatan: 'Supervisor', instansi: '' },
                      { id: '2', nama: 'Anis Sulfuad', jabatan: 'HSE', instansi: '' },
                    ]
                ).map((att, idx) => (
                  <tr key={att.id || idx} className="h-6">
                    <td className="border-r border-black px-2 py-1 font-medium">{att.nama}</td>
                    <td className="border-r border-black px-2 py-1 text-center">
                      {att.jabatan} {att.instansi ? `(${att.instansi})` : ''}
                    </td>
                    <td className="px-2 py-1 text-center">
                      {/* Clean empty signature cell */}
                    </td>
                  </tr>
                ))}
                {Array.from({ length: Math.max(0, 2 - (report.attendees?.length || 2)) }).map((_, i) => (
                  <tr key={`att-filler-${i}`} className="h-6">
                    <td className="border-r border-black px-2 py-1"></td>
                    <td className="border-r border-black px-2 py-1"></td>
                    <td className="px-2 py-1"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* COMBINED RESOURCE & WEATHER SECTION (Tenaga Kerja, Peralatan, Cuaca 24 Jam) */}
        <div className="border border-black mb-1.5 overflow-hidden">
          <div className="grid grid-cols-12 text-[8.5px] sm:text-[9.5px] divide-x divide-black leading-tight">
            {/* 1. Tenaga Kerja (4 cols) */}
            <div className="col-span-4 flex flex-col justify-between">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-black text-center font-bold h-6">
                    <th className="border-r border-black py-1 px-1 w-7">No</th>
                    <th className="border-r border-black py-1 px-1">Tenaga Kerja</th>
                    <th className="py-1 px-1 w-12">Orang</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {manpower.slice(0, 12).map((m, idx) => (
                    <tr key={m.id || idx} className="h-[18px]">
                      <td className="border-r border-black text-center px-1 font-mono text-[8px]">{idx + 1}</td>
                      <td className="border-r border-black px-1.5 truncate">{m.trade}</td>
                      <td className="text-center font-mono font-semibold px-1">{m.count}</td>
                    </tr>
                  ))}
                  {Array.from({ length: Math.max(0, 12 - manpower.length) }).map((_, i) => (
                    <tr key={`mp-empty-${i}`} className="h-[18px]">
                      <td className="border-r border-black text-center px-1 font-mono text-[8px]">{manpower.length + i + 1}</td>
                      <td className="border-r border-black px-1.5 text-slate-300">-</td>
                      <td className="text-center font-mono text-slate-300">-</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold border-t border-black h-[22px]">
                    <td colSpan={2} className="border-r border-black px-2 py-0.5 text-right uppercase text-[8px]">
                      Total Tenaga Kerja :
                    </td>
                    <td className="text-center font-mono py-0.5 font-bold">
                      {manpower.reduce((acc, cur) => acc + (cur.count || 0), 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 2. Peralatan (5 cols) */}
            <div className="col-span-5 flex flex-col justify-between">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-black text-center font-bold h-6">
                    <th className="border-r border-black py-1 px-1">Peralatan</th>
                    <th className="border-r border-black py-1 px-0.5 w-10">Jumlah</th>
                    <th className="border-r border-black py-1 px-0.5 w-14">Jumlah Stok</th>
                    <th className="py-1 px-1">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {equipment.slice(0, 12).map((eq, idx) => (
                    <tr key={eq.id || idx} className="h-[18px]">
                      <td className="border-r border-black px-1.5 truncate font-medium">{eq.equipmentName}</td>
                      <td className="border-r border-black text-center font-mono px-0.5">{eq.count}</td>
                      <td className="border-r border-black text-center font-mono px-0.5">{eq.status === 'Standby' ? eq.count : 0}</td>
                      <td className="px-1 text-[8px] truncate">{!eq.status ? '-' : eq.status === 'Operating' ? 'Operasi' : eq.status}</td>
                    </tr>
                  ))}
                  {Array.from({ length: Math.max(0, 12 - equipment.length) }).map((_, i) => (
                    <tr key={`eq-empty-${i}`} className="h-[18px]">
                      <td className="border-r border-black px-1.5 text-slate-300">-</td>
                      <td className="border-r border-black text-center font-mono text-slate-300">-</td>
                      <td className="border-r border-black text-center font-mono text-slate-300">-</td>
                      <td className="px-1 text-slate-300">-</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold border-t border-black h-[22px]">
                    <td className="border-r border-black px-1.5 py-0.5 text-right uppercase text-[8px]">
                      Total Unit :
                    </td>
                    <td className="border-r border-black text-center font-mono py-0.5 font-bold">
                      {equipment.reduce((acc, cur) => acc + (cur.count || 0), 0)}
                    </td>
                    <td className="border-r border-black text-center font-mono py-0.5 font-bold">
                      {equipment.filter((e) => e.status === 'Standby').reduce((acc, cur) => acc + cur.count, 0)}
                    </td>
                    <td className="px-1 text-[8px] text-slate-600 font-normal truncate">Siap kerja</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 3. Cuaca 24 Jam (3 cols) */}
            <div className="col-span-3 flex flex-col justify-between">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-black text-center font-bold h-6">
                    <th colSpan={2} className="border-r border-black py-1 px-1">Cuaca</th>
                    <th colSpan={2} className="border-r border-black py-1 px-1">Cuaca</th>
                    <th className="py-1 px-1 w-14">Ket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black text-[8px] font-mono">
                  {morningHours.map((mHour, idx) => {
                    const aHour = afternoonHours[idx];
                    const mCode = hourlyWeather[mHour] || 'C';
                    const aCode = hourlyWeather[aHour] || 'C';

                    return (
                      <tr key={mHour} className="h-[18px]">
                        <td className="border-r border-black text-center px-0.5 bg-slate-50 text-[7.5px] w-8">
                          {mHour}
                        </td>
                        <td className={`border-r border-black text-center px-1 w-5 ${getWeatherBadgeClass(mCode)}`}>
                          {mCode}
                        </td>
                        <td className="border-r border-black text-center px-0.5 bg-slate-50 text-[7.5px] w-8">
                          {aHour}
                        </td>
                        <td className={`border-r border-black text-center px-1 w-5 ${getWeatherBadgeClass(aCode)}`}>
                          {aCode}
                        </td>
                        {/* Legend on the right side on specific rows */}
                        {idx === 0 && (
                          <td rowSpan={3} className="px-1 align-top text-[7px] font-sans leading-tight bg-slate-50/50">
                            <strong>C</strong> = Cerah
                          </td>
                        )}
                        {idx === 3 && (
                          <td rowSpan={3} className="px-1 align-top text-[7px] font-sans leading-tight bg-slate-50/50">
                            <strong>M</strong> = Mendung
                          </td>
                        )}
                        {idx === 6 && (
                          <td rowSpan={3} className="px-1 align-top text-[7px] font-sans leading-tight bg-slate-50/50">
                            <strong>G</strong> = Gerimis
                          </td>
                        )}
                        {idx === 9 && (
                          <td rowSpan={3} className="px-1 align-top text-[7px] font-sans leading-tight bg-slate-50/50">
                            <strong className="text-blue-700">H</strong> = Hujan
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-50 font-bold border-t border-black text-[7.5px] font-sans h-[22px]">
                    <td colSpan={4} className="border-r border-black px-1 py-0.5 text-right">
                      Downtime Hujan :
                    </td>
                    <td className="text-center font-mono font-bold text-blue-900 py-0.5">
                      {report.weather?.downtimeHours || 0} Jam
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* JENIS PEKERJAAN (BOQ) - 2 COLUMN SPLIT */}
        <div className="border border-black mb-1.5">
          <div className="bg-slate-100 border-b border-black text-center font-bold text-[9px] sm:text-[10px] py-0.5 uppercase tracking-wider">
            Jenis Pekerjaan (BOQ)
          </div>
          <div className="grid grid-cols-2 divide-x divide-black text-[8px] sm:text-[9px]">
            {/* Left Column of BOQ */}
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-black text-center font-bold h-5">
                  <th className="border-r border-black py-0.5 px-1 w-12">Kode</th>
                  <th className="border-r border-black py-0.5 px-1">Deskripsi pekerjaan</th>
                  <th className="border-r border-black py-0.5 px-1 w-12">Satuan</th>
                  <th className="py-0.5 px-1 w-14">Install</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {leftBoq.map((item, idx) => (
                  <tr key={item.id || idx} className="h-5">
                    <td className="border-r border-black text-center font-mono px-1">{item.kode}</td>
                    <td className="border-r border-black px-1.5 truncate">{item.deskripsi}</td>
                    <td className="border-r border-black text-center px-1">{item.satuan}</td>
                    <td className="text-center font-mono font-semibold px-1.5">{item.install}</td>
                  </tr>
                ))}
                {Array.from({ length: Math.max(0, 7 - leftBoq.length) }).map((_, i) => (
                  <tr key={`lboq-empty-${i}`} className="h-5">
                    <td className="border-r border-black text-center font-mono text-slate-300">-</td>
                    <td className="border-r border-black px-1.5 text-slate-300">-</td>
                    <td className="border-r border-black text-center text-slate-300">-</td>
                    <td className="text-center font-mono text-slate-300">-</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Right Column of BOQ */}
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-black text-center font-bold h-5">
                  <th className="border-r border-black py-0.5 px-1 w-12">Kode</th>
                  <th className="border-r border-black py-0.5 px-1">Deskripsi pekerjaan</th>
                  <th className="border-r border-black py-0.5 px-1 w-12">Satuan</th>
                  <th className="py-0.5 px-1 w-14">Install</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {rightBoq.map((item, idx) => (
                  <tr key={item.id || idx} className="h-5">
                    <td className="border-r border-black text-center font-mono px-1">{item.kode}</td>
                    <td className="border-r border-black px-1.5 truncate">{item.deskripsi}</td>
                    <td className="border-r border-black text-center px-1">{item.satuan}</td>
                    <td className="text-center font-mono font-semibold px-1.5">{item.install}</td>
                  </tr>
                ))}
                {Array.from({ length: Math.max(0, 7 - rightBoq.length) }).map((_, i) => (
                  <tr key={`rboq-empty-${i}`} className="h-5">
                    <td className="border-r border-black text-center font-mono text-slate-300">-</td>
                    <td className="border-r border-black px-1.5 text-slate-300">-</td>
                    <td className="border-r border-black text-center text-slate-300">-</td>
                    <td className="text-center font-mono text-slate-300">-</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* JENIS MATERIAL (BOM) - 2 COLUMN SPLIT */}
        <div className="border border-black mb-1.5">
          <div className="bg-slate-100 border-b border-black text-center font-bold text-[9px] sm:text-[10px] py-0.5 uppercase tracking-wider">
            Jenis Material (BOM)
          </div>
          <div className="grid grid-cols-2 divide-x divide-black text-[8px] sm:text-[9px]">
            {/* Left Column of BOM */}
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-black text-center font-bold h-5">
                  <th className="border-r border-black py-0.5 px-1 w-12">Kode</th>
                  <th className="border-r border-black py-0.5 px-1">Jenis Material</th>
                  <th className="border-r border-black py-0.5 px-1 w-12">Satuan</th>
                  <th className="py-0.5 px-1 w-14">Install</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {leftBom.map((item, idx) => (
                  <tr key={item.id || idx} className="h-5">
                    <td className="border-r border-black text-center font-mono px-1">{item.kode}</td>
                    <td className="border-r border-black px-1.5 truncate">{item.jenisMaterial}</td>
                    <td className="border-r border-black text-center px-1">{item.satuan}</td>
                    <td className="text-center font-mono font-semibold px-1.5">{item.install}</td>
                  </tr>
                ))}
                {Array.from({ length: Math.max(0, 4 - leftBom.length) }).map((_, i) => (
                  <tr key={`lbom-empty-${i}`} className="h-5">
                    <td className="border-r border-black text-center font-mono text-slate-300">-</td>
                    <td className="border-r border-black px-1.5 text-slate-300">-</td>
                    <td className="border-r border-black text-center text-slate-300">-</td>
                    <td className="text-center font-mono text-slate-300">-</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Right Column of BOM */}
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-black text-center font-bold h-5">
                  <th className="border-r border-black py-0.5 px-1 w-12">Kode</th>
                  <th className="border-r border-black py-0.5 px-1">Jenis Material</th>
                  <th className="border-r border-black py-0.5 px-1 w-12">Satuan</th>
                  <th className="py-0.5 px-1 w-14">Install</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {rightBom.map((item, idx) => (
                  <tr key={item.id || idx} className="h-5">
                    <td className="border-r border-black text-center font-mono px-1">{item.kode}</td>
                    <td className="border-r border-black px-1.5 truncate">{item.jenisMaterial}</td>
                    <td className="border-r border-black text-center px-1">{item.satuan}</td>
                    <td className="text-center font-mono font-semibold px-1.5">{item.install}</td>
                  </tr>
                ))}
                {Array.from({ length: Math.max(0, 4 - rightBom.length) }).map((_, i) => (
                  <tr key={`rbom-empty-${i}`} className="h-5">
                    <td className="border-r border-black text-center font-mono text-slate-300">-</td>
                    <td className="border-r border-black px-1.5 text-slate-300">-</td>
                    <td className="border-r border-black text-center text-slate-300">-</td>
                    <td className="text-center font-mono text-slate-300">-</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* LAMPIRAN DOKUMENTASI FOTO LAPANGAN (Positioned BEFORE Mengetahui / Menyetujui) */}
        <div className="border border-black mb-1.5">
          <div className="bg-slate-100 border-b border-black text-center font-bold text-[9px] sm:text-[10px] py-0.5 uppercase tracking-wider">
            Lampiran Dokumentasi Foto Lapangan
          </div>
          <div className="p-2 bg-white">
            {report.photos && report.photos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {report.photos.slice(0, 3).map((photo, i) => (
                  <div key={photo.id || i} className="border border-slate-300 rounded p-1 bg-slate-50 space-y-1">
                    <div className="relative aspect-4/3 rounded overflow-hidden bg-slate-100 border border-slate-200 max-h-28 flex items-center justify-center">
                      <img 
                        src={photo.url} 
                        alt={photo.caption} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-[8px] font-medium text-slate-800 truncate px-0.5 text-center">
                      {photo.caption || `Foto #${i + 1}`}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-2 text-center text-[8px] text-slate-400 italic">
                Tidak ada lampiran foto dokumentasi untuk laporan ini.
              </div>
            )}
          </div>
        </div>

        {/* MENGETAHUI / MENYETUJUI (3 PARTY SIGNATURE BLOCK) */}
        <div className="border border-black mb-1.5">
          <div className="bg-slate-100 border-b border-black text-center font-bold text-[9px] sm:text-[10px] py-0.5 uppercase">
            Mengetahui/ Menyetujui
          </div>
          <div className="grid grid-cols-3 divide-x divide-black text-center text-[8.5px] sm:text-[9.5px]">
            {/* Party 1: Kontraktor */}
            <div className="p-2 flex flex-col justify-between min-h-[85px]">
              <div>
                <div className="font-semibold text-[8px] text-slate-700">Project Manager</div>
                <div className="font-bold text-slate-900 text-[8.5px]">{report.contractorSignatory?.companyName || project.contractorName}</div>
              </div>
              <div className="py-1 min-h-[30px] flex items-center justify-center">
                {report.approvalStatus === 'approved' ? (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 border border-dashed border-emerald-600 rounded bg-emerald-50 text-emerald-800 text-[8px] font-semibold">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Terverifikasi Kontraktor</span>
                  </div>
                ) : (
                  <div className="h-6"></div>
                )}
              </div>
              <div className="border-t border-slate-300 pt-1">
                <div className="font-bold underline text-slate-900">
                  {report.contractorSignatory?.signedBy || 'Ir. Budi Santoso'}
                </div>
                <div className="text-[7.5px] text-slate-600">
                  {report.contractorSignatory?.title || 'Project Manager'}
                </div>
              </div>
            </div>

            {/* Party 2: Konsultan Supervisi */}
            <div className="p-2 flex flex-col justify-between min-h-[85px]">
              <div>
                <div className="font-semibold text-[8px] text-slate-700">Project Manager Konsultan,</div>
                <div className="font-bold text-slate-900 text-[8.5px]">{report.consultantSignatory?.companyName || 'PT KeylaAubreyRapli'}</div>
              </div>
              <div className="py-1 min-h-[30px] flex items-center justify-center">
                {report.approvalStatus === 'approved' ? (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 border border-dashed border-emerald-600 rounded bg-emerald-50 text-emerald-800 text-[8px] font-semibold">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Terverifikasi Supervisi</span>
                  </div>
                ) : (
                  <div className="h-6"></div>
                )}
              </div>
              <div className="border-t border-slate-300 pt-1">
                <div className="font-bold underline text-slate-900">
                  {report.consultantSignatory?.signedBy || 'Hendra Wijaya, ST'}
                </div>
                <div className="text-[7.5px] text-slate-600">
                  {report.consultantSignatory?.title || 'Team Leader'}
                </div>
              </div>
            </div>

            {/* Party 3: PMO / Owner */}
            <div className="p-2 flex flex-col justify-between min-h-[85px]">
              <div>
                <div className="font-semibold text-[8px] text-slate-700">Project Manager,</div>
                <div className="font-bold text-slate-900 text-[8.5px]">{report.pmoSignatory?.companyName || 'PT AubreyKeylaRapli'}</div>
              </div>
              <div className="py-1 min-h-[30px] flex items-center justify-center">
                {/* Clean signing space for wet signature (TTD) */}
                <div className="h-6"></div>
              </div>
              <div className="border-t border-slate-300 pt-1">
                <div className="font-bold underline text-slate-900">
                  {report.pmoSignatory?.signedBy || project.pmoLead.split('(')[0].trim()}
                </div>
                <div className="text-[7.5px] text-slate-600">
                  {report.pmoSignatory?.title || 'Project Manager'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page Footer */}
        <div className="flex justify-between items-center text-[8px] font-mono text-slate-600 pt-1">
          <div>Page 1</div>
          <div>{report.docFooterCode || 'Daily Report-P2-ND000-JDU-09'}</div>
        </div>
      </div>
    </div>
  );
};
