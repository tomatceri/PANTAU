import React, { useState } from 'react';
import { Project, DailyReport, EscalationAlert } from '../types';
import { 
  AlertTriangle, Send, Mail, CheckCircle2, X, Smartphone, 
  Copy, ExternalLink, Check, Calendar, Plus 
} from 'lucide-react';
import { getRealTodayStr } from '../utils/formDefaults';
import { INDONESIAN_DAY_NAMES, parseLocalDate } from '../utils/calendarStatus';

interface EscalationModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  reports: DailyReport[];
  overdueDates: string[];
  todayStr: string;
  escalationLog: EscalationAlert[];
  onSendEscalation: (alert: EscalationAlert) => void;
  preselectedDate?: string;
  currentRole?: 'contractor' | 'pmo';
  onSelectDate?: (date: string) => void;
}

export const EscalationModal: React.FC<EscalationModalProps> = ({
  isOpen,
  onClose,
  project,
  overdueDates,
  todayStr,
  escalationLog,
  onSendEscalation,
  preselectedDate,
  currentRole = 'pmo',
  onSelectDate,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  
  // Helper to format Indonesian WhatsApp number strictly as: 8XX-XXXX-XXXX
  const formatWaNumber = (input: string): string => {
    let digits = input.replace(/\D/g, '');
    if (digits.startsWith('62')) {
      digits = digits.slice(2);
    }
    if (digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    digits = digits.slice(0, 12);

    if (digits.length <= 3) {
      return digits;
    }
    if (digits.length <= 7) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  // Separated fields: Name, Title, WA Number, Email Address
  const [recipientName, setRecipientName] = useState('Ir. Budi Santoso, MT');
  const [recipientTitle, setRecipientTitle] = useState('Project Manager / Kepala Proyek Kontraktor');
  const [whatsappInput, setWhatsappInput] = useState('812-9844-3200');
  const [emailAddress, setEmailAddress] = useState('budi.santoso@jayakonstruksi.com, pm.kontraktor@proyek.id');

  const [customDates, setCustomDates] = useState<string[]>([]);
  const [customAddDate, setCustomAddDate] = useState('');
  const [copied, setCopied] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  const activeTodayStr = todayStr || getRealTodayStr();

  // Synchronized directly with actual Red (Terlambat) dates on the calendar up to the day dashboard is opened
  const candidateDates = React.useMemo(() => {
    const datesSet = new Set<string>(overdueDates);
    customDates.forEach((d) => datesSet.add(d));
    if (preselectedDate) {
      datesSet.add(preselectedDate);
    }
    return Array.from(datesSet).sort();
  }, [overdueDates, customDates, preselectedDate]);

  // Multi-date selection kept in sync with actual calendar overdue dates
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  React.useEffect(() => {
    if (!isOpen) return;
    if (preselectedDate) {
      setSelectedDates([preselectedDate]);
    } else {
      setSelectedDates([...overdueDates]);
    }
  }, [isOpen, preselectedDate, overdueDates]);

  if (!isOpen) return null;

  // Toggle select all dates
  const handleToggleSelectAll = () => {
    if (candidateDates.length === 0) return;
    if (selectedDates.length === candidateDates.length) {
      setSelectedDates(preselectedDate ? [preselectedDate] : [candidateDates[candidateDates.length - 1]]);
    } else {
      setSelectedDates([...candidateDates]);
    }
  };

  // Helper to calculate real-time H+ delay relative to the actual day the dashboard is opened
  const getDelayInfo = (dateStr: string) => {
    const todayDate = parseLocalDate(activeTodayStr);
    const reportDateObj = parseLocalDate(dateStr);
    const diffDays = Math.max(
      0,
      Math.round((todayDate.getTime() - reportDateObj.getTime()) / (1000 * 60 * 60 * 24))
    );

    const hCode = diffDays <= 1 ? 'H+1' : `H+${diffDays}`;
    const delayDescription =
      diffDays === 0
        ? 'Hari berjalan (batas cut-off besok 09:00 WIB)'
        : diffDays === 1
        ? 'Batas Cut-off H+1 Hari Ini (09:00 WIB)'
        : `${diffDays - 1} hari melebihi batas cut-off H+1`;

    const dayOfWeek = INDONESIAN_DAY_NAMES[reportDateObj.getDay()] || '';

    return {
      dateStr,
      dayOfWeek,
      hCode,
      diffDays,
      delayDescription,
    };
  };

  const toggleDateSelection = (dateStr: string) => {
    if (selectedDates.includes(dateStr)) {
      if (selectedDates.length > 1) {
        setSelectedDates(selectedDates.filter((d) => d !== dateStr));
      }
    } else {
      setSelectedDates([...selectedDates, dateStr].sort());
    }
  };

  const handleAddCustomDate = () => {
    if (!customAddDate) return;
    if (!customDates.includes(customAddDate)) {
      setCustomDates((prev) => [...prev, customAddDate]);
    }
    if (!selectedDates.includes(customAddDate)) {
      setSelectedDates((prev) => [...prev, customAddDate].sort());
    }
    setCustomAddDate('');
  };

  // Build delay items list for templates
  const delayItems = selectedDates.map((d) => getDelayInfo(d));

  // Dynamic WhatsApp text
  const waDatesList = delayItems
    .map(
      (item, idx) =>
        `${idx + 1}. *${item.dateStr} (${item.dayOfWeek})* — Status: *${item.hCode}* (${item.delayDescription})`
    )
    .join('\n');

  const waTemplate = `🚨 *PERINGATAN KETERLAMBATAN PELAPORAN PROGRES (${delayItems.map((i) => i.hCode).join(', ')})*
--------------------------------------------------
*Kepada Yth:*
• *Nama:* ${recipientName}
• *Jabatan:* ${recipientTitle}
• *No. WhatsApp:* +62 ${whatsappInput}
• *Kontraktor:* ${project.contractorName}
• *Proyek:* ${project.name} (${project.code})
--------------------------------------------------
⚠️ *PEMBERITAHUAN SISTEM PMO:*
Berdasarkan audit pemantauan digital SitePulse, tercatat *${selectedDates.length} laporan harian* yang *BELUM DISERAHKAN* dan telah melewati toleransi waktu pelaporan:

📋 *Daftar Laporan yang Tertunda:*
${waDatesList}

📌 *Ketentuan Kontraktual:*
Sesuai Bagian 4.2 Syarat-Syarat Kontrak, keterlambatan laporan harian melebihi H+2 akan dicatat dalam evaluasi kinerja berkala kontraktor dan dapat diterbitkan Surat Peringatan (SP) Non-Conformance.

Mohon segera melengkapi dan mengirimkan laporan tersebut melalui aplikasi SitePulse.

🔗 *Akses Aplikasi SitePulse:*
https://sitepulse.infrastructure.gov/project/${project.code}

Terima kasih atas kerja samanya.
*PMO Lead Supervising Team*`;

  // Dynamic Email text
  const emailDatesList = delayItems
    .map(
      (item, idx) =>
        `${idx + 1}. Tanggal ${item.dateStr} (${item.dayOfWeek}): Status Keterlambatan ${item.hCode} (${item.delayDescription})`
    )
    .join('\n');

  const emailSubject = `[URGENT] Teguran Keterlambatan Pelaporan Harian (${delayItems.map((i) => i.hCode).join(', ')}) - Proyek ${project.code}`;
  const emailTemplate = `REF: PMO/${project.code}/NOTIF-DELAY/${new Date().toISOString().split('T')[0].replace(/-/g, '')}
PERIHAL: Teguran Resmi Keterlambatan Pelaporan Progres Harian (${selectedDates.length} Hari Laporan Tertunda)

Kepada Yth,
${recipientName}
${recipientTitle}
${project.contractorName}

Di Tempat,

Dengan hormat,

Sehubungan dengan pemantauan kepatuhan pelaporan fisik harian pada sistem pengawasan SitePulse, kami menginformasikan bahwa Laporan Progres Harian untuk pekerjaan fisik pada proyek:

• Nama Proyek  : ${project.name}
• Kode Kontrak : ${project.code}
• Kontraktor   : ${project.contractorName}

Tercatat BELUM DISERAHKAN untuk tanggal-tanggal berikut:

${emailDatesList}

Mengingat pentingnya data harian (tenaga kerja, alat berat, material, serta pencatatan klaim cuaca/EOT) sebagai syarat mutlak verifikasi sertifikat pembayaran bulanan (MC), kami meminta Saudara untuk segera menyelesaikan dan mengunggah laporan harian tersebut selambat-lambatnya hari ini.

Demikian surat pemberitahuan ini disampaikan untuk menjadi perhatian dan segera ditindaklanjuti.

Hormat kami,
${project.pmoLead}
PMO Resident Engineer
Proyek ${project.name}`;

  const currentMessage = selectedChannel === 'whatsapp' ? waTemplate : emailTemplate;

  const handleCopyText = () => {
    navigator.clipboard.writeText(currentMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSend = () => {
    const cleanDigits = whatsappInput.replace(/\D/g, '');
    const fullWaNumber = `+62 ${whatsappInput}`;

    const alert: EscalationAlert = {
      id: `esc-${Date.now()}`,
      projectId: project.id,
      reportDate: selectedDates.join(', '),
      daysOverdue: delayItems[0]?.diffDays || 2,
      recipientName,
      recipientTitle,
      whatsappNumber: fullWaNumber,
      emailAddress,
      channel: selectedChannel,
      subject: emailSubject,
      message: currentMessage,
      sentAt: new Date().toLocaleString('id-ID'),
    };

    onSendEscalation(alert);
    setSuccessToast(`Peringatan untuk tanggal [${selectedDates.join(', ')}] berhasil diproses via ${selectedChannel.toUpperCase()}!`);
    setTimeout(() => setSuccessToast(''), 4000);

    if (selectedChannel === 'whatsapp') {
      const encodedMsg = encodeURIComponent(waTemplate);
      window.open(`https://api.whatsapp.com/send?phone=62${cleanDigits}&text=${encodedMsg}`, '_blank');
    } else {
      const encodedSub = encodeURIComponent(emailSubject);
      const encodedBody = encodeURIComponent(emailTemplate);
      window.open(`mailto:${emailAddress}?subject=${encodedSub}&body=${encodedBody}`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
              currentRole === 'contractor' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
            }`}>
              {currentRole === 'contractor' ? '⏰' : '!'}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {currentRole === 'contractor'
                  ? 'Pengingat Laporan Harian'
                  : 'Peringatan Keterlambatan Pelaporan (Multi-Tanggal)'}
              </h3>
              <p className="text-xs text-slate-500">
                {currentRole === 'contractor'
                  ? 'Daftar tanggal laporan harian yang belum diisi atau dikirimkan ke PMO beserta batas waktu cut-off.'
                  : 'Pilih tanggal-tanggal laporan yang ingin diingatkan beserta perhitungan otomatis H+ keterlambatannya.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pengingat Laporan Harian untuk Kontraktor (Dipindahkan ke Sini) */}
        {currentRole === 'contractor' && (
          <div className="bg-blue-50/90 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-blue-900 shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
              ⏰
            </div>
            <div className="space-y-0.5">
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <span>Pengingat Pengisian & Pengiriman Laporan Harian</span>
                <span className="text-[10px] font-mono px-2 py-0.2 bg-blue-100 text-blue-800 rounded-full font-bold">
                  Batas Pengiriman H+1 Jam 09:00 WIB
                </span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Laporan harian yang belum diserahkan ke PMO akan terhitung keterlambatan (H+). Harap lengkapi seluruh absensi tenaga kerja, peralatan, cuaca 24 jam, dan foto dokumentasi lapangan, kemudian klik tombol <strong>"Kirim ke PMO"</strong> sebelum batas waktu cut-off agar laporan tidak terhitung terlambat.
              </p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successToast && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* FITUR BARU: MULTI-TANGGAL SELECTOR DENGAN PERHITUNGAN H+ */}
        <div className="p-4 bg-red-50/70 border border-red-200 rounded-lg space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-red-950">
              <Calendar className="w-4 h-4 text-red-600" />
              <span>Pilih Tanggal Laporan yang Akan Diingatkan:</span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="text-[11px] font-semibold text-red-700 hover:text-red-900 bg-white hover:bg-red-50 border border-red-300 px-2.5 py-0.5 rounded transition-colors shadow-2xs"
                title="Pilih semua atau batalkan pilihan tanggal"
              >
                {selectedDates.length === candidateDates.length ? 'Batal Pilih Semua' : `Pilih Semua (${candidateDates.length} Tanggal)`}
              </button>
              <span className="text-[11px] font-semibold text-red-800 bg-red-100 px-2 py-0.5 rounded">
                {selectedDates.length} Tanggal Dipilih
              </span>
            </div>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {candidateDates.length === 0 ? (
              <div className="p-3 rounded border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Tidak ada tanggal laporan yang terlambat pada kalender aktif saat ini.</span>
              </div>
            ) : (
              candidateDates.map((dateStr) => {
                const info = getDelayInfo(dateStr);
                const isChecked = selectedDates.includes(dateStr);

                return (
                  <label
                    key={dateStr}
                    className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors text-xs ${
                      isChecked
                        ? 'bg-white border-red-300 font-semibold text-slate-900 shadow-xs'
                        : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleDateSelection(dateStr)}
                        className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-4 h-4"
                      />
                      <span>
                        {dateStr} ({info.dayOfWeek})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded font-bold ${
                          info.diffDays >= 3
                            ? 'bg-red-200 text-red-900'
                            : info.diffDays >= 2
                            ? 'bg-amber-200 text-amber-900'
                            : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        {info.hCode}
                      </span>
                      <span className="text-[10px] text-slate-500 font-sans">
                        ({info.delayDescription})
                      </span>
                      {onSelectDate && currentRole === 'contractor' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onSelectDate(dateStr);
                            onClose();
                          }}
                          className="ml-2 px-2.5 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-sans text-[10px] font-bold shadow-xs transition-colors"
                        >
                          Isi Laporan →
                        </button>
                      )}
                    </div>
                  </label>
                );
              })
            )}
          </div>

          {/* Add custom date if needed */}
          <div className="flex items-center gap-2 pt-1 border-t border-red-200/60 text-xs">
            <span className="text-slate-600 text-[11px] font-medium shrink-0">
              Tambah Tanggal Lain:
            </span>
            <input
              type="date"
              value={customAddDate}
              onChange={(e) => setCustomAddDate(e.target.value)}
              className="text-xs px-2.5 py-1 border border-slate-300 rounded bg-white w-40 font-mono"
            />
            <button
              type="button"
              onClick={handleAddCustomDate}
              disabled={!customAddDate}
              className="px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded disabled:opacity-50 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </button>
          </div>
        </div>

        {/* TAMPILAN KHUSUS KONTRAKTOR: PENGINGAT LAPORAN HARIAN & KETERLAMBATAN */}
        {currentRole === 'contractor' ? (
          <div className="space-y-4">
            {/* Actionable Steps Guide for Contractor */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>📋 Checklist Kelengkapan Laporan Harian:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px]">1</span>
                  <span>Absensi Tenaga Kerja & Alat Berat</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px]">2</span>
                  <span>Pencatatan Cuaca 24 Jam & Downtime</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px]">3</span>
                  <span>Pekerjaan (BOQ) & Material (BOM) Excel Cell</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px]">4</span>
                  <span>Dokumentasi Foto Lapangan</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions for Contractor */}
            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Tutup Pengingat
              </button>
            </div>
          </div>
        ) : (
          /* TAMPILAN KHUSUS PMO: FORM PENGIRIMAN PERINGATAN ESKALASI */
          <>
            {/* Form Input Terpisah: Nama, Jabatan, Nomor WA, Alamat Email */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Data Penerima Notifikasi (Terpisah & Rapi)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Penerima
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Contoh: Ir. Budi Santoso, MT"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jabatan Penerima
                  </label>
                  <input
                    type="text"
                    value={recipientTitle}
                    onChange={(e) => setRecipientTitle(e.target.value)}
                    placeholder="Contoh: Project Manager Kontraktor"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor WhatsApp (Format Baku)
                  </label>
                  <div className="flex items-center rounded-lg border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 overflow-hidden shadow-2xs">
                    {/* Fixed Locked +62 Prefix */}
                    <div className="bg-slate-100 border-r border-slate-300 text-slate-700 px-3 py-2 text-xs font-mono font-bold select-none flex items-center gap-1.5 shrink-0">
                      <span className="text-sm">🇮🇩</span>
                      <span>+62</span>
                    </div>
                    <input
                      type="tel"
                      value={whatsappInput}
                      onChange={(e) => setWhatsappInput(formatWaNumber(e.target.value))}
                      placeholder="812-3456-7899"
                      maxLength={15}
                      className="w-full text-xs px-3 py-2 bg-transparent font-mono font-semibold text-slate-900 focus:outline-none placeholder:text-slate-400"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Ketik mulai angka <strong>8</strong> (contoh: <code>81234567899</code> otomatis menjadi <code>812-3456-7899</code>).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alamat Email
                  </label>
                  <input
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="Contoh: pm.kontraktor@proyek.id"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded bg-white font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Channel Switcher */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Pilih Format Template Pengiriman
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedChannel('whatsapp')}
                  className={`p-3 rounded-lg border text-left flex items-center gap-3 transition-all ${
                    selectedChannel === 'whatsapp'
                      ? 'border-emerald-500 bg-emerald-50/60 font-semibold text-slate-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Smartphone className="w-5 h-5 text-emerald-600" />
                  <div>
                    <div className="text-xs">Template Pesan WhatsApp</div>
                    <div className="text-[11px] text-slate-500">Menyertakan rincian {selectedDates.length} tanggal & H+ keterlambatan</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedChannel('email')}
                  className={`p-3 rounded-lg border text-left flex items-center gap-3 transition-all ${
                    selectedChannel === 'email'
                      ? 'border-blue-500 bg-blue-50/60 font-semibold text-slate-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Mail className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-xs">Template Surat Resmi Email</div>
                    <div className="text-[11px] text-slate-500">Format formal korespondensi kontraktual</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Message Preview Box with Copy button */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  Preview Template Pesan (Otomatis Memuat {selectedDates.length} Tanggal & Keterangan H+):
                </span>
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-semibold"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin Template'}</span>
                </button>
              </div>

              <div className="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {currentMessage}
              </div>
            </div>

            {/* Bottom Actions for PMO */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded"
              >
                Tutup
              </button>

              <button
                type="button"
                disabled={selectedDates.length === 0}
                onClick={handleSend}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors shadow-xs disabled:opacity-50 ${
                  selectedChannel === 'whatsapp'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {selectedChannel === 'whatsapp' ? 'Buka WhatsApp & Kirim Pesan' : 'Buka Email & Kirim Surat'}
                </span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}

        {/* Escalation Log History */}
        {escalationLog.length > 0 && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Riwayat Pengiriman Peringatan ({escalationLog.length})
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {escalationLog.map((esc) => (
                <div key={esc.id} className="p-2 bg-slate-50 border border-slate-200 rounded text-xs flex items-center justify-between">
                  <div className="space-x-2">
                    <span className="font-bold text-slate-800">[{esc.channel.toUpperCase()}]</span>
                    <span>{esc.recipientName} ({esc.recipientTitle})</span>
                    <span className="text-slate-400 font-mono">· {esc.reportDate}</span>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">{esc.sentAt}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
