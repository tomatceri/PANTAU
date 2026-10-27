import jsPDF from 'jspdf';
import { DailyReport, Project, WeeklyReport, MonthlyReport } from '../types';
import { HOURS_24 } from './formDefaults';

interface PreloadedPdfPhoto {
  dataUrl: string;
  format: 'JPEG' | 'PNG';
  width: number;
  height: number;
  caption: string;
}

/**
 * Robust helper to load image data URL with natural dimensions for jsPDF.addImage
 */
async function preloadPhotoForPdf(url: string, caption: string): Promise<PreloadedPdfPhoto | null> {
  if (!url) return null;

  return new Promise((resolve) => {
    // If it's already a Data URL
    if (url.startsWith('data:image/')) {
      const isPng = url.startsWith('data:image/png');
      const img = new Image();
      img.onload = () => {
        resolve({
          dataUrl: url,
          format: isPng ? 'PNG' : 'JPEG',
          width: img.naturalWidth || img.width || 800,
          height: img.naturalHeight || img.height || 600,
          caption,
        });
      };
      img.onerror = () => {
        resolve({
          dataUrl: url,
          format: isPng ? 'PNG' : 'JPEG',
          width: 800,
          height: 600,
          caption,
        });
      };
      img.src = url;
      return;
    }

    // If it's a URL or local asset path
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve({
          dataUrl,
          format: 'JPEG',
          width: canvas.width,
          height: canvas.height,
          caption,
        });
      } catch (err) {
        console.warn('Canvas toDataURL failed in preloadPhotoForPdf:', err);
        resolve(null);
      }
    };
    img.onerror = (err) => {
      console.warn('Failed to load image for PDF:', url, err);
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Generates an official standardized printable PDF for a Daily Report matching form AAA/CONS/FM-014 Rev01
 * Now directly embeds clean site photos without watermarks or GPS text overlays.
 */
export async function exportDailyReportPdf(report: DailyReport, project: Project): Promise<void> {
  // Preload all attached site photos
  const loadedPhotos: PreloadedPdfPhoto[] = [];
  if (report.photos && report.photos.length > 0) {
    for (const p of report.photos) {
      if (p.url) {
        try {
          const preloaded = await preloadPhotoForPdf(p.url, p.caption || '');
          if (preloaded) {
            loadedPhotos.push(preloaded);
          }
        } catch (e) {
          console.warn('Failed to preload photo:', e);
        }
      }
    }
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const leftX = 10;
  const tableWidth = 190;
  const rightX = leftX + tableWidth;

  // Helper formatting Indonesian date
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

  // Outer document border
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(leftX, 10, tableWidth, 275);

  let y = 10;

  // 1. TOP HEADER BOX
  doc.rect(leftX, y, tableWidth, 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('LAPORAN HARIAN', leftX + tableWidth / 2, y + 5.2, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('DAILY ACTIVITY REPORT', leftX + tableWidth / 2, y + 9.5, { align: 'center' });

  // Right side: No. Form & Tgl. Berlaku
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text('No. Form :', rightX - 60, y + 5.0);
  doc.setFont('helvetica', 'normal');
  doc.text(report.docCode || 'AAA/CONS/FM-014 Rev01', rightX - 38, y + 5.0);

  doc.setFont('helvetica', 'bold');
  doc.text('Tgl. Berlaku :', rightX - 60, y + 9.2);
  doc.setFont('helvetica', 'normal');
  doc.text(report.docEffectiveDate || '14 Juli 2025', rightX - 38, y + 9.2);

  y += 12;

  // Blank row separator with top/bottom lines
  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(0, 0, 0);
  doc.rect(leftX, y, tableWidth, 1.5, 'FD');
  y += 1.5;

  // 2. METADATA TABLE (Uniform & Symmetric Grid)
  const metaRowH = 4.5;
  const colLblW = 34;
  const colValFullW = tableWidth - colLblW; // 156mm
  const companyName = report.contractorSignatory?.companyName || project.contractorName || 'PT. BESTINDO PUTRA MANDIRI';

  // Row 1: PR/ PO ID & Tanggal Pelaksanaan
  doc.rect(leftX, y, colLblW, metaRowH);
  doc.rect(leftX + colLblW, y, 62, metaRowH);
  doc.rect(leftX + colLblW + 62, y, 40, metaRowH);
  doc.rect(leftX + colLblW + 102, y, tableWidth - (colLblW + 102), metaRowH);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('PR/ PO ID :', leftX + 1.5, y + 3.2);
  doc.setFont('helvetica', 'normal');
  doc.text(report.nomorBpmpo || report.reportNumber || 'TKCMPO - 2505010', leftX + colLblW + 2, y + 3.2);

  doc.setFont('helvetica', 'bold');
  doc.text('Tanggal Pelaksanaan :', leftX + colLblW + 63.5, y + 3.2);
  doc.setFont('helvetica', 'normal');
  doc.text(formatIndoDate(report.reportDate), leftX + colLblW + 104, y + 3.2);

  y += metaRowH;

  // Row 2: Jenis Pekerjaan
  doc.rect(leftX, y, colLblW, metaRowH);
  doc.rect(leftX + colLblW, y, colValFullW, metaRowH);
  doc.setFont('helvetica', 'bold');
  doc.text('Jenis Pekerjaan :', leftX + 1.5, y + 3.2);
  doc.setFont('helvetica', 'normal');
  doc.text((project.name || 'Renewal Tube Settler').substring(0, 80), leftX + colLblW + 2, y + 3.2);

  y += metaRowH;

  // Row 3: Lokasi Proyek
  doc.rect(leftX, y, colLblW, metaRowH);
  doc.rect(leftX + colLblW, y, colValFullW, metaRowH);
  doc.setFont('helvetica', 'bold');
  doc.text('Lokasi Proyek :', leftX + 1.5, y + 3.2);
  doc.setFont('helvetica', 'normal');
  doc.text((project.location || 'PT. TIRTA KENCANA CAHAYA MANDIRI').substring(0, 80), leftX + colLblW + 2, y + 3.2);

  y += metaRowH;

  // Row 4: Kontraktor
  doc.rect(leftX, y, colLblW, metaRowH);
  doc.rect(leftX + colLblW, y, colValFullW, metaRowH);
  doc.setFont('helvetica', 'bold');
  doc.text('Kontraktor :', leftX + 1.5, y + 3.2);
  doc.setFont('helvetica', 'normal');
  doc.text(companyName.substring(0, 80), leftX + colLblW + 2, y + 3.2);

  y += metaRowH;

  // 3. CATATAN & ATTENDEE BAR (Matching Reference Image)
  const notesW = 70;
  const attW = tableWidth - notesW; // 120mm
  const notesH = 13.5;

  // Left side: Catatan box
  doc.rect(leftX, y, notesW, notesH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('Catatan :', leftX + 2, y + 3.5);
  doc.line(leftX + 2, y + 4, leftX + 14, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  const notesContent = report.notes || report.generalNotes || report.weather?.delayReason || 'Pekerjaan dilaksanakan sesuai dengan jadwal dan instruksi pengawas lapangan.';
  const splitNotes = doc.splitTextToSize(notesContent, notesW - 4);
  doc.text(splitNotes.slice(0, 3), leftX + 2, y + 7.5);

  // Right side: Attendees Table (NAMA, JABATAN / INSTANSI, TANDA TANGAN)
  doc.setFillColor(245, 245, 245);
  doc.rect(leftX + notesW, y, 44, 4.5, 'FD');
  doc.rect(leftX + notesW + 44, y, 44, 4.5, 'FD');
  doc.rect(leftX + notesW + 88, y, 32, 4.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text('NAMA', leftX + notesW + 22, y + 3.2, { align: 'center' });
  doc.text('JABATAN / INSTANSI', leftX + notesW + 44 + 22, y + 3.2, { align: 'center' });
  doc.text('TANDA TANGAN', leftX + notesW + 88 + 16, y + 3.2, { align: 'center' });

  const attendeeList = report.attendees && report.attendees.length > 0 ? report.attendees : [
    { id: '1', nama: 'Adhe Juliawaludin', jabatan: 'Supervisor', instansi: '' },
    { id: '2', nama: 'Anis Sulfuad', jabatan: 'HSE', instansi: '' },
  ];

  const attRowH = 4.5;
  for (let aIdx = 0; aIdx < 2; aIdx++) {
    const curAttY = y + 4.5 + aIdx * attRowH;
    const att = attendeeList[aIdx];
    doc.rect(leftX + notesW, curAttY, 44, attRowH);
    doc.rect(leftX + notesW + 44, curAttY, 44, attRowH);
    doc.rect(leftX + notesW + 88, curAttY, 32, attRowH);

    if (att) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.text(att.nama, leftX + notesW + 2, curAttY + 3.2);
      doc.text(`${att.jabatan} ${att.instansi ? `(${att.instansi})` : ''}`, leftX + notesW + 44 + 22, curAttY + 3.2, { align: 'center' });
      // TANDA TANGAN column is empty for physical signature
    }
  }

  y += notesH;

  // 4. COMBINED RESOURCE & WEATHER SECTION
  // Widths: Tenaga Kerja = 50, Peralatan = 82, Cuaca = 58
  const tkW = 50;
  const eqW = 82;
  const cwW = 58;
  const tkX = leftX;
  const eqX = tkX + tkW;
  const cwX = eqX + eqW;

  // Header row
  doc.setFillColor(245, 245, 245);
  doc.rect(tkX, y, 6, 4.5, 'FD');
  doc.rect(tkX + 6, y, 34, 4.5, 'FD');
  doc.rect(tkX + 40, y, 10, 4.5, 'FD');

  doc.rect(eqX, y, 42, 4.5, 'FD');
  doc.rect(eqX + 42, y, 11, 4.5, 'FD');
  doc.rect(eqX + 53, y, 14, 4.5, 'FD');
  doc.rect(eqX + 67, y, 15, 4.5, 'FD');

  doc.rect(cwX, y, 22, 4.5, 'FD');
  doc.rect(cwX + 22, y, 22, 4.5, 'FD');
  doc.rect(cwX + 44, y, 14, 4.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('No', tkX + 3, y + 3.2, { align: 'center' });
  doc.text('Tenaga Kerja', tkX + 23, y + 3.2, { align: 'center' });
  doc.text('Orang', tkX + 45, y + 3.2, { align: 'center' });

  doc.text('Peralatan', eqX + 21, y + 3.2, { align: 'center' });
  doc.text('Jumlah', eqX + 47.5, y + 3.2, { align: 'center' });
  doc.text('Stok', eqX + 60, y + 3.2, { align: 'center' });
  doc.text('Keterangan', eqX + 74.5, y + 3.2, { align: 'center' });

  doc.text('Cuaca', cwX + 11, y + 3.2, { align: 'center' });
  doc.text('Cuaca', cwX + 33, y + 3.2, { align: 'center' });
  doc.text('Ket', cwX + 51, y + 3.2, { align: 'center' });

  y += 4.5;

  // 12 rows of combined data
  const rowH = 3.8;
  const morningHours = HOURS_24.slice(0, 12);
  const afternoonHours = HOURS_24.slice(12, 24);
  const hourlyWeather = report.hourlyWeather || {};
  const manpower = report.manpower || [];
  const equipment = report.equipment || [];

  for (let i = 0; i < 12; i++) {
    const curY = y + i * rowH;

    // Tenaga Kerja
    doc.rect(tkX, curY, 6, rowH);
    doc.rect(tkX + 6, curY, 34, rowH);
    doc.rect(tkX + 40, curY, 10, rowH);
    const mp = manpower[i];
    if (mp) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.text(String(i + 1), tkX + 3, curY + 2.7, { align: 'center' });
      doc.text(mp.trade.substring(0, 22), tkX + 7.5, curY + 2.7);
      doc.text(String(mp.count), tkX + 45, curY + 2.7, { align: 'center' });
    }

    // Peralatan
    doc.rect(eqX, curY, 42, rowH);
    doc.rect(eqX + 42, curY, 11, rowH);
    doc.rect(eqX + 53, curY, 14, rowH);
    doc.rect(eqX + 67, curY, 15, rowH);
    const eq = equipment[i];
    if (eq) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.text(eq.equipmentName.substring(0, 26), eqX + 1.5, curY + 2.7);
      doc.text(String(eq.count), eqX + 47.5, curY + 2.7, { align: 'center' });
      const eqStatusText = !eq.status ? '-' : eq.status === 'Operating' ? 'Operasi' : eq.status === 'Standby' ? 'Standby' : eq.status === 'Breakdown' ? 'Breakdown' : eq.status;
      doc.text(eqStatusText.substring(0, 10), eqX + 68, curY + 2.7);
    }

    // Cuaca (Morning & Afternoon)
    doc.rect(cwX, curY, 13, rowH);
    doc.rect(cwX + 13, curY, 9, rowH);
    doc.rect(cwX + 22, curY, 13, rowH);
    doc.rect(cwX + 35, curY, 9, rowH);

    const mH = morningHours[i];
    const aH = afternoonHours[i];
    const mC = hourlyWeather[mH] || 'C';
    const aC = hourlyWeather[aH] || 'C';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.text(mH, cwX + 1.5, curY + 2.7);
    doc.setFont('helvetica', 'bold');
    doc.text(mC, cwX + 17.5, curY + 2.7, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.text(aH, cwX + 23.5, curY + 2.7);
    doc.setFont('helvetica', 'bold');
    doc.text(aC, cwX + 39.5, curY + 2.7, { align: 'center' });
  }

  // Draw legend box on the right side of Cuaca
  doc.rect(cwX + 44, y, 14, rowH * 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.text('C = Cerah', cwX + 45, y + 6);
  doc.text('M = Mendung', cwX + 45, y + 15);
  doc.text('G = Gerimis', cwX + 45, y + 24);
  doc.text('H = Hujan', cwX + 45, y + 33);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.text(`DT: ${report.weather?.downtimeHours || 0} Jam`, cwX + 45, y + 42);

  y += rowH * 12;

  // 5. JENIS PEKERJAAN (BOQ) - 2 COLUMNS
  doc.setFillColor(240, 240, 240);
  doc.setDrawColor(0, 0, 0);
  doc.rect(leftX, y, tableWidth, 4.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text('Jenis Pekerjaan (BOQ)', leftX + tableWidth / 2, y + 3.2, { align: 'center' });

  y += 4.5;

  const halfTableW = tableWidth / 2; // 95mm
  // Subheaders for BOQ
  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(0, 0, 0);
  doc.rect(leftX, y, 11, 4, 'FD');
  doc.rect(leftX + 11, y, 59, 4, 'FD');
  doc.rect(leftX + 70, y, 12, 4, 'FD');
  doc.rect(leftX + 82, y, 13, 4, 'FD');

  doc.rect(leftX + halfTableW, y, 11, 4, 'FD');
  doc.rect(leftX + halfTableW + 11, y, 59, 4, 'FD');
  doc.rect(leftX + halfTableW + 70, y, 12, 4, 'FD');
  doc.rect(leftX + halfTableW + 82, y, 13, 4, 'FD');

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('Kode', leftX + 5.5, y + 2.8, { align: 'center' });
  doc.text('Deskripsi pekerjaan', leftX + 13, y + 2.8);
  doc.text('Satuan', leftX + 76, y + 2.8, { align: 'center' });
  doc.text('Install', leftX + 88.5, y + 2.8, { align: 'center' });

  doc.text('Kode', leftX + halfTableW + 5.5, y + 2.8, { align: 'center' });
  doc.text('Deskripsi pekerjaan', leftX + halfTableW + 13, y + 2.8);
  doc.text('Satuan', leftX + halfTableW + 76, y + 2.8, { align: 'center' });
  doc.text('Install', leftX + halfTableW + 88.5, y + 2.8, { align: 'center' });

  y += 4;

  const boqItems = report.boqItems || [];
  const boqHalf = Math.max(8, Math.ceil(boqItems.length / 2));
  const leftBoq = boqItems.slice(0, boqHalf);
  const rightBoq = boqItems.slice(boqHalf);
  const boqRowH = 3.8;
  const numBoqRows = Math.max(7, Math.max(leftBoq.length, rightBoq.length));

  for (let i = 0; i < numBoqRows; i++) {
    const curY = y + i * boqRowH;
    doc.setDrawColor(0, 0, 0);
    // Left BOQ item
    doc.rect(leftX, curY, 11, boqRowH);
    doc.rect(leftX + 11, curY, 59, boqRowH);
    doc.rect(leftX + 70, curY, 12, boqRowH);
    doc.rect(leftX + 82, curY, 13, boqRowH);

    const lItem = leftBoq[i];
    if (lItem) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(0, 0, 0);
      doc.text(lItem.kode, leftX + 5.5, curY + 2.7, { align: 'center' });
      doc.text(lItem.deskripsi.substring(0, 42), leftX + 12.5, curY + 2.7);
      doc.text(lItem.satuan, leftX + 76, curY + 2.7, { align: 'center' });
      doc.text(String(lItem.install), leftX + 88.5, curY + 2.7, { align: 'center' });
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(180, 180, 180);
      doc.text('-', leftX + 5.5, curY + 2.7, { align: 'center' });
      doc.text('-', leftX + 12.5, curY + 2.7);
      doc.text('-', leftX + 76, curY + 2.7, { align: 'center' });
      doc.text('-', leftX + 88.5, curY + 2.7, { align: 'center' });
    }

    // Right BOQ item
    doc.rect(leftX + halfTableW, curY, 11, boqRowH);
    doc.rect(leftX + halfTableW + 11, curY, 59, boqRowH);
    doc.rect(leftX + halfTableW + 70, curY, 12, boqRowH);
    doc.rect(leftX + halfTableW + 82, curY, 13, boqRowH);

    const rItem = rightBoq[i];
    if (rItem) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(0, 0, 0);
      doc.text(rItem.kode, leftX + halfTableW + 5.5, curY + 2.7, { align: 'center' });
      doc.text(rItem.deskripsi.substring(0, 42), leftX + halfTableW + 12.5, curY + 2.7);
      doc.text(rItem.satuan, leftX + halfTableW + 76, curY + 2.7, { align: 'center' });
      doc.text(String(rItem.install), leftX + halfTableW + 88.5, curY + 2.7, { align: 'center' });
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(180, 180, 180);
      doc.text('-', leftX + halfTableW + 5.5, curY + 2.7, { align: 'center' });
      doc.text('-', leftX + halfTableW + 12.5, curY + 2.7);
      doc.text('-', leftX + halfTableW + 76, curY + 2.7, { align: 'center' });
      doc.text('-', leftX + halfTableW + 88.5, curY + 2.7, { align: 'center' });
    }
  }

  y += numBoqRows * boqRowH;

  // 6. JENIS MATERIAL (BOM) - 2 COLUMNS
  doc.setFillColor(240, 240, 240);
  doc.setDrawColor(0, 0, 0);
  doc.rect(leftX, y, tableWidth, 4.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text('Jenis Material (BOM)', leftX + tableWidth / 2, y + 3.2, { align: 'center' });

  y += 4.5;

  // Subheaders for BOM
  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(0, 0, 0);
  doc.rect(leftX, y, 11, 4, 'FD');
  doc.rect(leftX + 11, y, 59, 4, 'FD');
  doc.rect(leftX + 70, y, 12, 4, 'FD');
  doc.rect(leftX + 82, y, 13, 4, 'FD');

  doc.rect(leftX + halfTableW, y, 11, 4, 'FD');
  doc.rect(leftX + halfTableW + 11, y, 59, 4, 'FD');
  doc.rect(leftX + halfTableW + 70, y, 12, 4, 'FD');
  doc.rect(leftX + halfTableW + 82, y, 13, 4, 'FD');

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('Kode', leftX + 5.5, y + 2.8, { align: 'center' });
  doc.text('Jenis Material', leftX + 13, y + 2.8);
  doc.text('Satuan', leftX + 76, y + 2.8, { align: 'center' });
  doc.text('Install', leftX + 88.5, y + 2.8, { align: 'center' });

  doc.text('Kode', leftX + halfTableW + 5.5, y + 2.8, { align: 'center' });
  doc.text('Jenis Material', leftX + halfTableW + 13, y + 2.8);
  doc.text('Satuan', leftX + halfTableW + 76, y + 2.8, { align: 'center' });
  doc.text('Install', leftX + halfTableW + 88.5, y + 2.8, { align: 'center' });

  y += 4;

  const bomItems = report.bomItems || [];
  const bomHalf = Math.max(4, Math.ceil(bomItems.length / 2));
  const leftBom = bomItems.slice(0, bomHalf);
  const rightBom = bomItems.slice(bomHalf);
  const bomRowH = 3.8;
  const numBomRows = Math.max(4, Math.max(leftBom.length, rightBom.length));

  for (let i = 0; i < numBomRows; i++) {
    const curY = y + i * bomRowH;
    doc.setDrawColor(0, 0, 0);
    // Left BOM
    doc.rect(leftX, curY, 11, bomRowH);
    doc.rect(leftX + 11, curY, 59, bomRowH);
    doc.rect(leftX + 70, curY, 12, bomRowH);
    doc.rect(leftX + 82, curY, 13, bomRowH);

    const lItem = leftBom[i];
    if (lItem) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(0, 0, 0);
      doc.text(lItem.kode, leftX + 5.5, curY + 2.7, { align: 'center' });
      doc.text(lItem.jenisMaterial.substring(0, 42), leftX + 12.5, curY + 2.7);
      doc.text(lItem.satuan, leftX + 76, curY + 2.7, { align: 'center' });
      doc.text(String(lItem.install), leftX + 88.5, curY + 2.7, { align: 'center' });
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(180, 180, 180);
      doc.text('-', leftX + 5.5, curY + 2.7, { align: 'center' });
      doc.text('-', leftX + 12.5, curY + 2.7);
      doc.text('-', leftX + 76, curY + 2.7, { align: 'center' });
      doc.text('-', leftX + 88.5, curY + 2.7, { align: 'center' });
    }

    // Right BOM
    doc.rect(leftX + halfTableW, curY, 11, bomRowH);
    doc.rect(leftX + halfTableW + 11, curY, 59, bomRowH);
    doc.rect(leftX + halfTableW + 70, curY, 12, bomRowH);
    doc.rect(leftX + halfTableW + 82, curY, 13, bomRowH);

    const rItem = rightBom[i];
    if (rItem) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(0, 0, 0);
      doc.text(rItem.kode, leftX + halfTableW + 5.5, curY + 2.7, { align: 'center' });
      doc.text(rItem.jenisMaterial.substring(0, 42), leftX + halfTableW + 12.5, curY + 2.7);
      doc.text(rItem.satuan, leftX + halfTableW + 76, curY + 2.7, { align: 'center' });
      doc.text(String(rItem.install), leftX + halfTableW + 88.5, curY + 2.7, { align: 'center' });
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(180, 180, 180);
      doc.text('-', leftX + halfTableW + 5.5, curY + 2.7, { align: 'center' });
      doc.text('-', leftX + halfTableW + 12.5, curY + 2.7);
      doc.text('-', leftX + halfTableW + 76, curY + 2.7, { align: 'center' });
      doc.text('-', leftX + halfTableW + 88.5, curY + 2.7, { align: 'center' });
    }
  }

  y += numBomRows * bomRowH;

  // 7. LAMPIRAN DOKUMENTASI FOTO LAPANGAN (Positioned BEFORE Mengetahui / Menyetujui)
  doc.setFillColor(240, 240, 240);
  doc.setDrawColor(0, 0, 0);
  doc.rect(leftX, y, tableWidth, 4.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text('Lampiran Dokumentasi Foto Lapangan', leftX + tableWidth / 2, y + 3.2, { align: 'center' });

  y += 4.5;

  const page1Photos = loadedPhotos.slice(0, 3);
  if (page1Photos.length > 0) {
    const photoBoxH = 36;
    const numP = page1Photos.length;
    const gap = 3;
    const cardW = (tableWidth - (numP - 1) * gap) / numP;

    for (let pIdx = 0; pIdx < numP; pIdx++) {
      const p = page1Photos[pIdx];
      const cardX = leftX + pIdx * (cardW + gap);

      // Card border & background
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(252, 252, 252);
      doc.rect(cardX, y, cardW, photoBoxH, 'FD');

      // Photo image container inside card
      const imgPad = 1.5;
      const imgMaxW = cardW - imgPad * 2;
      const imgMaxH = photoBoxH - 7; // leaves 7mm for caption

      let drawW = imgMaxW;
      let drawH = imgMaxH;
      if (p.width && p.height && p.width > 0 && p.height > 0) {
        const aspect = p.width / p.height;
        const boxAspect = imgMaxW / imgMaxH;
        if (aspect > boxAspect) {
          drawW = imgMaxW;
          drawH = imgMaxW / aspect;
        } else {
          drawH = imgMaxH;
          drawW = imgMaxH * aspect;
        }
      }

      const drawX = cardX + imgPad + (imgMaxW - drawW) / 2;
      const drawY = y + imgPad + (imgMaxH - drawH) / 2;

      // Draw the actual photo directly into the PDF
      try {
        doc.addImage(p.dataUrl, p.format, drawX, drawY, drawW, drawH, undefined, 'FAST');
      } catch (err) {
        console.warn('Failed to embed image in PDF:', err);
      }

      // Clean caption underneath photo (no watermark, GPS, or timestamp overlays)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(30, 41, 59);
      const capText = p.caption || `Foto #${pIdx + 1}`;
      const splitCap = doc.splitTextToSize(capText, cardW - 3);
      doc.text(splitCap[0] || '', cardX + cardW / 2, y + photoBoxH - 2, { align: 'center' });
    }

    y += photoBoxH;
  } else {
    doc.setDrawColor(0, 0, 0);
    doc.rect(leftX, y, tableWidth, 9);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(5.5);
    doc.setTextColor(150, 150, 150);
    doc.text('Tidak ada lampiran foto dokumentasi untuk laporan ini.', leftX + tableWidth / 2, y + 5.5, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    y += 9;
  }

  // 8. MENGETAHUI / MENYETUJUI (3 COLUMNS)
  doc.setFillColor(240, 240, 240);
  doc.setDrawColor(0, 0, 0);
  doc.rect(leftX, y, tableWidth, 4.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text('Mengetahui/ Menyetujui', leftX + tableWidth / 2, y + 3.2, { align: 'center' });

  y += 4.5;

  const colSignW = tableWidth / 3; // ~63.33mm
  const signBoxH = 26;

  // Box 1: Kontraktor
  doc.setDrawColor(0, 0, 0);
  doc.rect(leftX, y, colSignW, signBoxH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Project Manager', leftX + colSignW / 2, y + 4, { align: 'center' });
  doc.text(report.contractorSignatory?.companyName || project.contractorName, leftX + colSignW / 2, y + 7.5, { align: 'center' });

  // Clean signing space without "[Tanda Tangan Basah Hardcopy]"
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text(report.contractorSignatory?.signedBy || 'Ir. Budi Santoso', leftX + colSignW / 2, y + 21, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(report.contractorSignatory?.title || 'Project Manager', leftX + colSignW / 2, y + 24.5, { align: 'center' });

  // Box 2: Konsultan Supervisi
  doc.rect(leftX + colSignW, y, colSignW, signBoxH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('Project Manager Konsultan,', leftX + colSignW + colSignW / 2, y + 4, { align: 'center' });
  doc.text(report.consultantSignatory?.companyName || 'PT KeylaAubreyRapli', leftX + colSignW + colSignW / 2, y + 7.5, { align: 'center' });

  // Clean signing space without "[Tanda Tangan Basah Hardcopy]"
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text(report.consultantSignatory?.signedBy || 'Hendra Wijaya, ST', leftX + colSignW + colSignW / 2, y + 21, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(report.consultantSignatory?.title || 'Team Leader', leftX + colSignW + colSignW / 2, y + 24.5, { align: 'center' });

  // Box 3: PMO / Owner
  doc.rect(leftX + colSignW * 2, y, colSignW, signBoxH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('Project Manager,', leftX + colSignW * 2 + colSignW / 2, y + 4, { align: 'center' });
  doc.text(report.pmoSignatory?.companyName || 'PT AubreyKeylaRapli', leftX + colSignW * 2 + colSignW / 2, y + 7.5, { align: 'center' });

  // Clean signing space for wet signature (TTD) without "[DISETUJUI PMO]" text

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text(report.pmoSignatory?.signedBy || project.pmoLead.split('(')[0].trim(), leftX + colSignW * 2 + colSignW / 2, y + 21, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(report.pmoSignatory?.title || 'Project Manager', leftX + colSignW * 2 + colSignW / 2, y + 24.5, { align: 'center' });

  // Footer text Page 1
  const hasExtraPhotos = loadedPhotos.length > 3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text(hasExtraPhotos ? 'Page 1 of 2' : 'Page 1', leftX + 2, 283);
  doc.text(report.docFooterCode || 'Daily Report-P2-ND000-JDU-09', rightX - 2, 283, { align: 'right' });

  // Page 2: Appendix for continuation photos if more than 3 photos are attached
  if (hasExtraPhotos) {
    const extraPhotos = loadedPhotos.slice(3);
    doc.addPage();
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(leftX, 10, tableWidth, 275);

    let p2Y = 10;
    // Header Page 2
    doc.rect(leftX, p2Y, tableWidth, 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('LAMPIRAN DOKUMENTASI FOTO LAPANGAN (LANJUTAN)', leftX + tableWidth / 2, p2Y + 5.2, { align: 'center' });
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${project.name} · Tanggal: ${formatIndoDate(report.reportDate)}`, leftX + tableWidth / 2, p2Y + 9.5, { align: 'center' });
    p2Y += 15;

    // Grid of extra photos (2 columns per row)
    const gridCols = 2;
    const gridCardW = (tableWidth - 6) / 2; // ~92mm
    const gridCardH = 60;

    for (let eIdx = 0; eIdx < extraPhotos.length; eIdx++) {
      if (eIdx > 0 && eIdx % 6 === 0) {
        doc.addPage();
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        doc.rect(leftX, 10, tableWidth, 275);
        p2Y = 15;
      }
      const col = eIdx % gridCols;
      const row = Math.floor((eIdx % 6) / gridCols);
      const eCardX = leftX + col * (gridCardW + 6);
      const eCardY = p2Y + row * (gridCardH + 4);

      const ep = extraPhotos[eIdx];
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(252, 252, 252);
      doc.rect(eCardX, eCardY, gridCardW, gridCardH, 'FD');

      const eImgPad = 2;
      const eImgMaxW = gridCardW - eImgPad * 2;
      const eImgMaxH = gridCardH - 9;

      let eDrawW = eImgMaxW;
      let eDrawH = eImgMaxH;
      if (ep.width && ep.height) {
        const aspect = ep.width / ep.height;
        if (aspect > eImgMaxW / eImgMaxH) {
          eDrawW = eImgMaxW;
          eDrawH = eImgMaxW / aspect;
        } else {
          eDrawH = eImgMaxH;
          eDrawW = eImgMaxH * aspect;
        }
      }

      const eDrawX = eCardX + eImgPad + (eImgMaxW - eDrawW) / 2;
      const eDrawY = eCardY + eImgPad + (eImgMaxH - eDrawH) / 2;

      try {
        doc.addImage(ep.dataUrl, ep.format, eDrawX, eDrawY, eDrawW, eDrawH, undefined, 'FAST');
      } catch (err) {
        console.warn('Error rendering extra photo in PDF:', err);
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(30, 41, 59);
      const splitExtraCap = doc.splitTextToSize(`Foto #${eIdx + 4}: ${ep.caption}`, gridCardW - 4);
      doc.text(splitExtraCap[0] || '', eCardX + gridCardW / 2, eCardY + gridCardH - 3, { align: 'center' });
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text('Page 2 of 2', leftX + 2, 283);
    doc.text(report.docFooterCode || 'Daily Report-P2-ND000-JDU-09', rightX - 2, 283, { align: 'right' });
  }

  // Trigger download
  const safeFilename = `${project.code}_${report.reportDate}_LaporanHarian.pdf`.replace(/[\/\\]/g, '-');
  doc.save(safeFilename);
}

/**
 * Generates an official Weekly Report PDF
 */
export function exportWeeklyReportPdf(weekly: WeeklyReport, project: Project) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 14;

  doc.setFillColor(15, 23, 42);
  doc.rect(10, y, pageWidth - 20, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`WEEKLY PROGRESS CONSOLIDATION (WEEK ${weekly.weekNumber})`, 14, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`PROJECT: ${project.name} (${project.code})`, 14, y + 14);
  doc.text(`PERIOD: ${weekly.startDate} to ${weekly.endDate} | PROGRESS: ${weekly.overallProgressPercent}%`, 14, y + 19);

  y += 28;

  // Summary Metrics
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.rect(10, y, pageWidth - 20, 22, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('WEEKLY AGGREGATE SUMMARY:', 14, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`• Cumulative Manpower Hours: ${weekly.totalManpowerHours} man-hours`, 14, y + 12);
  doc.text(`• Total Weather Downtime Claimed: ${weekly.totalDowntimeHours} hours (${weekly.weatherDelayDaysCount} adverse weather days)`, 14, y + 17);
  doc.text(`• Progress Accomplishment: ${weekly.overallProgressPercent}% achieved against schedule`, 110, y + 12);
  doc.text(`• Daily Reports Aggregated: ${weekly.dailyReportIds.length} verified submissions`, 110, y + 17);

  y += 28;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('EXECUTIVE NARRATIVE & CRITICAL PATH OBSERVATIONS', 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const splitText = doc.splitTextToSize(weekly.summary, pageWidth - 28);
  doc.text(splitText, 14, y);

  y += splitText.length * 5 + 16;

  // Signatures
  doc.setDrawColor(203, 213, 225);
  doc.rect(10, y, pageWidth - 20, 36, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('WEEKLY RATIFICATION SIGN-OFF', 14, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.text(`Contractor Project Lead: ${weekly.contractorSignature?.signedBy || 'Verified Lead'}`, 14, y + 16);
  doc.text(`Status: Signed on ${weekly.contractorSignature?.timestamp || weekly.endDate}`, 14, y + 22);

  doc.text(`PMO Resident Engineer: ${weekly.pmoSignature?.signedBy || project.pmoLead}`, 110, y + 16);
  doc.text(`Approval: ${weekly.approvalStatus === 'approved' ? 'Approved & Certified' : 'Under Review'}`, 110, y + 22);

  doc.save(`${project.code}_WeeklyReport_W${weekly.weekNumber}_${weekly.year}.pdf`);
}

/**
 * Generates an official Monthly Report PDF
 */
export function exportMonthlyReportPdf(monthly: MonthlyReport, project: Project) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 14;

  doc.setFillColor(15, 23, 42);
  doc.rect(10, y, pageWidth - 20, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`MONTHLY PROGRESS & CONTRACTUAL RECORD - ${monthly.monthName.toUpperCase()} ${monthly.year}`, 14, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`PROJECT: ${project.name} | CODE: ${project.code}`, 14, y + 14);
  doc.text(`REPORT NO: ${monthly.reportNumber} | TOTAL ACTIVE WORKING DAYS: ${monthly.totalWorkingDays}`, 14, y + 19);

  y += 28;

  // Executive Data Grid
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.rect(10, y, pageWidth - 20, 28, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('MONTHLY CONTRACT AUDIT & EXTENSION OF TIME METRICS', 14, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`• Total Working Days Monitored: ${monthly.totalWorkingDays} days`, 14, y + 13);
  doc.text(`• Total Manpower Cumulative Headcount: ${monthly.totalManpowerHeadcountSum} worker-shifts`, 14, y + 19);
  doc.text(`• Weather Downtime Auto-Logged: ${monthly.totalDowntimeHours} hours`, 14, y + 25);

  doc.text(`• Verified Delay Claims for EOT: ${monthly.weatherDelayClaimsTotal} days claimable`, 110, y + 13);
  doc.text(`• Progress Delta (This Month): +${monthly.monthlyProgressDelta}%`, 110, y + 19);
  doc.text(`• Compliance Submissions: 100% Digital via SitePulse`, 110, y + 25);

  y += 34;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('EXECUTIVE PMO & CONTRACTOR MONTHLY NARRATIVE', 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const narrativeLines = doc.splitTextToSize(monthly.executiveSummary, pageWidth - 28);
  doc.text(narrativeLines, 14, y);

  y += narrativeLines.length * 5 + 16;

  // Signatures
  doc.setDrawColor(203, 213, 225);
  doc.rect(10, y, pageWidth - 20, 36, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('JOINT CONTRACTUAL CERTIFICATION', 14, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.text(`Contractor Project Director: ${monthly.contractorSignature?.signedBy || 'Engr. David Santoso'}`, 14, y + 16);
  doc.text(`Signed: ${monthly.contractorSignature?.timestamp || 'Official Digital Seal'}`, 14, y + 22);

  doc.text(`PMO Project Director: ${monthly.pmoSignature?.signedBy || project.pmoLead}`, 110, y + 16);
  doc.text(`Certification: Certified for Payment Milestone & EOT Audit`, 110, y + 22);

  doc.save(`${project.code}_MonthlyReport_${monthly.monthName}_${monthly.year}.pdf`);
}
