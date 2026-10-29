import React, { useState, useEffect } from 'react';
import { 
  DailyReport, Project, UserRole, ManpowerEntry, 
  EquipmentEntry, BoqItem, BomItem, AttendeeItem, 
  SitePhoto, ScannedHardcopyDoc, HourlyWeatherCode 
} from '../types';
import { OfficialDailyReportView } from './OfficialDailyReportView';
import { PdfPreviewModal } from './PdfPreviewModal';
import { 
  HOURS_24, WEATHER_LEGEND, DEFAULT_BOQ_ITEMS, 
  DEFAULT_BOM_ITEMS, DEFAULT_MANPOWER, DEFAULT_EQUIPMENT, 
  DEFAULT_ATTENDEES, DEFAULT_SIGNATORIES, createDefault24hWeather, 
  calculateWeatherDowntime, getRealTodayStr 
} from '../utils/formDefaults';
import { readCleanPhoto } from '../utils/watermark';
import { exportDailyReportPdf } from '../utils/pdfExport';
import { 
  ArrowLeft, Copy, CloudRain, Plus, Trash2, Camera, FileDown, 
  CheckCircle2, RotateCcw, Send, Eye, FileText, Upload, Printer, 
  AlertTriangle, ShieldCheck, Calendar, Users, Wrench, Package, 
  Sun, Check, Sparkles, RefreshCw, Layers, FileSpreadsheet, ClipboardPaste, X,
  Settings2
} from 'lucide-react';

interface DailyReportFormProps {
  report: DailyReport;
  project: Project;
  allReports: DailyReport[];
  currentRole: UserRole;
  onSaveReport: (updatedReport: DailyReport) => void;
  onBack: () => void;
}

export const DailyReportForm: React.FC<DailyReportFormProps> = ({
  report,
  project,
  allReports,
  currentRole,
  onSaveReport,
  onBack,
}) => {
  // Initialize form state with defaults if fields are missing
  const [formData, setFormData] = useState<DailyReport>(() => {
    const initialized: DailyReport = {
      ...report,
      docCode: report.docCode || 'AAA/CONS/FM-014 Rev01',
      docEffectiveDate: report.docEffectiveDate || '14 Juli 2025',
      docFooterCode: report.docFooterCode || 'Daily Report-P2-ND000-JDU-09',
      hourlyWeather: report.hourlyWeather || createDefault24hWeather('empty'),
      boqItems: report.boqItems || [],
      bomItems: report.bomItems || [],
      manpower: report.manpower || [],
      equipment: report.equipment || [],
      attendees: report.attendees && report.attendees.length > 0 ? report.attendees : DEFAULT_ATTENDEES,
      contractorSignatory: report.contractorSignatory || DEFAULT_SIGNATORIES.contractor,
      consultantSignatory: report.consultantSignatory || DEFAULT_SIGNATORIES.consultant,
      pmoSignatory: report.pmoSignatory || DEFAULT_SIGNATORIES.pmo,
    };
    return initialized;
  });

  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');
  const [contractorSection, setContractorSection] = useState<'general' | 'resources' | 'weather' | 'boq_bom' | 'photos' | 'signatories'>('resources');
  
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');
  
  // PMO Action modals
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showPmoApproveModal, setShowPmoApproveModal] = useState(false);
  const [pmoName, setPmoName] = useState(formData.pmoSignatory?.signedBy || project.pmoLead.split('(')[0].trim());
  const [pmoTitle, setPmoTitle] = useState(formData.pmoSignatory?.title || 'Project Manager');

  // Physical wet signature date for PMO hardcopy upload
  const [physicalSignDate, setPhysicalSignDate] = useState<string>(
    formData.scannedHardcopy?.physicalSignDate || formData.reportDate || getRealTodayStr()
  );

  // PDF Preview before download modal
  const [showPdfPreviewModal, setShowPdfPreviewModal] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Excel Cell Format & Paste Modal State
  const [excelModalTarget, setExcelModalTarget] = useState<'boq' | 'bom' | 'manpower' | 'equipment' | null>(null);
  const [excelPasteRawText, setExcelPasteRawText] = useState('');
  const [excelPasteMode, setExcelPasteMode] = useState<'append' | 'replace'>('append');

  // Multi-cell block/selection state for all 4 Excel Grids
  interface CellRange {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  }
  const [boqSelection, setBoqSelection] = useState<CellRange | null>(null);
  const [boqIsDragging, setBoqIsDragging] = useState(false);

  const [bomSelection, setBomSelection] = useState<CellRange | null>(null);
  const [bomIsDragging, setBomIsDragging] = useState(false);

  const [mpSelection, setMpSelection] = useState<CellRange | null>(null);
  const [mpIsDragging, setMpIsDragging] = useState(false);

  const [eqSelection, setEqSelection] = useState<CellRange | null>(null);
  const [eqIsDragging, setEqIsDragging] = useState(false);

  // Equipment Status Options state (allows empty, default presets, and custom user-defined statuses)
  const [equipmentStatusOptions, setEquipmentStatusOptions] = useState<string[]>([
    'Baik / Operasi',
    'Standby di site',
    'Breakdown / Servis',
    'Dalam Perbaikan',
    'Mobilisasi',
    'Demobilisasi',
    'Rusak Ringan',
  ]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatusInput, setNewStatusInput] = useState('');
  const [directInputRows, setDirectInputRows] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setBoqIsDragging(false);
      setBomIsDragging(false);
      setMpIsDragging(false);
      setEqIsDragging(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const getRangeBounds = (sel: CellRange) => ({
    minR: Math.min(sel.startRow, sel.endRow),
    maxR: Math.max(sel.startRow, sel.endRow),
    minC: Math.min(sel.startCol, sel.endCol),
    maxC: Math.max(sel.startCol, sel.endCol),
  });

  const isBoqCellSelected = (r: number, c: number) => {
    if (!boqSelection) return false;
    const { minR, maxR, minC, maxC } = getRangeBounds(boqSelection);
    return r >= minR && r <= maxR && c >= minC && c <= maxC;
  };

  const isBomCellSelected = (r: number, c: number) => {
    if (!bomSelection) return false;
    const { minR, maxR, minC, maxC } = getRangeBounds(bomSelection);
    return r >= minR && r <= maxR && c >= minC && c <= maxC;
  };

  const isMpCellSelected = (r: number, c: number) => {
    if (!mpSelection) return false;
    const { minR, maxR, minC, maxC } = getRangeBounds(mpSelection);
    return r >= minR && r <= maxR && c >= minC && c <= maxC;
  };

  const isEqCellSelected = (r: number, c: number) => {
    if (!eqSelection) return false;
    const { minR, maxR, minC, maxC } = getRangeBounds(eqSelection);
    return r >= minR && r <= maxR && c >= minC && c <= maxC;
  };

  const focusGridCell = (gridKey: 'boq' | 'bom' | 'mp' | 'eq', r: number, c: number) => {
    if (r < 0 || c < 0) return;
    if (gridKey === 'boq') setBoqSelection({ startRow: r, startCol: c, endRow: r, endCol: c });
    else if (gridKey === 'bom') setBomSelection({ startRow: r, startCol: c, endRow: r, endCol: c });
    else if (gridKey === 'mp') setMpSelection({ startRow: r, startCol: c, endRow: r, endCol: c });
    else if (gridKey === 'eq') setEqSelection({ startRow: r, startCol: c, endRow: r, endCol: c });

    setTimeout(() => {
      const el = document.getElementById(`${gridKey}-cell-${r}-${c}`) as HTMLInputElement | HTMLSelectElement | null;
      if (el) {
        el.focus();
        if (el instanceof HTMLInputElement) {
          el.select();
        }
      }
    }, 15);
  };

  const updateBoqCell = (rowIdx: number, colIdx: number, value: any) => {
    setFormData((prev) => {
      const copy = [...(prev.boqItems || [])];
      if (!copy[rowIdx]) return prev;
      const updated = { ...copy[rowIdx] };
      if (colIdx === 0) updated.kode = value === '' ? '0' : value;
      else if (colIdx === 1) updated.deskripsi = value;
      else if (colIdx === 2) updated.satuan = value;
      else if (colIdx === 3) updated.install = value;
      copy[rowIdx] = updated;
      return { ...prev, boqItems: copy };
    });
  };

  const updateBomCell = (rowIdx: number, colIdx: number, value: any) => {
    setFormData((prev) => {
      const copy = [...(prev.bomItems || [])];
      if (!copy[rowIdx]) return prev;
      const updated = { ...copy[rowIdx] };
      if (colIdx === 0) updated.kode = value === '' ? '0' : value;
      else if (colIdx === 1) updated.jenisMaterial = value;
      else if (colIdx === 2) updated.satuan = value;
      else if (colIdx === 3) updated.install = value;
      copy[rowIdx] = updated;
      return { ...prev, bomItems: copy };
    });
  };

  const updateMpCell = (rowIdx: number, colIdx: number, value: any) => {
    setFormData((prev) => {
      const copy = [...(prev.manpower || [])];
      if (!copy[rowIdx]) return prev;
      const updated = { ...copy[rowIdx] };
      if (colIdx === 0) updated.trade = value;
      else if (colIdx === 1) updated.count = value === '' ? 0 : (isNaN(parseInt(value, 10)) ? 0 : parseInt(value, 10));
      copy[rowIdx] = updated;
      return { ...prev, manpower: copy };
    });
  };

  const updateEqCell = (rowIdx: number, colIdx: number, value: any) => {
    setFormData((prev) => {
      const copy = [...(prev.equipment || [])];
      if (!copy[rowIdx]) return prev;
      const updated = { ...copy[rowIdx] };
      if (colIdx === 0) updated.equipmentName = value;
      else if (colIdx === 1) updated.count = value === '' ? 0 : (isNaN(parseInt(value, 10)) ? 0 : parseInt(value, 10));
      else if (colIdx === 2) updated.status = value;
      copy[rowIdx] = updated;
      return { ...prev, equipment: copy };
    });
  };

  // Unified keyboard navigation across cells in Excel grid
  const handleGridKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    gridKey: 'boq' | 'bom' | 'mp' | 'eq',
    rowIdx: number,
    colIdx: number,
    maxCols: number
  ) => {
    const getRowCount = () => {
      if (gridKey === 'boq') return (formData.boqItems || []).length;
      if (gridKey === 'bom') return (formData.bomItems || []).length;
      if (gridKey === 'mp') return (formData.manpower || []).length;
      return (formData.equipment || []).length;
    };

    const addRow = () => {
      if (gridKey === 'boq') handleAddBoqRows(1);
      else if (gridKey === 'bom') handleAddBomRows(1);
      else if (gridKey === 'mp') handleAddMpRows(1);
      else if (gridKey === 'eq') handleAddEqRows(1);
    };

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (rowIdx > 0) {
        focusGridCell(gridKey, rowIdx - 1, colIdx);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (rowIdx >= getRowCount() - 1) {
        addRow();
      }
      focusGridCell(gridKey, rowIdx + 1, colIdx);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (rowIdx >= getRowCount() - 1) {
        addRow();
      }
      focusGridCell(gridKey, rowIdx + 1, colIdx);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        if (colIdx > 0) {
          focusGridCell(gridKey, rowIdx, colIdx - 1);
        } else if (rowIdx > 0) {
          focusGridCell(gridKey, rowIdx - 1, maxCols - 1);
        }
      } else {
        if (colIdx < maxCols - 1) {
          focusGridCell(gridKey, rowIdx, colIdx + 1);
        } else {
          if (rowIdx >= getRowCount() - 1) {
            addRow();
          }
          focusGridCell(gridKey, rowIdx + 1, 0);
        }
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (colIdx > 0) {
        focusGridCell(gridKey, rowIdx, colIdx - 1);
      } else if (rowIdx > 0) {
        focusGridCell(gridKey, rowIdx - 1, maxCols - 1);
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (colIdx < maxCols - 1) {
        focusGridCell(gridKey, rowIdx, colIdx + 1);
      } else if (rowIdx < getRowCount() - 1) {
        focusGridCell(gridKey, rowIdx + 1, 0);
      }
    } else if (e.key === 'Escape') {
      e.currentTarget.blur();
    }
  };

  const handleCopyBoqSelection = () => {
    const items = formData.boqItems || [];
    if (!boqSelection || items.length === 0) {
      handleCopyBoqToClipboard();
      return;
    }
    const { minR, maxR, minC, maxC } = getRangeBounds(boqSelection);
    const rows: string[] = [];
    for (let r = minR; r <= maxR && r < items.length; r++) {
      const item = items[r];
      const rowValues = [item.kode, item.deskripsi, item.satuan, String(item.install)];
      const selectedCols = rowValues.slice(minC, maxC + 1);
      rows.push(selectedCols.join('\t'));
    }
    const tsv = rows.join('\n');
    navigator.clipboard.writeText(tsv);
    const totalCells = (maxR - minR + 1) * (maxC - minC + 1);
    setCopyFeedback(`✓ Tersalin! ${totalCells} sel (${maxR - minR + 1} baris × ${maxC - minC + 1} kolom) tersalin ke clipboard.`);
    setTimeout(() => setCopyFeedback(''), 4000);
  };

  const handleDeleteBoqSelection = () => {
    if (!boqSelection) return;
    const { minR, maxR, minC, maxC } = getRangeBounds(boqSelection);
    setFormData((prev) => {
      const current = [...(prev.boqItems || [])];
      for (let r = minR; r <= maxR && r < current.length; r++) {
        const item = { ...current[r] };
        for (let c = minC; c <= maxC; c++) {
          if (c === 0) item.kode = '';
          if (c === 1) item.deskripsi = '';
          if (c === 2) item.satuan = '';
          if (c === 3) item.install = 0;
        }
        current[r] = item;
      }
      return { ...prev, boqItems: current };
    });
    setCopyFeedback('✓ Sel yang diblock berhasil dikosongkan.');
    setTimeout(() => setCopyFeedback(''), 3000);
  };

  const handleCopyBomSelection = () => {
    const items = formData.bomItems || [];
    if (!bomSelection || items.length === 0) {
      handleCopyBomToClipboard();
      return;
    }
    const { minR, maxR, minC, maxC } = getRangeBounds(bomSelection);
    const rows: string[] = [];
    for (let r = minR; r <= maxR && r < items.length; r++) {
      const item = items[r];
      const rowValues = [item.kode, item.jenisMaterial, item.satuan, String(item.install)];
      const selectedCols = rowValues.slice(minC, maxC + 1);
      rows.push(selectedCols.join('\t'));
    }
    const tsv = rows.join('\n');
    navigator.clipboard.writeText(tsv);
    const totalCells = (maxR - minR + 1) * (maxC - minC + 1);
    setCopyFeedback(`✓ Tersalin! ${totalCells} sel (${maxR - minR + 1} baris × ${maxC - minC + 1} kolom) tersalin ke clipboard.`);
    setTimeout(() => setCopyFeedback(''), 4000);
  };

  const handleDeleteBomSelection = () => {
    if (!bomSelection) return;
    const { minR, maxR, minC, maxC } = getRangeBounds(bomSelection);
    setFormData((prev) => {
      const current = [...(prev.bomItems || [])];
      for (let r = minR; r <= maxR && r < current.length; r++) {
        const item = { ...current[r] };
        for (let c = minC; c <= maxC; c++) {
          if (c === 0) item.kode = '';
          if (c === 1) item.jenisMaterial = '';
          if (c === 2) item.satuan = '';
          if (c === 3) item.install = 0;
        }
        current[r] = item;
      }
      return { ...prev, bomItems: current };
    });
    setCopyFeedback('✓ Sel yang diblock berhasil dikosongkan.');
    setTimeout(() => setCopyFeedback(''), 3000);
  };

  const handleCopyMpSelection = () => {
    const items = formData.manpower || [];
    if (!mpSelection || items.length === 0) {
      handleCopyMpToClipboard();
      return;
    }
    const { minR, maxR, minC, maxC } = getRangeBounds(mpSelection);
    const rows: string[] = [];
    for (let r = minR; r <= maxR && r < items.length; r++) {
      const item = items[r];
      const rowValues = [item.trade, String(item.count || 0)];
      const selectedCols = rowValues.slice(minC, maxC + 1);
      rows.push(selectedCols.join('\t'));
    }
    const tsv = rows.join('\n');
    navigator.clipboard.writeText(tsv);
    const totalCells = (maxR - minR + 1) * (maxC - minC + 1);
    setCopyFeedback(`✓ Tersalin! ${totalCells} sel Tenaga Kerja (${maxR - minR + 1} baris × ${maxC - minC + 1} kolom) tersalin.`);
    setTimeout(() => setCopyFeedback(''), 4000);
  };

  const handleDeleteMpSelection = () => {
    if (!mpSelection) return;
    const { minR, maxR, minC, maxC } = getRangeBounds(mpSelection);
    setFormData((prev) => {
      const current = [...(prev.manpower || [])];
      for (let r = minR; r <= maxR && r < current.length; r++) {
        const item = { ...current[r] };
        for (let c = minC; c <= maxC; c++) {
          if (c === 0) item.trade = '';
          if (c === 1) item.count = 0;
        }
        current[r] = item;
      }
      return { ...prev, manpower: current };
    });
    setCopyFeedback('✓ Sel Tenaga Kerja yang diblock berhasil dikosongkan.');
    setTimeout(() => setCopyFeedback(''), 3000);
  };

  const handleCopyEqSelection = () => {
    const items = formData.equipment || [];
    if (!eqSelection || items.length === 0) {
      handleCopyEqToClipboard();
      return;
    }
    const { minR, maxR, minC, maxC } = getRangeBounds(eqSelection);
    const rows: string[] = [];
    for (let r = minR; r <= maxR && r < items.length; r++) {
      const item = items[r];
      const rowValues = [item.equipmentName, String(item.count || 0), item.status || ''];
      const selectedCols = rowValues.slice(minC, maxC + 1);
      rows.push(selectedCols.join('\t'));
    }
    const tsv = rows.join('\n');
    navigator.clipboard.writeText(tsv);
    const totalCells = (maxR - minR + 1) * (maxC - minC + 1);
    setCopyFeedback(`✓ Tersalin! ${totalCells} sel Peralatan (${maxR - minR + 1} baris × ${maxC - minC + 1} kolom) tersalin.`);
    setTimeout(() => setCopyFeedback(''), 4000);
  };

  const handleDeleteEqSelection = () => {
    if (!eqSelection) return;
    const { minR, maxR, minC, maxC } = getRangeBounds(eqSelection);
    setFormData((prev) => {
      const current = [...(prev.equipment || [])];
      for (let r = minR; r <= maxR && r < current.length; r++) {
        const item = { ...current[r] };
        for (let c = minC; c <= maxC; c++) {
          if (c === 0) item.equipmentName = '';
          if (c === 1) item.count = 0;
          if (c === 2) item.status = '';
        }
        current[r] = item;
      }
      return { ...prev, equipment: current };
    });
    setCopyFeedback('✓ Sel Peralatan yang diblock berhasil dikosongkan.');
    setTimeout(() => setCopyFeedback(''), 3000);
  };

  // Keyboard shortcut listener for Excel block operations (Ctrl+C, Delete, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA' || activeEl?.tagName === 'SELECT';

      // Copy selection (Ctrl+C / Cmd+C)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && !isInput) {
        if (boqSelection) {
          e.preventDefault();
          handleCopyBoqSelection();
        } else if (bomSelection) {
          e.preventDefault();
          handleCopyBomSelection();
        } else if (mpSelection) {
          e.preventDefault();
          handleCopyMpSelection();
        } else if (eqSelection) {
          e.preventDefault();
          handleCopyEqSelection();
        }
      }

      // Delete/Clear selection
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInput) {
        if (boqSelection) {
          e.preventDefault();
          handleDeleteBoqSelection();
        } else if (bomSelection) {
          e.preventDefault();
          handleDeleteBomSelection();
        } else if (mpSelection) {
          e.preventDefault();
          handleDeleteMpSelection();
        } else if (eqSelection) {
          e.preventDefault();
          handleDeleteEqSelection();
        }
      }

      // Escape selection
      if (e.key === 'Escape') {
        if (boqSelection) setBoqSelection(null);
        if (bomSelection) setBomSelection(null);
        if (mpSelection) setMpSelection(null);
        if (eqSelection) setEqSelection(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [boqSelection, bomSelection, mpSelection, eqSelection, formData.boqItems, formData.bomItems, formData.manpower, formData.equipment]);

  // Helper parsing clipboard text from Excel / Sheets
  const parseClipboardTable = (rawText: string) => {
    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // Deteksi jika baris pertama adalah nama kolom / header tabel di Excel
    const isHeaderRow = (cols: string[]) => {
      const lower = cols.join(' ').toLowerCase();
      return (
        (lower.includes('kode') && (lower.includes('pekerjaan') || lower.includes('uraian') || lower.includes('material') || lower.includes('deskripsi'))) ||
        (lower.includes('satuan') && (lower.includes('volume') || lower.includes('install') || lower.includes('terpakai'))) ||
        (lower.includes('no') && lower.includes('kode'))
      );
    };

    const dataLines = lines.filter((line, idx) => {
      const cols = line.includes('\t')
        ? line.split('\t').map((c) => c.trim())
        : line.split(/[,;]/).map((c) => c.trim());
      if (idx === 0 && isHeaderRow(cols)) return false;
      return true;
    });

    return dataLines.map((line, idx) => {
      // Excel uses tab (\t), or fallback to comma/semicolon
      const cols = line.includes('\t')
        ? line.split('\t').map((c) => c.trim())
        : line.split(/[,;]/).map((c) => c.trim());

      let kode = '';
      let title = '';
      let satuan = 'unit';
      let install = '0';

      if (cols.length >= 5) {
        // [No, Kode, Deskripsi, Satuan, Install]
        const isFirstNo = /^\d+$/.test(cols[0]);
        if (isFirstNo) {
          kode = cols[1];
          title = cols[2];
          satuan = cols[3] || 'unit';
          install = cols[4] || '0';
        } else {
          kode = cols[0];
          title = cols[1];
          satuan = cols[2] || 'unit';
          install = cols[3] || '0';
        }
      } else if (cols.length === 4) {
        // Standard: Kode | Deskripsi | Satuan | Install
        kode = cols[0];
        title = cols[1];
        satuan = cols[2] || 'unit';
        install = cols[3] || '0';
      } else if (cols.length === 3) {
        // Could be (Kode, Title, Install) or (Title, Satuan, Install)
        const isFirstCode = cols[0].length <= 8 && !cols[0].includes(' ') && /[0-9]/.test(cols[0]);
        if (isFirstCode) {
          kode = cols[0];
          title = cols[1];
          satuan = 'unit';
          install = cols[2];
        } else {
          kode = `${idx + 1}`;
          title = cols[0];
          satuan = cols[1];
          install = cols[2];
        }
      } else if (cols.length === 2) {
        title = cols[0];
        install = cols[1];
        kode = `${idx + 1}`;
      } else {
        title = cols[0];
        kode = `${idx + 1}`;
      }

      // Bersihkan pemisah desimal koma dari Excel lokal Indonesia (misal 12,5 -> 12.5)
      let cleanInstall = install.replace(/[^\d.,-]/g, '').trim();
      if (cleanInstall.includes(',') && !cleanInstall.includes('.')) {
        cleanInstall = cleanInstall.replace(',', '.');
      }

      return {
        id: `parsed-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        kode: kode || `${idx + 1}`,
        title: title || `Item ${idx + 1}`,
        satuan: satuan || 'unit',
        install: cleanInstall || install || '0',
      };
    });
  };

  // Salin seluruh tabel BOQ ke clipboard dalam format Excel TSV
  const handleCopyBoqToClipboard = () => {
    const items = formData.boqItems || [];
    if (items.length === 0) {
      setCopyFeedback('Tabel BOQ masih kosong untuk disalin.');
      setTimeout(() => setCopyFeedback(''), 3000);
      return;
    }
    const tsv = ['Kode\tDeskripsi Pekerjaan\tSatuan\tInstall (Hari Ini)']
      .concat(items.map((i) => `${i.kode}\t${i.deskripsi}\t${i.satuan}\t${i.install}`))
      .join('\n');
    navigator.clipboard.writeText(tsv);
    setCopyFeedback(`✓ Tersalin! ${items.length} baris BOQ siap dipaste ke Microsoft Excel / Google Sheets.`);
    setTimeout(() => setCopyFeedback(''), 4500);
  };

  // Salin seluruh tabel BOM ke clipboard dalam format Excel TSV
  const handleCopyBomToClipboard = () => {
    const items = formData.bomItems || [];
    if (items.length === 0) {
      setCopyFeedback('Tabel BOM masih kosong untuk disalin.');
      setTimeout(() => setCopyFeedback(''), 3000);
      return;
    }
    const tsv = ['Kode Material\tJenis Material\tSatuan\tInstall / Terpakai']
      .concat(items.map((i) => `${i.kode}\t${i.jenisMaterial}\t${i.satuan}\t${i.install}`))
      .join('\n');
    navigator.clipboard.writeText(tsv);
    setCopyFeedback(`✓ Tersalin! ${items.length} baris BOM siap dipaste ke Microsoft Excel / Google Sheets.`);
    setTimeout(() => setCopyFeedback(''), 4500);
  };

  // Salin seluruh tabel Tenaga Kerja ke clipboard dalam format Excel TSV
  const handleCopyMpToClipboard = () => {
    const items = formData.manpower || [];
    if (items.length === 0) {
      setCopyFeedback('Tabel Tenaga Kerja masih kosong untuk disalin.');
      setTimeout(() => setCopyFeedback(''), 3000);
      return;
    }
    const tsv = ['No\tTenaga Kerja / Posisi\tJumlah Orang']
      .concat(items.map((m, idx) => `${idx + 1}\t${m.trade}\t${m.count || 0}`))
      .join('\n');
    navigator.clipboard.writeText(tsv);
    setCopyFeedback(`✓ Tersalin! ${items.length} baris Tenaga Kerja siap dipaste ke Microsoft Excel / Google Sheets.`);
    setTimeout(() => setCopyFeedback(''), 4500);
  };

  // Salin seluruh tabel Peralatan ke clipboard dalam format Excel TSV
  const handleCopyEqToClipboard = () => {
    const items = formData.equipment || [];
    if (items.length === 0) {
      setCopyFeedback('Tabel Peralatan masih kosong untuk disalin.');
      setTimeout(() => setCopyFeedback(''), 3000);
      return;
    }
    const tsv = ['No\tNama Peralatan\tJumlah (Unit)\tKeterangan']
      .concat(items.map((eq, idx) => `${idx + 1}\t${eq.equipmentName}\t${eq.count || 0}\t${eq.status || ''}`))
      .join('\n');
    navigator.clipboard.writeText(tsv);
    setCopyFeedback(`✓ Tersalin! ${items.length} baris Peralatan siap dipaste ke Microsoft Excel / Google Sheets.`);
    setTimeout(() => setCopyFeedback(''), 4500);
  };

  // Apply parsed items from Excel Modal
  const handleApplyExcelPaste = () => {
    if (!excelPasteRawText.trim() || !excelModalTarget) return;
    const parsed = parseClipboardTable(excelPasteRawText);
    if (parsed.length === 0) return;

    if (excelModalTarget === 'boq') {
      const mapped: BoqItem[] = parsed.map((p, i) => ({
        id: `boq-${Date.now()}-${i}`,
        kode: p.kode || `1.${i + 1}`,
        deskripsi: p.title || `Pekerjaan ${i + 1}`,
        satuan: p.satuan || 'm',
        install: p.install || 0,
      }));
      setFormData((prev) => ({
        ...prev,
        boqItems: excelPasteMode === 'replace' ? mapped : [...(prev.boqItems || []), ...mapped],
      }));
      setCopyFeedback(`✓ Berhasil menempel ${mapped.length} baris data dari Excel ke BOQ!`);
    } else if (excelModalTarget === 'bom') {
      const mapped: BomItem[] = parsed.map((p, i) => ({
        id: `bom-${Date.now()}-${i}`,
        kode: p.kode || `M-0${i + 1}`,
        jenisMaterial: p.title || `Material ${i + 1}`,
        satuan: p.satuan || 'unit',
        install: p.install || 0,
      }));
      setFormData((prev) => ({
        ...prev,
        bomItems: excelPasteMode === 'replace' ? mapped : [...(prev.bomItems || []), ...mapped],
      }));
      setCopyFeedback(`✓ Berhasil menempel ${mapped.length} baris data dari Excel ke BOM!`);
    } else if (excelModalTarget === 'manpower') {
      const mapped: ManpowerEntry[] = parsed.map((p, i) => {
        const countVal = parseInt(p.install, 10) || parseInt(p.satuan, 10) || 1;
        return {
          id: `mp-${Date.now()}-${i}`,
          trade: p.title || p.kode || `Posisi ${i + 1}`,
          count: countVal,
          hoursWorked: 8,
        };
      });
      setFormData((prev) => ({
        ...prev,
        manpower: excelPasteMode === 'replace' ? mapped : [...(prev.manpower || []), ...mapped],
      }));
      setCopyFeedback(`✓ Berhasil menempel ${mapped.length} baris data dari Excel ke Tenaga Kerja!`);
    } else if (excelModalTarget === 'equipment') {
      const mapped: EquipmentEntry[] = parsed.map((p, i) => {
        const countVal = parseInt(p.install, 10) || parseInt(p.satuan, 10) || 1;
        return {
          id: `eq-${Date.now()}-${i}`,
          equipmentName: p.title || p.kode || `Alat ${i + 1}`,
          count: countVal,
          operationalHours: 8,
          status: 'Operating' as const,
        };
      });
      setFormData((prev) => ({
        ...prev,
        equipment: excelPasteMode === 'replace' ? mapped : [...(prev.equipment || []), ...mapped],
      }));
      setCopyFeedback(`✓ Berhasil menempel ${mapped.length} baris data dari Excel ke Peralatan!`);
    }

    setExcelModalTarget(null);
    setExcelPasteRawText('');
    setTimeout(() => setCopyFeedback(''), 4500);
  };

  // Inline cell paste for BOQ: otomatis menambah baris jika data Excel melebihi baris tabel
  const handleBoqCellPaste = (e: React.ClipboardEvent, startRow: number) => {
    const text = e.clipboardData.getData('text');
    if (text && (text.includes('\t') || text.includes('\n'))) {
      e.preventDefault();
      const parsed = parseClipboardTable(text);
      if (parsed.length > 0) {
        setFormData((prev) => {
          const current = [...(prev.boqItems || [])];
          parsed.forEach((p, idx) => {
            const targetIndex = startRow + idx;
            const newItem: BoqItem = {
              id: current[targetIndex]?.id || `boq-${Date.now()}-${idx}`,
              kode: p.kode || current[targetIndex]?.kode || `1.${targetIndex + 1}`,
              deskripsi: p.title || current[targetIndex]?.deskripsi || '',
              satuan: p.satuan || current[targetIndex]?.satuan || 'm',
              install: p.install || 0,
            };
            if (targetIndex < current.length) {
              current[targetIndex] = newItem;
            } else {
              current.push(newItem);
            }
          });
          return { ...prev, boqItems: current };
        });
        setCopyFeedback(`✓ Berhasil copas ${parsed.length} baris dari Excel ke BOQ (baris otomatis bertambah)!`);
        setTimeout(() => setCopyFeedback(''), 4500);
      }
    }
  };

  // Inline cell paste for BOM: otomatis menambah baris jika data Excel melebihi baris tabel
  const handleBomCellPaste = (e: React.ClipboardEvent, startRow: number) => {
    const text = e.clipboardData.getData('text');
    if (text && (text.includes('\t') || text.includes('\n'))) {
      e.preventDefault();
      const parsed = parseClipboardTable(text);
      if (parsed.length > 0) {
        setFormData((prev) => {
          const current = [...(prev.bomItems || [])];
          parsed.forEach((p, idx) => {
            const targetIndex = startRow + idx;
            const newItem: BomItem = {
              id: current[targetIndex]?.id || `bom-${Date.now()}-${idx}`,
              kode: p.kode || current[targetIndex]?.kode || `M-${targetIndex + 1}`,
              jenisMaterial: p.title || current[targetIndex]?.jenisMaterial || '',
              satuan: p.satuan || current[targetIndex]?.satuan || 'unit',
              install: p.install || 0,
            };
            if (targetIndex < current.length) {
              current[targetIndex] = newItem;
            } else {
              current.push(newItem);
            }
          });
          return { ...prev, bomItems: current };
        });
        setCopyFeedback(`✓ Berhasil copas ${parsed.length} baris dari Excel ke BOM (baris otomatis bertambah)!`);
        setTimeout(() => setCopyFeedback(''), 4500);
      }
    }
  };

  // Inline cell paste for Tenaga Kerja
  const handleMpCellPaste = (e: React.ClipboardEvent, startRow: number) => {
    const text = e.clipboardData.getData('text');
    if (text && (text.includes('\t') || text.includes('\n'))) {
      e.preventDefault();
      const parsed = parseClipboardTable(text);
      if (parsed.length > 0) {
        setFormData((prev) => {
          const current = [...(prev.manpower || [])];
          parsed.forEach((p, idx) => {
            const targetIndex = startRow + idx;
            const countVal = parseInt(p.install, 10) || parseInt(p.satuan, 10) || current[targetIndex]?.count || 1;
            const newItem: ManpowerEntry = {
              id: current[targetIndex]?.id || `mp-${Date.now()}-${idx}`,
              trade: p.title || p.kode || current[targetIndex]?.trade || `Posisi ${targetIndex + 1}`,
              count: countVal,
              hoursWorked: current[targetIndex]?.hoursWorked || 8,
            };
            if (targetIndex < current.length) {
              current[targetIndex] = newItem;
            } else {
              current.push(newItem);
            }
          });
          return { ...prev, manpower: current };
        });
        setCopyFeedback(`✓ Berhasil copas ${parsed.length} baris dari Excel ke Tenaga Kerja!`);
        setTimeout(() => setCopyFeedback(''), 4500);
      }
    }
  };

  // Inline cell paste for Peralatan
  const handleEqCellPaste = (e: React.ClipboardEvent, startRow: number) => {
    const text = e.clipboardData.getData('text');
    if (text && (text.includes('\t') || text.includes('\n'))) {
      e.preventDefault();
      const parsed = parseClipboardTable(text);
      if (parsed.length > 0) {
        setFormData((prev) => {
          const current = [...(prev.equipment || [])];
          parsed.forEach((p, idx) => {
            const targetIndex = startRow + idx;
            const countVal = parseInt(p.install, 10) || parseInt(p.satuan, 10) || current[targetIndex]?.count || 1;
            const newItem: EquipmentEntry = {
              id: current[targetIndex]?.id || `eq-${Date.now()}-${idx}`,
              equipmentName: p.title || p.kode || current[targetIndex]?.equipmentName || `Alat ${targetIndex + 1}`,
              count: countVal,
              operationalHours: current[targetIndex]?.operationalHours || 8,
              status: current[targetIndex]?.status || 'Operating',
            };
            if (targetIndex < current.length) {
              current[targetIndex] = newItem;
            } else {
              current.push(newItem);
            }
          });
          return { ...prev, equipment: current };
        });
        setCopyFeedback(`✓ Berhasil copas ${parsed.length} baris dari Excel ke Peralatan!`);
        setTimeout(() => setCopyFeedback(''), 4500);
      }
    }
  };

  // Helper to add empty rows to BOQ
  const handleAddBoqRows = (count: number = 1) => {
    const newItems: BoqItem[] = Array.from({ length: count }).map((_, i) => {
      const idx = (formData.boqItems?.length || 0) + i + 1;
      return {
        id: `boq-${Date.now()}-${i}`,
        kode: '0',
        deskripsi: '',
        satuan: 'm',
        install: 0,
      };
    });
    setFormData((prev) => ({
      ...prev,
      boqItems: [...(prev.boqItems || []), ...newItems],
    }));
  };

  // Helper to add empty rows to BOM
  const handleAddBomRows = (count: number = 1) => {
    const newItems: BomItem[] = Array.from({ length: count }).map((_, i) => ({
      id: `bom-${Date.now()}-${i}`,
      kode: '0',
      jenisMaterial: '',
      satuan: 'unit',
      install: 0,
    }));
    setFormData((prev) => ({
      ...prev,
      bomItems: [...(prev.bomItems || []), ...newItems],
    }));
  };

  // Helper to add empty rows to Tenaga Kerja
  const handleAddMpRows = (count: number = 1) => {
    const newItems: ManpowerEntry[] = Array.from({ length: count }).map((_, i) => ({
      id: `mp-${Date.now()}-${i}`,
      trade: '',
      count: 0,
      hoursWorked: 0,
    }));
    setFormData((prev) => ({
      ...prev,
      manpower: [...(prev.manpower || []), ...newItems],
    }));
  };

  // Helper to add empty rows to Peralatan
  const handleAddEqRows = (count: number = 1) => {
    const newItems: EquipmentEntry[] = Array.from({ length: count }).map((_, i) => ({
      id: `eq-${Date.now()}-${i}`,
      equipmentName: '',
      count: 0,
      operationalHours: 0,
      status: '',
    }));
    setFormData((prev) => ({
      ...prev,
      equipment: [...(prev.equipment || []), ...newItems],
    }));
  };

  // Smart Draft: Copy Yesterday's Data
  const handleCopyYesterdayData = () => {
    const currentDate = new Date(formData.reportDate);
    currentDate.setDate(currentDate.getDate() - 1);
    const yesterdayStr = currentDate.toISOString().split('T')[0];

    const yesterdayReport = allReports.find(
      (r) => r.projectId === project.id && r.reportDate === yesterdayStr
    );

    if (yesterdayReport) {
      setFormData((prev) => ({
        ...prev,
        manpower: (yesterdayReport.manpower || []).map((m) => ({ ...m, id: `mp-${Date.now()}-${Math.random()}` })),
        equipment: (yesterdayReport.equipment || []).map((e) => ({ ...e, id: `eq-${Date.now()}-${Math.random()}` })),
        boqItems: (yesterdayReport.boqItems || []).map((b) => ({ ...b, id: `boq-${Date.now()}-${Math.random()}` })),
        bomItems: (yesterdayReport.bomItems || []).map((m) => ({ ...m, id: `bom-${Date.now()}-${Math.random()}` })),
        attendees: (yesterdayReport.attendees || []).map((a) => ({ ...a, id: `att-${Date.now()}-${Math.random()}` })),
      }));
      setCopyFeedback(`Data kemarin (${yesterdayStr}) berhasil disalin otomatis!`);
      setTimeout(() => setCopyFeedback(''), 4000);
    } else {
      const otherReports = allReports
        .filter((r) => r.projectId === project.id && r.reportDate < formData.reportDate)
        .sort((a, b) => b.reportDate.localeCompare(a.reportDate));

      if (otherReports.length > 0) {
        const latest = otherReports[0];
        setFormData((prev) => ({
          ...prev,
          manpower: (latest.manpower || []).map((m) => ({ ...m, id: `mp-${Date.now()}-${Math.random()}` })),
          equipment: (latest.equipment || []).map((e) => ({ ...e, id: `eq-${Date.now()}-${Math.random()}` })),
          boqItems: (latest.boqItems || []).map((b) => ({ ...b, id: `boq-${Date.now()}-${Math.random()}` })),
          bomItems: (latest.bomItems || []).map((m) => ({ ...m, id: `bom-${Date.now()}-${Math.random()}` })),
        }));
        setCopyFeedback(`Data disalin dari laporan sebelumnya (${latest.reportDate}).`);
        setTimeout(() => setCopyFeedback(''), 4000);
      } else {
        setCopyFeedback('Tidak ada laporan sebelumnya untuk disalin.');
        setTimeout(() => setCopyFeedback(''), 4000);
      }
    }
  };

  // Weather hour toggle ('' -> C -> M -> G -> H -> '')
  const handleHourlyWeatherToggle = (hour: string) => {
    const currentCode = (formData.hourlyWeather?.[hour] || '') as HourlyWeatherCode;
    const sequence: HourlyWeatherCode[] = ['', 'C', 'M', 'G', 'H'];
    const currentIdx = sequence.indexOf(currentCode);
    const nextIdx = ((currentIdx === -1 ? 0 : currentIdx) + 1) % sequence.length;
    const nextCode = sequence[nextIdx];

    const updatedWeather = {
      ...(formData.hourlyWeather || {}),
      [hour]: nextCode,
    };

    const calc = calculateWeatherDowntime(updatedWeather);

    setFormData((prev) => ({
      ...prev,
      hourlyWeather: updatedWeather,
      weather: {
        ...prev.weather,
        downtimeHours: calc.downtimeHours,
        claimEligible: calc.claimEligible,
      },
    }));
  };

  const handleApplyWeatherPreset = (preset: 'clear' | 'afternoon_rain' | 'cloudy' | 'empty') => {
    const newWeather = createDefault24hWeather(preset);
    const calc = calculateWeatherDowntime(newWeather);
    setFormData((prev) => ({
      ...prev,
      hourlyWeather: newWeather,
      weather: {
        ...prev.weather,
        downtimeHours: calc.downtimeHours,
        claimEligible: calc.claimEligible,
        delayReason: preset === 'afternoon_rain' ? 'Hujan lebat terjadi pukul 14:00 - 16:00 WIB, pekerjaan pengelasan pipa terhenti sementara' : '',
      },
    }));
  };

  // Photo Upload (Mendukung upload banyak foto sekaligus, caption awal kosong)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhoto(true);
    try {
      const fileList = Array.from(files);
      const newPhotos: SitePhoto[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const cleanDataUrl = await readCleanPhoto(file);
        newPhotos.push({
          id: `photo-${Date.now()}-${i}`,
          url: cleanDataUrl,
          caption: '',
          timestamp: new Date().toLocaleString('id-ID'),
          coordinates: project.coordinates,
          projectName: project.name,
          watermarked: false,
        });
      }

      setFormData((prev) => ({ ...prev, photos: [...(prev.photos || []), ...newPhotos] }));
    } catch (err) {
      console.error('Photo upload failed:', err);
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  // Upload Hasil Scan Hardcopy (Khusus PMO setelah persetujuan)
  const handleHardcopyScanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const scanDoc: ScannedHardcopyDoc = {
        fileUrl: result,
        fileName: file.name,
        uploadedAt: new Date().toLocaleString('id-ID'),
        uploadedBy: pmoName || project.pmoLead,
        physicalSignDate: physicalSignDate || formData.reportDate,
        fileSize: `${(file.size / 1024).toFixed(1)} KB`,
        notes: 'Hasil scan basah telah diverifikasi fisik oleh PMO.',
      };

      const updated = {
        ...formData,
        scannedHardcopy: scanDoc,
      };
      setFormData(updated);
      onSaveReport(updated);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleUpdatePhysicalSignDate = (newDate: string) => {
    setPhysicalSignDate(newDate);
    if (formData.scannedHardcopy) {
      const updated = {
        ...formData,
        scannedHardcopy: {
          ...formData.scannedHardcopy,
          physicalSignDate: newDate,
        },
      };
      setFormData(updated);
      onSaveReport(updated);
    }
  };

  // Contractor Submits to PMO
  const handleSubmitToPmo = () => {
    const isPastDeadline = formData.reportDate < getRealTodayStr();
    const updated: DailyReport = {
      ...formData,
      approvalStatus: 'submitted',
      submissionTiming: isPastDeadline ? 'late' : 'on-time',
      submittedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    setFormData(updated);
    onSaveReport(updated);
    setActiveTab('preview');
  };

  // PMO Approves Report
  const handlePmoApprove = () => {
    const updated: DailyReport = {
      ...formData,
      approvalStatus: 'approved',
      pmoSignatory: {
        signedBy: pmoName,
        title: pmoTitle,
        companyName: formData.pmoSignatory?.companyName || 'PT AubreyKeylaRapli',
        timestamp: new Date().toLocaleString('id-ID'),
      },
    };
    setFormData(updated);
    onSaveReport(updated);
    setShowPmoApproveModal(false);
  };

  // PMO Rejects with Notes
  const handlePmoReject = () => {
    if (!rejectReason.trim()) return;

    const newRevisionNote = {
      id: `rev-${Date.now()}`,
      author: pmoName,
      role: 'PMO' as const,
      text: rejectReason.trim(),
      timestamp: new Date().toLocaleString('id-ID'),
    };

    const updated: DailyReport = {
      ...formData,
      approvalStatus: 'needs_revision',
      revisionNotes: [newRevisionNote, ...formData.revisionNotes],
    };

    setFormData(updated);
    onSaveReport(updated);
    setShowRejectBox(false);
    setRejectReason('');
  };

  // =========================================================================
  // VIEW MODE: PMO VIEW (Read-Only 1:1 Official Document)
  // =========================================================================
  if (currentRole === 'pmo') {
    return (
      <div className="space-y-6">
        {/* PMO Top Action Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              title="Kembali ke Kalender"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm sm:text-base">
                  Review Laporan Harian
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Dokumen resmi yang diserahkan kontraktor. PMO hanya berwenang menyetujui, meminta revisi, dan mengunggah scan tanda tangan basah.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Cetak Hardcopy</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPdfPreviewModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-xs"
              title="Buka pratinjau dokumen PDF sebelum mengunduh"
            >
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>Preview & Download PDF</span>
            </button>

            {formData.approvalStatus !== 'approved' && (
              <>
                <button
                  type="button"
                  onClick={() => setShowRejectBox(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-300 hover:bg-amber-100 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                  <span>Kirim Balik / Minta Revisi</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPmoApproveModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Setujui Laporan</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Revision Box if opened */}
        {showRejectBox && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <RotateCcw className="w-4 h-4 text-amber-600" />
              <span>Kirim Catatan Revisi ke Kontraktor</span>
            </div>
            <p className="text-xs text-amber-800">
              Tuliskan instruksi perbaikan (misal: klarifikasi volume galian pipa, perjelas foto penyambungan Butt Fusion, dsb):
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Contoh: Harap sesuaikan volume install pipa HDPE DN600 dan lampirkan sertifikat operator Butt Fusion."
              className="w-full text-xs p-3 border border-amber-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRejectBox(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg bg-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handlePmoReject}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg"
              >
                Kirim Balik ke Kontraktor
              </button>
            </div>
          </div>
        )}

        {/* Existing Revision Notes history */}
        {formData.revisionNotes.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1.5">
            <div className="font-bold text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Riwayat Catatan Revisi PMO:</span>
            </div>
            {formData.revisionNotes.map((note) => (
              <div key={note.id} className="p-2 bg-white rounded border border-amber-200 text-slate-700">
                <div className="flex justify-between font-semibold text-[11px] text-slate-500 mb-0.5">
                  <span>{note.author} ({note.role})</span>
                  <span>{note.timestamp}</span>
                </div>
                <p>{note.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Post-Approval Section: Upload Scanned Signed Hardcopy */}
        {formData.approvalStatus === 'approved' && (
          <div className="bg-emerald-50/60 border border-emerald-300 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <div>
                  <h3 className="text-sm font-bold text-emerald-950">
                    Protokol Arsip Scan Hardcopy Tanda Tangan Basah
                  </h3>
                  <p className="text-xs text-emerald-800">
                    Laporan telah disetujui digital. Setelah lembar fisik ditandatangani basah oleh ketiga pihak, unggah hasil scan untuk arsip resmi.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-emerald-300 rounded-lg shadow-xs">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <label className="text-xs font-semibold text-emerald-950 whitespace-nowrap">
                  Tanggal TTD Basah:
                </label>
                <input
                  type="date"
                  value={physicalSignDate}
                  onChange={(e) => handleUpdatePhysicalSignDate(e.target.value)}
                  className="text-xs font-semibold text-emerald-950 focus:outline-none bg-transparent"
                />
              </div>
            </div>

            {formData.scannedHardcopy ? (
              <div className="bg-white border border-emerald-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs text-emerald-950">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{formData.scannedHardcopy.fileName}</span>
                    <span className="text-[10px] text-slate-500 font-normal">({formData.scannedHardcopy.fileSize || '380 KB'})</span>
                  </div>
                  <div className="text-[11px] text-slate-600 space-x-3">
                    <span>Diunggah: {formData.scannedHardcopy.uploadedAt}</span>
                    <span>·</span>
                    <span>Pengunggah: {formData.scannedHardcopy.uploadedBy}</span>
                    <span>·</span>
                    <span className="font-semibold text-emerald-800">
                      Tanggal TTD Fisik: {formData.scannedHardcopy.physicalSignDate || physicalSignDate}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={formData.scannedHardcopy.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-medium"
                  >
                    Buka File Scan
                  </a>
                  <label className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-medium cursor-pointer">
                    Ganti Scan
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={handleHardcopyScanUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-dashed border-emerald-300 rounded-lg p-5 text-center space-y-2">
                <Upload className="w-7 h-7 text-emerald-600 mx-auto" />
                <div className="text-xs font-semibold text-slate-800">
                  Unggah Lembar Scan Hardcopy (Format PDF / Gambar)
                </div>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  Pastikan lembar hardcopy telah bertanda tangan basah dari Project Manager Kontraktor, Konsultan Supervisi, dan PMO.
                </p>
                <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg cursor-pointer shadow-xs">
                  <Upload className="w-4 h-4" />
                  <span>Pilih Dokumen Scan</span>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleHardcopyScanUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        )}

        {/* 1:1 OFFICIAL DOCUMENT RENDER */}
        <OfficialDailyReportView report={formData} project={project} />

        {/* PMO Approve Dialog */}
        {showPmoApproveModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Persetujuan & Verifikasi Laporan PMO
                </h3>
              </div>
              <p className="text-xs text-slate-600">
                Konfirmasi nama dan jabatan PMO yang memverifikasi laporan ini. Tanda tangan basah tetap dilakukan secara fisik pada lembar hardcopy.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Pemeriksa PMO
                  </label>
                  <input
                    type="text"
                    value={pmoName}
                    onChange={(e) => setPmoName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jabatan PMO
                  </label>
                  <input
                    type="text"
                    value={pmoTitle}
                    onChange={(e) => setPmoTitle(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPmoApproveModal(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handlePmoApprove}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                >
                  Konfirmasi & Setujui Laporan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PDF Preview Modal before Download */}
        <PdfPreviewModal
          isOpen={showPdfPreviewModal}
          onClose={() => setShowPdfPreviewModal(false)}
          report={formData}
          project={project}
        />
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE: CONTRACTOR ENTRY VIEW
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Top Navigation & Smart Draft Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Kembali ke Kalender"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="font-bold text-slate-900 text-sm sm:text-base">
              Laporan Harian Kontraktor ({formData.reportDate})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Quick-Fill Button */}
          <button
            type="button"
            onClick={handleCopyYesterdayData}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-amber-50 border border-amber-300 hover:bg-amber-100 rounded-lg transition-colors shadow-xs"
            title="Salin tenaga kerja, alat, BOQ, dan BOM dari hari sebelumnya"
          >
            <Copy className="w-3.5 h-3.5 text-amber-700" />
            <span>Salin Data Kemarin (Quick-Fill)</span>
          </button>

          {/* Mode Form Input */}
          <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-100 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`px-3 py-1.5 font-semibold rounded-md transition-colors ${
                activeTab === 'form' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mode Form Input
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowPdfPreviewModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-xs"
            title="Buka pratinjau dokumen PDF sebelum mengunduh"
          >
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            <span>Preview & Download PDF</span>
          </button>
        </div>
      </div>

      {/* Pengingat Revisi dari PMO di Awal Tampilan Kontraktor (Hanya Muncul Jika Ada Revisi) */}
      {formData.approvalStatus === 'needs_revision' && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 text-xs space-y-2.5 shadow-xs">
          <div className="font-bold text-amber-950 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Pengingat Revisi Laporan dari PMO</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-200 text-amber-950 rounded-full font-bold">
              Wajib Diperbaiki Sebelum Submit Ulang
            </span>
          </div>
          <p className="text-slate-700 text-xs leading-relaxed">
            Laporan harian tanggal <strong>{formData.reportDate}</strong> memerlukan perbaikan sesuai instruksi PMO. Harap sesuaikan data di bawah, lalu klik tombol <strong>"Kirim Laporan Resmi ke PMO"</strong> di bagian bawah halaman.
          </p>
          {formData.revisionNotes && formData.revisionNotes.length > 0 && (
            <div className="p-3 bg-white rounded-lg border border-amber-200 text-slate-800 space-y-1">
              <div className="font-semibold text-amber-900 text-xs flex items-center justify-between">
                <span>Catatan PMO ({formData.revisionNotes[0].author}):</span>
                <span className="text-[10px] text-slate-400 font-normal">{formData.revisionNotes[0].timestamp}</span>
              </div>
              <div className="text-slate-800 italic">
                "{formData.revisionNotes[0].text}"
              </div>
            </div>
          )}
        </div>
      )}

      {copyFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-900 font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>{copyFeedback}</span>
        </div>
      )}

      {/* RENDER VIEW: PREVIEW 1:1 OR FORM INPUT */}
      {activeTab === 'preview' ? (
        <OfficialDailyReportView report={formData} project={project} />
      ) : (
        <div className="space-y-6">
          {/* Contractor Navigation Sections */}
          <div className="flex border-b border-slate-200 overflow-x-auto gap-1 text-xs font-semibold">
            <button
              onClick={() => setContractorSection('resources')}
              className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                contractorSection === 'resources'
                  ? 'border-slate-900 text-slate-950 bg-white font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>1. Tenaga Kerja & Peralatan</span>
            </button>
            <button
              onClick={() => setContractorSection('weather')}
              className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                contractorSection === 'weather'
                  ? 'border-slate-900 text-slate-950 bg-white font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>2. Pencatatan Cuaca 24 Jam</span>
            </button>
            <button
              onClick={() => setContractorSection('boq_bom')}
              className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                contractorSection === 'boq_bom'
                  ? 'border-slate-900 text-slate-950 bg-white font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3. Pekerjaan (BOQ) & Material (BOM)</span>
            </button>
            <button
              onClick={() => setContractorSection('photos')}
              className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                contractorSection === 'photos'
                  ? 'border-slate-900 text-slate-950 bg-white font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>4. Foto Lapangan ({formData.photos.length})</span>
            </button>
            <button
              onClick={() => setContractorSection('general')}
              className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                contractorSection === 'general'
                  ? 'border-slate-900 text-slate-950 bg-white font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>5. Metadata & Tanda Tangan</span>
            </button>
          </div>

          {/* SECTION 1: TENAGA KERJA & PERALATAN (FORMAT EXCEL CELL GRID) */}
          {contractorSection === 'resources' && (
            <div className="space-y-6">
              {/* 1. Tenaga Kerja (Manpower) - Excel Grid */}
              <div className="bg-white border-2 border-emerald-800/30 rounded-xl shadow-xs overflow-hidden">
                {/* Excel Toolbar */}
                <div className="bg-emerald-800 text-white p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-300 shrink-0" />
                    <div>
                      <div className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                        <span>Tenaga Kerja (Manpower) · Format Cell Excel</span>
                        <span className="text-[10px] font-mono bg-emerald-700 text-emerald-100 px-2 py-0.2 rounded font-normal">
                          {(formData.manpower || []).length} Baris
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-100/90">
                        Absensi personil site. Navigasi sel langsung dengan tombol panah (← → ↑ ↓), atau klik <strong>Paste dari Excel</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setExcelModalTarget('manpower');
                        setExcelPasteRawText('');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                      title="Salin (Ctrl+C) data personil dari Excel lalu tempel ke sini"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" />
                      <span>📋 Paste dari Excel</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyMpToClipboard}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-semibold transition-colors"
                      title="Salin seluruh baris tenaga kerja ke clipboard (format Excel TSV)"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin ke Excel</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const len = (formData.manpower || []).length;
                        if (len > 0) setMpSelection({ startRow: 0, startCol: 0, endRow: len - 1, endCol: 2 });
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-semibold transition-colors"
                      title="Block seluruh tabel Tenaga Kerja"
                    >
                      <span>⬛ Block Semua</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddMpRows(1)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+1 Baris</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddMpRows(5)}
                      className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors"
                      title="Tambah 5 baris kosong sekaligus"
                    >
                      <span>+5 Baris</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Kosongkan semua baris Tenaga Kerja?')) {
                          setFormData((prev) => ({ ...prev, manpower: [] }));
                          setMpSelection(null);
                        }
                      }}
                      className="px-2 py-1.5 text-emerald-200 hover:text-white hover:bg-red-600/30 rounded text-xs"
                      title="Hapus semua baris"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Selection Action Bar for Tenaga Kerja */}
                {mpSelection && (() => {
                  const { minR, maxR, minC, maxC } = getRangeBounds(mpSelection);
                  const totalCells = (maxR - minR + 1) * (maxC - minC + 1);
                  const colLabels = ['A · Tenaga Kerja / Posisi', 'B · Jumlah Orang'];
                  return (
                    <div className="bg-blue-700 text-white px-3 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-blue-800 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="bg-white text-blue-900 font-mono font-bold px-2 py-0.5 rounded text-[11px] shadow-xs">
                          🟦 {totalCells} Sel Diblock
                        </span>
                        <span className="text-blue-100 text-[11px]">
                          Baris {minR + 1} s/d {maxR + 1} · Kolom {colLabels[minC]} s/d {colLabels[maxC]}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleCopyMpSelection}
                          className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-900 rounded font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
                          title="Salin sel yang diblock ke clipboard (Ctrl+C)"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Salin Pilihan (Ctrl+C)</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteMpSelection}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
                          title="Kosongkan sel yang diblock (Delete)"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Hapus Nilai (Del)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMpSelection(null)}
                          className="px-2 py-1 text-blue-100 hover:text-white hover:bg-blue-800 rounded text-xs transition-colors"
                        >
                          ✕ Batal Block
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Excel Table Grid for Tenaga Kerja */}
                <div className="overflow-x-auto bg-slate-50">
                  <table className="w-full text-xs text-left border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-200 text-slate-700 font-mono text-[11px] font-bold select-none border-b border-slate-300">
                        {/* Select All Corner */}
                        <th
                          onClick={() => {
                            const len = (formData.manpower || []).length;
                            if (len > 0) setMpSelection({ startRow: 0, startCol: 0, endRow: len - 1, endCol: 1 });
                          }}
                          className="py-1 px-2 w-10 text-center border-r border-slate-300 bg-slate-300 hover:bg-blue-200 cursor-pointer select-none transition-colors"
                          title="Klik untuk block seluruh tabel Tenaga Kerja"
                        >
                          #
                        </th>

                        {/* Column A: Posisi */}
                        <th
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const len = (formData.manpower || []).length;
                            if (len > 0) {
                              setMpIsDragging(true);
                              setMpSelection({ startRow: 0, startCol: 0, endRow: len - 1, endCol: 0 });
                            }
                          }}
                          onMouseEnter={() => {
                            if (mpIsDragging && mpSelection) {
                              setMpSelection((prev) => (prev ? { ...prev, endCol: 0 } : null));
                            }
                          }}
                          className={`py-1.5 px-3 border-r border-slate-300 cursor-pointer select-none hover:bg-blue-100 transition-colors ${
                            mpSelection && getRangeBounds(mpSelection).minC <= 0 && getRangeBounds(mpSelection).maxC >= 0
                              ? 'bg-blue-200 text-blue-950 font-black'
                              : ''
                          }`}
                          title="Klik atau seret untuk block kolom Tenaga Kerja"
                        >
                          A · Tenaga Kerja / Posisi
                        </th>

                        {/* Column B: Jumlah Orang */}
                        <th
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const len = (formData.manpower || []).length;
                            if (len > 0) {
                              setMpIsDragging(true);
                              setMpSelection({ startRow: 0, startCol: 1, endRow: len - 1, endCol: 1 });
                            }
                          }}
                          onMouseEnter={() => {
                            if (mpIsDragging && mpSelection) {
                              setMpSelection((prev) => (prev ? { ...prev, endCol: 1 } : null));
                            }
                          }}
                          className={`py-1.5 px-3 w-32 text-center border-r border-slate-300 cursor-pointer select-none hover:bg-blue-100 transition-colors bg-emerald-100/60 text-emerald-950 font-black ${
                            mpSelection && getRangeBounds(mpSelection).minC <= 1 && getRangeBounds(mpSelection).maxC >= 1
                              ? '!bg-blue-200 !text-blue-950'
                              : ''
                          }`}
                          title="Klik atau seret untuk block kolom Jumlah Orang"
                        >
                          B · Orang (Jumlah)
                        </th>
                        <th className="py-1 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {(formData.manpower || []).map((m, idx) => (
                        <tr key={m.id || idx} className="hover:bg-slate-50/50">
                          {/* Row Number Header */}
                          <td
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setMpIsDragging(true);
                              setMpSelection({ startRow: idx, startCol: 0, endRow: idx, endCol: 1 });
                            }}
                            onMouseEnter={() => {
                              if (mpIsDragging && mpSelection) {
                                setMpSelection((prev) => (prev ? { ...prev, endRow: idx, endCol: 1 } : null));
                              }
                            }}
                            className={`py-0 px-2 text-center font-mono text-[11px] font-semibold border-r border-slate-300 select-none cursor-pointer transition-colors ${
                              mpSelection &&
                              idx >= getRangeBounds(mpSelection).minR &&
                              idx <= getRangeBounds(mpSelection).maxR
                                ? 'bg-blue-200 text-blue-950 font-bold'
                                : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                            }`}
                            title={`Klik atau seret untuk block baris ${idx + 1}`}
                          >
                            {idx + 1}
                          </td>

                          {/* Column A: Tenaga Kerja */}
                          <td
                            className={`p-0 border-r border-slate-300 transition-colors relative cursor-cell select-none ${
                              isMpCellSelected(idx, 0)
                                ? 'bg-blue-100 ring-2 ring-blue-500 ring-inset z-10 font-bold'
                                : ''
                            }`}
                            onMouseDown={(e) => {
                              if (e.button === 0) {
                                setMpIsDragging(true);
                                setMpSelection({ startRow: idx, startCol: 0, endRow: idx, endCol: 0 });
                              }
                            }}
                            onMouseEnter={() => {
                              if (mpIsDragging && mpSelection) {
                                setMpSelection((prev) => (prev ? { ...prev, endRow: idx, endCol: 0 } : null));
                              }
                            }}
                          >
                            <input
                              type="text"
                              id={`mp-cell-${idx}-0`}
                              value={m.trade}
                              placeholder="Nama jabatan / posisi pekerja..."
                              onDragStart={(e) => e.preventDefault()}
                              onPaste={(e) => handleMpCellPaste(e, idx)}
                              onMouseDown={(e) => {
                                if (e.button === 0) {
                                  setMpIsDragging(true);
                                  setMpSelection({ startRow: idx, startCol: 0, endRow: idx, endCol: 0 });
                                }
                              }}
                              onFocus={(e) => {
                                if (!mpIsDragging) {
                                  setMpSelection({ startRow: idx, startCol: 0, endRow: idx, endCol: 0 });
                                  e.target.select();
                                }
                              }}
                              onKeyDown={(e) => handleGridKeyDown(e, 'mp', idx, 0, 2)}
                              onChange={(e) => updateMpCell(idx, 0, e.target.value)}
                              className={`w-full h-8 px-2 text-xs border-none focus:outline-none bg-transparent focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:z-10 text-slate-800 ${
                                mpIsDragging ? 'pointer-events-none select-none' : ''
                              }`}
                            />
                          </td>

                          {/* Column B: Jumlah Orang */}
                          <td
                            className={`p-0 border-r border-slate-300 transition-colors relative cursor-cell select-none ${
                              isMpCellSelected(idx, 1)
                                ? 'bg-blue-100 ring-2 ring-blue-500 ring-inset z-10 font-bold'
                                : 'bg-emerald-50/20'
                            }`}
                            onMouseDown={(e) => {
                              if (e.button === 0) {
                                setMpIsDragging(true);
                                setMpSelection({ startRow: idx, startCol: 1, endRow: idx, endCol: 1 });
                              }
                            }}
                            onMouseEnter={() => {
                              if (mpIsDragging && mpSelection) {
                                setMpSelection((prev) => (prev ? { ...prev, endRow: idx, endCol: 1 } : null));
                              }
                            }}
                          >
                            <input
                              type="text"
                              inputMode="numeric"
                              id={`mp-cell-${idx}-1`}
                              value={m.count !== undefined && m.count !== null ? m.count : ''}
                              placeholder="0"
                              onDragStart={(e) => e.preventDefault()}
                              onPaste={(e) => handleMpCellPaste(e, idx)}
                              onMouseDown={(e) => {
                                if (e.button === 0) {
                                  setMpIsDragging(true);
                                  setMpSelection({ startRow: idx, startCol: 1, endRow: idx, endCol: 1 });
                                }
                              }}
                              onFocus={(e) => {
                                if (!mpIsDragging) {
                                  setMpSelection({ startRow: idx, startCol: 1, endRow: idx, endCol: 1 });
                                  e.target.select();
                                }
                              }}
                              onKeyDown={(e) => handleGridKeyDown(e, 'mp', idx, 1, 2)}
                              onChange={(e) => updateMpCell(idx, 1, e.target.value)}
                              className={`w-full h-8 px-2 text-xs text-center font-mono font-bold text-slate-900 border-none focus:outline-none bg-transparent focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:z-10 ${
                                mpIsDragging ? 'pointer-events-none select-none' : ''
                              }`}
                            />
                          </td>

                          {/* Action Del */}
                          <td className="py-0 px-1 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  manpower: (prev.manpower || []).filter((_, i) => i !== idx),
                                }));
                                setMpSelection(null);
                              }}
                              className="text-slate-400 hover:text-red-600 p-1"
                              title="Hapus baris ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 border-t border-slate-300 font-bold text-slate-900 text-xs">
                        <td colSpan={2} className="py-2 px-3 text-right">
                          Total Tenaga Kerja Hari Ini:
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-emerald-800 bg-emerald-50">
                          {formData.manpower.reduce((acc, c) => acc + (c.count || 0), 0)} Orang
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-slate-600 text-[11px]">
                          {formData.manpower.reduce((acc, c) => acc + ((c.count || 0) * (c.hoursWorked || 8)), 0)} Man-Hours
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Tips Format Cell Excel Footer */}
                <div className="bg-emerald-50 border-t border-slate-300 px-3.5 py-2.5 text-[11px] text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold shrink-0">💡 Tips Format Cell Excel:</span>
                    <span>
                      Gunakan tombol panah keyboard (← → ↑ ↓), Enter, atau Tab untuk berpindah antar sel tanpa perlu klik kursor setiap kali mengisi. Tekan <strong>Enter / Panah Bawah</strong> di baris terakhir untuk menambah baris otomatis. Tekan <strong>Ctrl+C</strong> untuk menyalin blok sel, <strong>Del</strong> untuk mengosongkan nilai.
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Peralatan (Equipment) - Excel Grid */}
              <div className="bg-white border-2 border-emerald-800/30 rounded-xl shadow-xs overflow-hidden">
                {/* Excel Toolbar */}
                <div className="bg-emerald-800 text-white p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-300 shrink-0" />
                    <div>
                      <div className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                        <span>Peralatan (Equipment) · Format Cell Excel</span>
                        <span className="text-[10px] font-mono bg-emerald-700 text-emerald-100 px-2 py-0.2 rounded font-normal">
                          {(formData.equipment || []).length} Baris
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-100/90">
                        Alat berat & peralatan konstruksi site. Navigasi sel langsung dengan tombol panah (← → ↑ ↓), atau klik <strong>Paste dari Excel</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setExcelModalTarget('equipment');
                        setExcelPasteRawText('');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                      title="Salin (Ctrl+C) data alat dari Excel lalu tempel ke sini"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" />
                      <span>📋 Paste dari Excel</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowStatusModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow-xs transition-colors"
                      title="Atur, tambah, dan kustomisasi opsi Kondisi / Status Peralatan"
                    >
                      <Settings2 className="w-3.5 h-3.5 text-slate-900" />
                      <span>⚙️ Atur Pilihan Status</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyEqToClipboard}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-semibold transition-colors"
                      title="Salin seluruh baris peralatan ke clipboard (format Excel TSV)"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin ke Excel</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const len = (formData.equipment || []).length;
                        if (len > 0) setEqSelection({ startRow: 0, startCol: 0, endRow: len - 1, endCol: 3 });
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-semibold transition-colors"
                      title="Block seluruh tabel Peralatan"
                    >
                      <span>⬛ Block Semua</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddEqRows(1)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+1 Baris</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddEqRows(5)}
                      className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors"
                      title="Tambah 5 baris kosong sekaligus"
                    >
                      <span>+5 Baris</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Kosongkan semua baris Peralatan?')) {
                          setFormData((prev) => ({ ...prev, equipment: [] }));
                          setEqSelection(null);
                        }
                      }}
                      className="px-2 py-1.5 text-emerald-200 hover:text-white hover:bg-red-600/30 rounded text-xs"
                      title="Hapus semua baris"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Selection Action Bar for Peralatan */}
                {eqSelection && (() => {
                  const { minR, maxR, minC, maxC } = getRangeBounds(eqSelection);
                  const totalCells = (maxR - minR + 1) * (maxC - minC + 1);
                  const colLabels = ['A · Nama Peralatan', 'B · Jumlah (Unit)', 'C · Keterangan'];
                  return (
                    <div className="bg-blue-700 text-white px-3 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-blue-800 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="bg-white text-blue-900 font-mono font-bold px-2 py-0.5 rounded text-[11px] shadow-xs">
                          🟦 {totalCells} Sel Diblock
                        </span>
                        <span className="text-blue-100 text-[11px]">
                          Baris {minR + 1} s/d {maxR + 1} · Kolom {colLabels[minC]} s/d {colLabels[maxC]}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleCopyEqSelection}
                          className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-900 rounded font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
                          title="Salin sel yang diblock ke clipboard (Ctrl+C)"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Salin Pilihan (Ctrl+C)</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteEqSelection}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
                          title="Kosongkan sel yang diblock (Delete)"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Hapus Nilai (Del)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEqSelection(null)}
                          className="px-2 py-1 text-blue-100 hover:text-white hover:bg-blue-800 rounded text-xs transition-colors"
                        >
                          ✕ Batal Block
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Excel Table Grid for Peralatan */}
                <div className="overflow-x-auto bg-slate-50">
                  <table className="w-full text-xs text-left border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-200 text-slate-700 font-mono text-[11px] font-bold select-none border-b border-slate-300">
                        {/* Select All Corner */}
                        <th
                          onClick={() => {
                            const len = (formData.equipment || []).length;
                            if (len > 0) setEqSelection({ startRow: 0, startCol: 0, endRow: len - 1, endCol: 2 });
                          }}
                          className="py-1 px-2 w-10 text-center border-r border-slate-300 bg-slate-300 hover:bg-blue-200 cursor-pointer select-none transition-colors"
                          title="Klik untuk block seluruh tabel Peralatan"
                        >
                          #
                        </th>

                        {/* Column A: Peralatan */}
                        <th
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const len = (formData.equipment || []).length;
                            if (len > 0) {
                              setEqIsDragging(true);
                              setEqSelection({ startRow: 0, startCol: 0, endRow: len - 1, endCol: 0 });
                            }
                          }}
                          onMouseEnter={() => {
                            if (eqIsDragging && eqSelection) {
                              setEqSelection((prev) => (prev ? { ...prev, endCol: 0 } : null));
                            }
                          }}
                          className={`py-1.5 px-3 border-r border-slate-300 cursor-pointer select-none hover:bg-blue-100 transition-colors ${
                            eqSelection && getRangeBounds(eqSelection).minC <= 0 && getRangeBounds(eqSelection).maxC >= 0
                              ? 'bg-blue-200 text-blue-950 font-black'
                              : ''
                          }`}
                          title="Klik atau seret untuk block kolom Nama Peralatan"
                        >
                          A · Nama Peralatan
                        </th>

                        {/* Column B: Jumlah Unit */}
                        <th
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const len = (formData.equipment || []).length;
                            if (len > 0) {
                              setEqIsDragging(true);
                              setEqSelection({ startRow: 0, startCol: 1, endRow: len - 1, endCol: 1 });
                            }
                          }}
                          onMouseEnter={() => {
                            if (eqIsDragging && eqSelection) {
                              setEqSelection((prev) => (prev ? { ...prev, endCol: 1 } : null));
                            }
                          }}
                          className={`py-1.5 px-3 w-32 text-center border-r border-slate-300 cursor-pointer select-none hover:bg-blue-100 transition-colors bg-emerald-100/60 text-emerald-950 font-black ${
                            eqSelection && getRangeBounds(eqSelection).minC <= 1 && getRangeBounds(eqSelection).maxC >= 1
                              ? '!bg-blue-200 !text-blue-950'
                              : ''
                          }`}
                          title="Klik atau seret untuk block kolom Jumlah Unit"
                        >
                          B · Jumlah (Unit)
                        </th>

                        {/* Column C: Keterangan */}
                        <th
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const len = (formData.equipment || []).length;
                            if (len > 0) {
                              setEqIsDragging(true);
                              setEqSelection({ startRow: 0, startCol: 2, endRow: len - 1, endCol: 2 });
                            }
                          }}
                          onMouseEnter={() => {
                            if (eqIsDragging && eqSelection) {
                              setEqSelection((prev) => (prev ? { ...prev, endCol: 2 } : null));
                            }
                          }}
                          className={`py-1.5 px-3 w-48 text-center border-r border-slate-300 cursor-pointer select-none hover:bg-blue-100 transition-colors ${
                            eqSelection && getRangeBounds(eqSelection).minC <= 2 && getRangeBounds(eqSelection).maxC >= 2
                              ? 'bg-blue-200 text-blue-950 font-black'
                              : ''
                          }`}
                          title="Klik atau seret untuk block kolom Keterangan"
                        >
                          C · Keterangan
                        </th>
                        <th className="py-1 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {(formData.equipment || []).map((eq, idx) => (
                        <tr key={eq.id || idx} className="hover:bg-slate-50/50">
                          {/* Row Number Header */}
                          <td
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setEqIsDragging(true);
                              setEqSelection({ startRow: idx, startCol: 0, endRow: idx, endCol: 2 });
                            }}
                            onMouseEnter={() => {
                              if (eqIsDragging && eqSelection) {
                                setEqSelection((prev) => (prev ? { ...prev, endRow: idx, endCol: 2 } : null));
                              }
                            }}
                            className={`py-0 px-2 text-center font-mono text-[11px] font-semibold border-r border-slate-300 select-none cursor-pointer transition-colors ${
                              eqSelection &&
                              idx >= getRangeBounds(eqSelection).minR &&
                              idx <= getRangeBounds(eqSelection).maxR
                                ? 'bg-blue-200 text-blue-950 font-bold'
                                : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                            }`}
                            title={`Klik atau seret untuk block baris ${idx + 1}`}
                          >
                            {idx + 1}
                          </td>

                          {/* Column A: Nama Peralatan */}
                          <td
                            className={`p-0 border-r border-slate-300 transition-colors relative cursor-cell select-none ${
                              isEqCellSelected(idx, 0)
                                ? 'bg-blue-100 ring-2 ring-blue-500 ring-inset z-10 font-bold'
                                : ''
                            }`}
                            onMouseDown={(e) => {
                              if (e.button === 0) {
                                setEqIsDragging(true);
                                setEqSelection({ startRow: idx, startCol: 0, endRow: idx, endCol: 0 });
                              }
                            }}
                            onMouseEnter={() => {
                              if (eqIsDragging && eqSelection) {
                                setEqSelection((prev) => (prev ? { ...prev, endRow: idx, endCol: 0 } : null));
                              }
                            }}
                          >
                            <input
                              type="text"
                              id={`eq-cell-${idx}-0`}
                              value={eq.equipmentName}
                              placeholder="Nama alat berat / peralatan..."
                              onDragStart={(e) => e.preventDefault()}
                              onPaste={(e) => handleEqCellPaste(e, idx)}
                              onMouseDown={(e) => {
                                if (e.button === 0) {
                                  setEqIsDragging(true);
                                  setEqSelection({ startRow: idx, startCol: 0, endRow: idx, endCol: 0 });
                                }
                              }}
                              onFocus={(e) => {
                                if (!eqIsDragging) {
                                  setEqSelection({ startRow: idx, startCol: 0, endRow: idx, endCol: 0 });
                                  e.target.select();
                                }
                              }}
                              onKeyDown={(e) => handleGridKeyDown(e, 'eq', idx, 0, 3)}
                              onChange={(e) => updateEqCell(idx, 0, e.target.value)}
                              className={`w-full h-8 px-2 text-xs border-none focus:outline-none bg-transparent focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:z-10 text-slate-800 ${
                                eqIsDragging ? 'pointer-events-none select-none' : ''
                              }`}
                            />
                          </td>

                          {/* Column B: Jumlah Unit */}
                          <td
                            className={`p-0 border-r border-slate-300 transition-colors relative cursor-cell select-none ${
                              isEqCellSelected(idx, 1)
                                ? 'bg-blue-100 ring-2 ring-blue-500 ring-inset z-10 font-bold'
                                : 'bg-emerald-50/20'
                            }`}
                            onMouseDown={(e) => {
                              if (e.button === 0) {
                                setEqIsDragging(true);
                                setEqSelection({ startRow: idx, startCol: 1, endRow: idx, endCol: 1 });
                              }
                            }}
                            onMouseEnter={() => {
                              if (eqIsDragging && eqSelection) {
                                setEqSelection((prev) => (prev ? { ...prev, endRow: idx, endCol: 1 } : null));
                              }
                            }}
                          >
                            <input
                              type="text"
                              inputMode="numeric"
                              id={`eq-cell-${idx}-1`}
                              value={eq.count !== undefined && eq.count !== null ? eq.count : ''}
                              placeholder="0"
                              onDragStart={(e) => e.preventDefault()}
                              onPaste={(e) => handleEqCellPaste(e, idx)}
                              onMouseDown={(e) => {
                                if (e.button === 0) {
                                  setEqIsDragging(true);
                                  setEqSelection({ startRow: idx, startCol: 1, endRow: idx, endCol: 1 });
                                }
                              }}
                              onFocus={(e) => {
                                if (!eqIsDragging) {
                                  setEqSelection({ startRow: idx, startCol: 1, endRow: idx, endCol: 1 });
                                  e.target.select();
                                }
                              }}
                              onKeyDown={(e) => handleGridKeyDown(e, 'eq', idx, 1, 3)}
                              onChange={(e) => updateEqCell(idx, 1, e.target.value)}
                              className={`w-full h-8 px-2 text-xs text-center font-mono font-bold text-slate-900 border-none focus:outline-none bg-transparent focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:z-10 ${
                                eqIsDragging ? 'pointer-events-none select-none' : ''
                              }`}
                            />
                          </td>

                          {/* Column C: Keterangan */}
                          <td
                            className={`p-0 border-r border-slate-300 transition-colors relative cursor-cell select-none ${
                              isEqCellSelected(idx, 2)
                                ? 'bg-blue-100 ring-2 ring-blue-500 ring-inset z-10 font-bold'
                                : ''
                            }`}
                            onMouseDown={(e) => {
                              if (e.button === 0) {
                                setEqIsDragging(true);
                                setEqSelection({ startRow: idx, startCol: 2, endRow: idx, endCol: 2 });
                              }
                            }}
                            onMouseEnter={() => {
                              if (eqIsDragging && eqSelection) {
                                setEqSelection((prev) => (prev ? { ...prev, endRow: idx, endCol: 2 } : null));
                              }
                            }}
                          >
                            <input
                              type="text"
                              id={`eq-cell-${idx}-2`}
                              value={eq.status || ''}
                              placeholder="Keterangan kondisi / status alat..."
                              onDragStart={(e) => e.preventDefault()}
                              onPaste={(e) => handleEqCellPaste(e, idx)}
                              onMouseDown={(e) => {
                                if (e.button === 0) {
                                  setEqIsDragging(true);
                                  setEqSelection({ startRow: idx, startCol: 2, endRow: idx, endCol: 2 });
                                }
                              }}
                              onFocus={(e) => {
                                if (!eqIsDragging) {
                                  setEqSelection({ startRow: idx, startCol: 2, endRow: idx, endCol: 2 });
                                  e.target.select();
                                }
                              }}
                              onKeyDown={(e) => handleGridKeyDown(e, 'eq', idx, 2, 3)}
                              onChange={(e) => updateEqCell(idx, 2, e.target.value)}
                              className={`w-full h-8 px-2 text-xs border-none focus:outline-none bg-transparent focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:z-10 text-slate-800 ${
                                eqIsDragging ? 'pointer-events-none select-none' : ''
                              }`}
                            />
                          </td>

                          {/* Action Del */}
                          <td className="py-0 px-1 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  equipment: (prev.equipment || []).filter((_, i) => i !== idx),
                                }));
                                setEqSelection(null);
                              }}
                              className="text-slate-400 hover:text-red-600 p-1"
                              title="Hapus baris ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 border-t border-slate-300 font-bold text-slate-900 text-xs">
                        <td colSpan={2} className="py-2 px-3 text-right">
                          Total Unit Peralatan di Site:
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-emerald-800 bg-emerald-50">
                          {formData.equipment.reduce((acc, c) => acc + (c.count || 0), 0)} Unit
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Tips Format Cell Excel Footer */}
                <div className="bg-emerald-50 border-t border-slate-300 px-3.5 py-2.5 text-[11px] text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold shrink-0">💡 Tips Format Cell Excel:</span>
                    <span>
                      Gunakan tombol panah keyboard (← → ↑ ↓), Enter, atau Tab untuk berpindah antar sel tanpa perlu klik kursor setiap kali mengisi. Tekan <strong>Enter / Panah Bawah</strong> di baris terakhir untuk menambah baris otomatis. Tekan <strong>Ctrl+C</strong> untuk menyalin blok sel, <strong>Del</strong> untuk mengosongkan nilai.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: PENCATATAN CUACA 24 JAM */}
          {contractorSection === 'weather' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>Pencatatan Cuaca Per Jam (24 Jam Penuh)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Klik jam untuk mengubah status (C → M → G → H). Hujan lebat (H) otomatis dihitung menjadi jam henti kerja (Downtime EOT).
                  </p>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-slate-500 font-medium">Preset Cepat:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyWeatherPreset('empty')}
                    className="px-2.5 py-1 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-md"
                  >
                    Kosongkan Semua Jam (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyWeatherPreset('clear')}
                    className="px-2.5 py-1 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-md"
                  >
                    Cerah Seharian (C)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyWeatherPreset('afternoon_rain')}
                    className="px-2.5 py-1 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded-md"
                  >
                    Hujan Siang (14-16)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyWeatherPreset('cloudy')}
                    className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-md"
                  >
                    Mendung (M)
                  </button>
                </div>
              </div>

              {/* Legend Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                {WEATHER_LEGEND.map((leg) => (
                  <div key={leg.code} className={`p-2 rounded-lg border ${leg.color} flex items-center gap-2 min-w-0 overflow-hidden`}>
                    <span className="w-6 h-6 shrink-0 rounded flex items-center justify-center font-bold font-mono bg-white/70">
                      {leg.code || '-'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold leading-tight">{leg.label}</div>
                      <div className="text-[10px] opacity-80 leading-snug break-words">{leg.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 24-Hours Interactive Grid */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-700">01:00 s/d 12:00 (Pagi - Siang):</div>
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
                  {HOURS_24.slice(0, 12).map((h) => {
                    const raw = formData.hourlyWeather?.[h];
                    const code = (raw !== undefined && raw !== null ? raw : '') as HourlyWeatherCode;
                    const leg = WEATHER_LEGEND.find((l) => l.code === code) || WEATHER_LEGEND[0];
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => handleHourlyWeatherToggle(h)}
                        className={`p-2 rounded-lg border text-center transition-all shadow-2xs hover:scale-105 ${leg?.color || 'bg-white text-slate-500 border-slate-300'}`}
                      >
                        <div className="font-mono text-[10px] text-slate-600">{h}</div>
                        <div className="text-base font-bold font-mono mt-0.5">{code || '-'}</div>
                        <div className="text-[9px] uppercase tracking-wide truncate">{leg?.label || 'Kosong'}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="text-xs font-bold text-slate-700 pt-2">13:00 s/d 24:00 (Siang - Malam):</div>
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
                  {HOURS_24.slice(12, 24).map((h) => {
                    const raw = formData.hourlyWeather?.[h];
                    const code = (raw !== undefined && raw !== null ? raw : '') as HourlyWeatherCode;
                    const leg = WEATHER_LEGEND.find((l) => l.code === code) || WEATHER_LEGEND[0];
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => handleHourlyWeatherToggle(h)}
                        className={`p-2 rounded-lg border text-center transition-all shadow-2xs hover:scale-105 ${leg?.color || 'bg-white text-slate-500 border-slate-300'}`}
                      >
                        <div className="font-mono text-[10px] text-slate-600">{h}</div>
                        <div className="text-base font-bold font-mono mt-0.5">{code || '-'}</div>
                        <div className="text-[9px] uppercase tracking-wide truncate">{leg?.label || 'Kosong'}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Downtime Auto-Calculation Summary Box REMOVED per user request */}
            </div>
          )}

          {/* SECTION 3: PEKERJAAN (BOQ) & MATERIAL (BOM) DENGAN FORMAT EXCEL CELL */}
          {contractorSection === 'boq_bom' && (
            <div className="space-y-6">
              {/* BOQ Items - Excel Grid */}
              <div className="bg-white border-2 border-emerald-800/30 rounded-xl shadow-xs overflow-hidden">
                {/* Excel Toolbar */}
                <div className="bg-emerald-800 text-white p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-300 shrink-0" />
                    <div>
                      <div className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                        <span>Jenis Pekerjaan (BOQ) · Format Cell Excel</span>
                        <span className="text-[10px] font-mono bg-emerald-700 text-emerald-100 px-2 py-0.2 rounded font-normal">
                          {(formData.boqItems || []).length} Baris
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-100/90">
                        Klik cell mana saja untuk edit, atau klik <strong>Paste dari Excel</strong> untuk salin puluhan baris sekaligus.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setExcelModalTarget('boq');
                        setExcelPasteRawText('');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                      title="Salin (Ctrl+C) data dari Excel lalu tempel ke sini"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" />
                      <span>📋 Paste dari Excel</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyBoqToClipboard}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-semibold transition-colors"
                      title="Salin seluruh baris tabel BOQ ke clipboard (format Excel TSV)"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin ke Excel</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const len = (formData.boqItems || []).length;
                        if (len > 0) setBoqSelection({ startRow: 0, startCol: 0, endRow: len - 1, endCol: 3 });
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-semibold transition-colors"
                      title="Block seluruh tabel BOQ (bisa disalin atau dihapus sekaligus)"
                    >
                      <span>⬛ Block Semua</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddBoqRows(1)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+1 Baris</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddBoqRows(5)}
                      className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors"
                      title="Tambah 5 baris kosong sekaligus"
                    >
                      <span>+5 Baris</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Kosongkan semua baris BOQ?')) {
                          setFormData((prev) => ({ ...prev, boqItems: [] }));
                          setBoqSelection(null);
                        }
                      }}
                      className="px-2 py-1.5 text-emerald-200 hover:text-white hover:bg-red-600/30 rounded text-xs"
                      title="Hapus semua baris"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Selection Action Bar for BOQ */}
                {boqSelection && (() => {
                  const { minR, maxR, minC, maxC } = getRangeBounds(boqSelection);
                  const totalCells = (maxR - minR + 1) * (maxC - minC + 1);
                  const colLabels = ['A · Kode', 'B · Deskripsi', 'C · Satuan', 'D · Install'];
                  return (
                    <div className="bg-blue-700 text-white px-3 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-blue-800 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="bg-white text-blue-900 font-mono font-bold px-2 py-0.5 rounded text-[11px] shadow-xs">
                          🟦 {totalCells} Sel Diblock
                        </span>
                        <span className="text-blue-100 text-[11px]">
                          Baris {minR + 1} s/d {maxR + 1} · Kolom {colLabels[minC]} s/d {colLabels[maxC]}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleCopyBoqSelection}
                          className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-900 rounded font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
                          title="Salin sel yang diblock ke clipboard (Ctrl+C)"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Salin Pilihan (Ctrl+C)</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteBoqSelection}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
                          title="Kosongkan sel yang diblock (Delete)"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Hapus Nilai (Del)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBoqSelection(null)}
                          className="px-2 py-1 text-blue-100 hover:text-white hover:bg-blue-800 rounded text-xs transition-colors"
                        >
                          ✕ Batal Block
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Excel Table Grid */}
                <div className="overflow-x-auto bg-slate-50">
                  <table className="w-full text-xs text-left border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-200 text-slate-700 font-mono text-[11px] font-bold select-none border-b border-slate-300">
                        {/* Select All Corner */}
                        <th
                          onClick={() => {
                            const len = (formData.boqItems || []).length;
                            if (len > 0) setBoqSelection({ startRow: 0, startCol: 0, endRow: len - 1, endCol: 3 });
                          }}
                          className="py-1 px-2 w-10 text-center border-r border-slate-300 bg-slate-300 hover:bg-blue-200 cursor-pointer select-none transition-colors"
                          title="Klik untuk block seluruh tabel BOQ"
                        >
                          #
                        </th>

                        {/* Column A Header */}
                        <th
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const len = (formData.boqItems || []).length;
                            if (len > 0) {
                              setBoqIsDragging(true);
                              setBoqSelection({ startRow: 0, startCol: 0, endRow: len - 1, endCol: 0 });
                            }
                          }}
                          onMouseEnter={() => {
                            if (boqIsDragging && boqSelection) {
                              setBoqSelection((prev) => (prev ? { ...prev, endCol: 0 } : null));
                            }
                          }}
                          className={`py-1.5 px-3 w-28 border-r border-slate-300 cursor-pointer select-none hover:bg-blue-100 transition-colors ${
                            boqSelection && getRangeBounds(boqSelection).minC <= 0 && getRangeBounds(boqSelection).maxC >= 0
                              ? 'bg-blue-200 text-blue-950 font-black'
                              : ''
                          }`}
                          title="Klik atau seret untuk block seluruh kolom A"
                        >
                          A · Kode
                        </th>

                        {/* Column B Header */}
                        <th
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const len = (formData.boqItems || []).length;
                            if (len > 0) {
                              setBoqIsDragging(true);
                              setBoqSelection({ startRow: 0, startCol: 1, endRow: len - 1, endCol: 1 });
                            }
                          }}
                          onMouseEnter={() => {
                            if (boqIsDragging && boqSelection) {
                              setBoqSelection((prev) => (prev ? { ...prev, endCol: 1 } : null));
                            }
                          }}
                          className={`py-1.5 px-3 border-r border-slate-300 cursor-pointer select-none hover:bg-blue-100 transition-colors ${
                            boqSelection && getRangeBounds(boqSelection).minC <= 1 && getRangeBounds(boqSelection).maxC >= 1
                              ? 'bg-blue-200 text-blue-950 font-black'
                              : ''
                          }`}
                          title="Klik atau seret untuk block seluruh kolom B"
                        >
                          B · Deskripsi Pekerjaan
                        </th>

                        {/* Column C Header */}
                        <th
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const len = (formData.boqItems || []).length;
                            if (len > 0) {
                              setBoqIsDragging(true);
                              setBoqSelection({ startRow: 0, startCol: 2, endRow: len - 1, endCol: 2 });
                            }
                          }}
                          onMouseEnter={() => {
                            if (boqIsDragging && boqSelection) {
                              setBoqSelection((prev) => (prev ? { ...prev, endCol: 2 } : null));
                            }
                          }}
                          className={`py-1.5 px-3 w-28 text-center border-r border-slate-300 cursor-pointer select-none hover:bg-blue-100 transition-colors ${
                            boqSelection && getRangeBounds(boqSelection).minC <= 2 && getRangeBounds(boqSelection).maxC >= 2
                              ? 'bg-blue-200 text-blue-950 font-black'
                              : ''
                          }`}
                          title="Klik atau seret untuk block seluruh kolom C"
                        >
                          C · Satuan
                        </th>

                        {/* Column D Header */}
                        <th
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const len = (formData.boqItems || []).length;
                            if (len > 0) {
                              setBoqIsDragging(true);
                              setBoqSelection({ startRow: 0, startCol: 3, endRow: len - 1, endCol: 3 });
                            }
                          }}
                          onMouseEnter={() => {
                            if (boqIsDragging && boqSelection) {
                              setBoqSelection((prev) => (prev ? { ...prev, endCol: 3 } : null));
                            }
                          }}
                          className={`py-1.5 px-3 w-32 text-center border-r border-slate-300 cursor-pointer select-none hover:bg-blue-100 transition-colors bg-emerald-100/60 text-emerald-950 font-black ${
                            boqSelection && getRangeBounds(boqSelection).minC <= 3 && getRangeBounds(boqSelection).maxC >= 3
                              ? '!bg-blue-200 !text-blue-950'
                              : ''
                          }`}
                          title="Klik atau seret untuk block seluruh kolom D"
                        >
                          D · Install (Hari Ini)
                        </th>
                        <th className="py-1 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {(formData.boqItems || []).map((b, idx) => (
                        <tr key={b.id || idx} className="hover:bg-slate-50/50">
                          {/* Row Number Header (Click to block row) */}
                          <td
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setBoqIsDragging(true);
                              setBoqSelection({ startRow: idx, startCol: 0, endRow: idx, endCol: 3 });
                            }}
                            onMouseEnter={() => {
                              if (boqIsDragging && boqSelection) {
                                setBoqSelection((prev) => (prev ? { ...prev, endRow: idx, endCol: 3 } : null));
                              }
                            }}
                            className={`py-0 px-2 text-center font-mono text-[11px] font-semibold border-r border-slate-300 select-none cursor-pointer transition-colors ${
                              boqSelection &&
                              idx >= getRangeBounds(boqSelection).minR &&
                              idx <= getRangeBounds(boqSelection).maxR
                                ? 'bg-blue-200 text-blue-950 font-bold'
                                : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                            }`}
                            title={`Klik atau seret untuk block baris ${idx + 1}`}
                          >
                            {idx + 1}
                          </td>

                          {/* Column A: Kode */}
                          <td
                            className={`p-0 border-r border-slate-300 transition-colors relative cursor-cell select-none ${
                              isBoqCellSelected(idx, 0)
                                ? 'bg-blue-100 ring-2 ring-blue-500 ring-inset z-10 font-bold'
                                : ''
                            }`}
                            onMouseDown={(e) => {
                              if (e.button === 0) {
                                setBoqIsDragging(true);
                                setBoqSelection({ startRow: idx, startCol: 0, endRow: idx, endCol: 0 });
                              }
                            }}
                            onMouseEnter={() => {
                              if (boqIsDragging && boqSelection) {
                                setBoqSelection((prev) => (prev ? { ...prev, endRow: idx, endCol: 0 } : null));
                              }
                            }}
                          >
                            <input
                              type="text"
                              id={`boq-cell-${idx}-0`}
                              value={b.kode !== undefined && b.kode !== null ? b.kode : '0'}
                              placeholder="0"
                              onDragStart={(e) => e.preventDefault()}
                              onPaste={(e) => handleBoqCellPaste(e, idx)}
                              onMouseDown={(e) => {
                                if (e.button === 0) {
                                  setBoqIsDragging(true);
                                  setBoqSelection({ startRow: idx, startCol: 0, endRow: idx, endCol: 0 });
                                }
                              }}
                              onFocus={(e) => {
                                if (!boqIsDragging) {
                                  setBoqSelection({ startRow: idx, startCol: 0, endRow: idx, endCol: 0 });
                                  e.target.select();
                                }
                              }}
                              onKeyDown={(e) => handleGridKeyDown(e, 'boq', idx, 0, 4)}
                              onChange={(e) => updateBoqCell(idx, 0, e.target.value === '' ? '0' : e.target.value)}
                              className={`w-full h-8 px-2 text-xs font-mono font-bold border-none focus:outline-none bg-transparent focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:z-10 text-slate-900 ${
                                boqIsDragging ? 'pointer-events-none select-none' : ''
                              }`}
                            />
                          </td>

                          {/* Column B: Deskripsi Pekerjaan */}
                          <td
                            className={`p-0 border-r border-slate-300 transition-colors relative cursor-cell select-none ${
                              isBoqCellSelected(idx, 1)
                                ? 'bg-blue-100 ring-2 ring-blue-500 ring-inset z-10 font-bold'
                                : ''
                            }`}
                            onMouseDown={(e) => {
                              if (e.button === 0) {
                                setBoqIsDragging(true);
                                setBoqSelection({ startRow: idx, startCol: 1, endRow: idx, endCol: 1 });
                              }
                            }}
                            onMouseEnter={() => {
                              if (boqIsDragging && boqSelection) {
                                setBoqSelection((prev) => (prev ? { ...prev, endRow: idx, endCol: 1 } : null));
                              }
                            }}
                          >
                            <input
                              type="text"
                              id={`boq-cell-${idx}-1`}
                              value={b.deskripsi}
                              placeholder="Uraian pekerjaan..."
                              onDragStart={(e) => e.preventDefault()}
                              onPaste={(e) => handleBoqCellPaste(e, idx)}
                              onMouseDown={(e) => {
                                if (e.button === 0) {
                                  setBoqIsDragging(true);
                                  setBoqSelection({ startRow: idx, startCol: 1, endRow: idx, endCol: 1 });
                                }
                              }}
                              onFocus={(e) => {
                                if (!boqIsDragging) {
                                  setBoqSelection({ startRow: idx, startCol: 1, endRow: idx, endCol: 1 });
                                  e.target.select();
                                }
                              }}
                              onKeyDown={(e) => handleGridKeyDown(e, 'boq', idx, 1, 4)}
                              onChange={(e) => updateBoqCell(idx, 1, e.target.value)}
                              className={`w-full h-8 px-2 text-xs border-none focus:outline-none bg-transparent focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:z-10 text-slate-800 ${
                                boqIsDragging ? 'pointer-events-none select-none' : ''
                              }`}
                            />
                          </td>

                          {/* Column C: Satuan */}
                          <td
                            className={`p-0 border-r border-slate-300 transition-colors relative cursor-cell select-none ${
                              isBoqCellSelected(idx, 2)
                                ? 'bg-blue-100 ring-2 ring-blue-500 ring-inset z-10 font-bold'
                                : ''
                            }`}
                            onMouseDown={(e) => {
                              if (e.button === 0) {
                                setBoqIsDragging(true);
                                setBoqSelection({ startRow: idx, startCol: 2, endRow: idx, endCol: 2 });
                              }
                            }}
                            onMouseEnter={() => {
                              if (boqIsDragging && boqSelection) {
                                setBoqSelection((prev) => (prev ? { ...prev, endRow: idx, endCol: 2 } : null));
                              }
                            }}
                          >
                            <input
                              type="text"
                              id={`boq-cell-${idx}-2`}
                              value={b.satuan}
                              placeholder="m"
                              onDragStart={(e) => e.preventDefault()}
                              onPaste={(e) => handleBoqCellPaste(e, idx)}
                              onMouseDown={(e) => {
                                if (e.button === 0) {
                                  setBoqIsDragging(true);
                                  setBoqSelection({ startRow: idx, startCol: 2, endRow: idx, endCol: 2 });
                                }
                              }}
                              onFocus={(e) => {
                                if (!boqIsDragging) {
                                  setBoqSelection({ startRow: idx, startCol: 2, endRow: idx, endCol: 2 });
                                  e.target.select();
                                }
                              }}
                              onKeyDown={(e) => handleGridKeyDown(e, 'boq', idx, 2, 4)}
                              onChange={(e) => updateBoqCell(idx, 2, e.target.value)}
                              className={`w-full h-8 px-2 text-xs text-center border-none focus:outline-none bg-transparent focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:z-10 text-slate-700 ${
                                boqIsDragging ? 'pointer-events-none select-none' : ''
                              }`}
                            />
                          </td>

                          {/* Column D: Install */}
                          <td
                            className={`p-0 border-r border-slate-300 transition-colors relative cursor-cell select-none ${
                              isBoqCellSelected(idx, 3)
                                ? 'bg-blue-100 ring-2 ring-blue-500 ring-inset z-10 font-bold'
                                : 'bg-emerald-50/20'
                            }`}
                            onMouseDown={(e) => {
                              if (e.button === 0) {
                                setBoqIsDragging(true);
                                setBoqSelection({ startRow: idx, startCol: 3, endRow: idx, endCol: 3 });
                              }
                            }}
                            onMouseEnter={() => {
                              if (boqIsDragging && boqSelection) {
                                setBoqSelection((prev) => (prev ? { ...prev, endRow: idx, endCol: 3 } : null));
                              }
                            }}
                          >
                            <input
                              type="text"
                              inputMode="numeric"
                              id={`boq-cell-${idx}-3`}
                              value={b.install ?? 0}
                              placeholder="0"
                              onDragStart={(e) => e.preventDefault()}
                              onPaste={(e) => handleBoqCellPaste(e, idx)}
                              onMouseDown={(e) => {
                                if (e.button === 0) {
                                  setBoqIsDragging(true);
                                  setBoqSelection({ startRow: idx, startCol: 3, endRow: idx, endCol: 3 });
                                }
                              }}
                              onFocus={(e) => {
                                if (!boqIsDragging) {
                                  setBoqSelection({ startRow: idx, startCol: 3, endRow: idx, endCol: 3 });
                                  e.target.select();
                                }
                              }}
                              onKeyDown={(e) => handleGridKeyDown(e, 'boq', idx, 3, 4)}
                              onChange={(e) => updateBoqCell(idx, 3, e.target.value)}
                              className={`w-full h-8 px-2 text-xs text-center font-mono font-bold text-slate-900 border-none focus:outline-none bg-emerald-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:z-10 ${
                                boqIsDragging ? 'pointer-events-none select-none' : ''
                              }`}
                            />
                          </td>

                          {/* Action Del */}
                          <td className="py-0 px-1 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  boqItems: (prev.boqItems || []).filter((_, i) => i !== idx),
                                }));
                                setBoqSelection(null);
                              }}
                              className="text-slate-400 hover:text-red-600 p-1"
                              title="Hapus baris ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Tips Copas Excel Footer */}
                <div className="bg-emerald-50 border-t border-slate-300 px-3.5 py-2.5 text-[11px] text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold shrink-0">💡 Navigasi Cepat & Excel:</span>
                    <span>
                      Gunakan tombol panah <strong>← ↑ ↓ →</strong>, <strong>Enter</strong>, dan <strong>Tab</strong> pada keyboard untuk langsung berpindah antar cell tanpa perlu klik mouse! Tekan <strong>Ctrl+C</strong> untuk salin blok, <strong>Del</strong> untuk mengosongkan nilai, atau gunakan <strong>📋 Paste dari Excel</strong> di atas untuk impor puluhan baris sekaligus.
                    </span>
                  </div>
                </div>
              </div>

              {/* BOM Items - Excel Grid */}
              <div className="bg-white border-2 border-emerald-800/30 rounded-xl shadow-xs overflow-hidden">
                {/* Excel Toolbar */}
                <div className="bg-emerald-800 text-white p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-300 shrink-0" />
                    <div>
                      <div className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                        <span>Jenis Material (BOM) · Format Cell Excel</span>
                        <span className="text-[10px] font-mono bg-emerald-700 text-emerald-100 px-2 py-0.2 rounded font-normal">
                          {(formData.bomItems || []).length} Baris
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-100/90">
                        Material utama proyek. Klik <strong>Paste dari Excel</strong> untuk memasukkan material langsung dari dokumen RAB / Logistik.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setExcelModalTarget('bom');
                        setExcelPasteRawText('');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                      title="Salin (Ctrl+C) data dari Excel lalu tempel ke sini"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" />
                      <span>📋 Paste dari Excel</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyBomToClipboard}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-semibold transition-colors"
                      title="Salin seluruh baris tabel BOM ke clipboard (format Excel TSV)"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin ke Excel</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const len = (formData.bomItems || []).length;
                        if (len > 0) setBomSelection({ startRow: 0, startCol: 0, endRow: len - 1, endCol: 3 });
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-semibold transition-colors"
                      title="Block seluruh tabel BOM (bisa disalin atau dihapus sekaligus)"
                    >
                      <span>⬛ Block Semua</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddBomRows(1)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+1 Baris</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddBomRows(5)}
                      className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors"
                      title="Tambah 5 baris kosong sekaligus"
                    >
                      <span>+5 Baris</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Kosongkan semua baris BOM?')) {
                          setFormData((prev) => ({ ...prev, bomItems: [] }));
                          setBomSelection(null);
                        }
                      }}
                      className="px-2 py-1.5 text-emerald-200 hover:text-white hover:bg-red-600/30 rounded text-xs"
                      title="Hapus semua baris"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Selection Action Bar for BOM */}
                {bomSelection && (() => {
                  const { minR, maxR, minC, maxC } = getRangeBounds(bomSelection);
                  const totalCells = (maxR - minR + 1) * (maxC - minC + 1);
                  const colLabels = ['A · Kode', 'B · Material', 'C · Satuan', 'D · Install'];
                  return (
                    <div className="bg-blue-700 text-white px-3 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-blue-800 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="bg-white text-blue-900 font-mono font-bold px-2 py-0.5 rounded text-[11px] shadow-xs">
                          🟦 {totalCells} Sel Diblock
                        </span>
                        <span className="text-blue-100 text-[11px]">
                          Baris {minR + 1} s/d {maxR + 1} · Kolom {colLabels[minC]} s/d {colLabels[maxC]}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleCopyBomSelection}
                          className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-900 rounded font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
                          title="Salin sel yang diblock ke clipboard (Ctrl+C)"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Salin Pilihan (Ctrl+C)</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteBomSelection}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
                          title="Kosongkan sel yang diblock (Delete)"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Hapus Nilai (Del)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBomSelection(null)}
                          className="px-2 py-1 text-blue-100 hover:text-white hover:bg-blue-800 rounded text-xs transition-colors"
                        >
                          ✕ Batal Block
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Excel Table Grid */}
                <div className="overflow-x-auto bg-slate-50">
                  <table className="w-full text-xs text-left border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-200 text-slate-700 font-mono text-[11px] font-bold select-none border-b border-slate-300">
                        {/* Select All Corner */}
                        <th
                          onClick={() => {
                            const len = (formData.bomItems || []).length;
                            if (len > 0) setBomSelection({ startRow: 0, startCol: 0, endRow: len - 1, endCol: 3 });
                          }}
                          className="py-1 px-2 w-10 text-center border-r border-slate-300 bg-slate-300 hover:bg-blue-200 cursor-pointer select-none transition-colors"
                          title="Klik untuk block seluruh tabel BOM"
                        >
                          #
                        </th>

                        {/* Column A Header */}
                        <th
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const len = (formData.bomItems || []).length;
                            if (len > 0) {
                              setBomIsDragging(true);
                              setBomSelection({ startRow: 0, startCol: 0, endRow: len - 1, endCol: 0 });
                            }
                          }}
                          onMouseEnter={() => {
                            if (bomIsDragging && bomSelection) {
                              setBomSelection((prev) => (prev ? { ...prev, endCol: 0 } : null));
                            }
                          }}
                          className={`py-1.5 px-3 w-28 border-r border-slate-300 cursor-pointer select-none hover:bg-blue-100 transition-colors ${
                            bomSelection && getRangeBounds(bomSelection).minC <= 0 && getRangeBounds(bomSelection).maxC >= 0
                              ? 'bg-blue-200 text-blue-950 font-black'
                              : ''
                          }`}
                          title="Klik atau seret untuk block seluruh kolom A"
                        >
                          A · Kode Material
                        </th>

                        {/* Column B Header */}
                        <th
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const len = (formData.bomItems || []).length;
                            if (len > 0) {
                              setBomIsDragging(true);
                              setBomSelection({ startRow: 0, startCol: 1, endRow: len - 1, endCol: 1 });
                            }
                          }}
                          onMouseEnter={() => {
                            if (bomIsDragging && bomSelection) {
                              setBomSelection((prev) => (prev ? { ...prev, endCol: 1 } : null));
                            }
                          }}
                          className={`py-1.5 px-3 border-r border-slate-300 cursor-pointer select-none hover:bg-blue-100 transition-colors ${
                            bomSelection && getRangeBounds(bomSelection).minC <= 1 && getRangeBounds(bomSelection).maxC >= 1
                              ? 'bg-blue-200 text-blue-950 font-black'
                              : ''
                          }`}
                          title="Klik atau seret untuk block seluruh kolom B"
                        >
                          B · Jenis Material
                        </th>

                        {/* Column C Header */}
                        <th
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const len = (formData.bomItems || []).length;
                            if (len > 0) {
                              setBomIsDragging(true);
                              setBomSelection({ startRow: 0, startCol: 2, endRow: len - 1, endCol: 2 });
                            }
                          }}
                          onMouseEnter={() => {
                            if (bomIsDragging && bomSelection) {
                              setBomSelection((prev) => (prev ? { ...prev, endCol: 2 } : null));
                            }
                          }}
                          className={`py-1.5 px-3 w-28 text-center border-r border-slate-300 cursor-pointer select-none hover:bg-blue-100 transition-colors ${
                            bomSelection && getRangeBounds(bomSelection).minC <= 2 && getRangeBounds(bomSelection).maxC >= 2
                              ? 'bg-blue-200 text-blue-950 font-black'
                              : ''
                          }`}
                          title="Klik atau seret untuk block seluruh kolom C"
                        >
                          C · Satuan
                        </th>

                        {/* Column D Header */}
                        <th
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const len = (formData.bomItems || []).length;
                            if (len > 0) {
                              setBomIsDragging(true);
                              setBomSelection({ startRow: 0, startCol: 3, endRow: len - 1, endCol: 3 });
                            }
                          }}
                          onMouseEnter={() => {
                            if (bomIsDragging && bomSelection) {
                              setBomSelection((prev) => (prev ? { ...prev, endCol: 3 } : null));
                            }
                          }}
                          className={`py-1.5 px-3 w-32 text-center border-r border-slate-300 cursor-pointer select-none hover:bg-blue-100 transition-colors bg-emerald-100/60 text-emerald-950 font-black ${
                            bomSelection && getRangeBounds(bomSelection).minC <= 3 && getRangeBounds(bomSelection).maxC >= 3
                              ? '!bg-blue-200 !text-blue-950'
                              : ''
                          }`}
                          title="Klik atau seret untuk block seluruh kolom D"
                        >
                          D · Install / Terpakai
                        </th>
                        <th className="py-1 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {(formData.bomItems || []).map((m, idx) => (
                        <tr key={m.id || idx} className="hover:bg-slate-50/50">
                          {/* Row Number Header (Click to block row) */}
                          <td
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setBomIsDragging(true);
                              setBomSelection({ startRow: idx, startCol: 0, endRow: idx, endCol: 3 });
                            }}
                            onMouseEnter={() => {
                              if (bomIsDragging && bomSelection) {
                                setBomSelection((prev) => (prev ? { ...prev, endRow: idx, endCol: 3 } : null));
                              }
                            }}
                            className={`py-0 px-2 text-center font-mono text-[11px] font-semibold border-r border-slate-300 select-none cursor-pointer transition-colors ${
                              bomSelection &&
                              idx >= getRangeBounds(bomSelection).minR &&
                              idx <= getRangeBounds(bomSelection).maxR
                                ? 'bg-blue-200 text-blue-950 font-bold'
                                : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                            }`}
                            title={`Klik atau seret untuk block baris ${idx + 1}`}
                          >
                            {idx + 1}
                          </td>

                          {/* Column A: Kode Material */}
                          <td
                            className={`p-0 border-r border-slate-300 transition-colors relative cursor-cell select-none ${
                              isBomCellSelected(idx, 0)
                                ? 'bg-blue-100 ring-2 ring-blue-500 ring-inset z-10 font-bold'
                                : ''
                            }`}
                            onMouseDown={(e) => {
                              if (e.button === 0) {
                                setBomIsDragging(true);
                                setBomSelection({ startRow: idx, startCol: 0, endRow: idx, endCol: 0 });
                              }
                            }}
                            onMouseEnter={() => {
                              if (bomIsDragging && bomSelection) {
                                setBomSelection((prev) => (prev ? { ...prev, endRow: idx, endCol: 0 } : null));
                              }
                            }}
                          >
                            <input
                              type="text"
                              id={`bom-cell-${idx}-0`}
                              value={m.kode !== undefined && m.kode !== null ? m.kode : '0'}
                              placeholder="0"
                              onDragStart={(e) => e.preventDefault()}
                              onPaste={(e) => handleBomCellPaste(e, idx)}
                              onMouseDown={(e) => {
                                if (e.button === 0) {
                                  setBomIsDragging(true);
                                  setBomSelection({ startRow: idx, startCol: 0, endRow: idx, endCol: 0 });
                                }
                              }}
                              onFocus={(e) => {
                                if (!bomIsDragging) {
                                  setBomSelection({ startRow: idx, startCol: 0, endRow: idx, endCol: 0 });
                                  e.target.select();
                                }
                              }}
                              onKeyDown={(e) => handleGridKeyDown(e, 'bom', idx, 0, 4)}
                              onChange={(e) => updateBomCell(idx, 0, e.target.value === '' ? '0' : e.target.value)}
                              className={`w-full h-8 px-2 text-xs font-mono font-bold border-none focus:outline-none bg-transparent focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:z-10 text-slate-900 ${
                                bomIsDragging ? 'pointer-events-none select-none' : ''
                              }`}
                            />
                          </td>

                          {/* Column B: Jenis Material */}
                          <td
                            className={`p-0 border-r border-slate-300 transition-colors relative cursor-cell select-none ${
                              isBomCellSelected(idx, 1)
                                ? 'bg-blue-100 ring-2 ring-blue-500 ring-inset z-10 font-bold'
                                : ''
                            }`}
                            onMouseDown={(e) => {
                              if (e.button === 0) {
                                setBomIsDragging(true);
                                setBomSelection({ startRow: idx, startCol: 1, endRow: idx, endCol: 1 });
                              }
                            }}
                            onMouseEnter={() => {
                              if (bomIsDragging && bomSelection) {
                                setBomSelection((prev) => (prev ? { ...prev, endRow: idx, endCol: 1 } : null));
                              }
                            }}
                          >
                            <input
                              type="text"
                              id={`bom-cell-${idx}-1`}
                              value={m.jenisMaterial}
                              placeholder="Nama jenis material..."
                              onDragStart={(e) => e.preventDefault()}
                              onPaste={(e) => handleBomCellPaste(e, idx)}
                              onMouseDown={(e) => {
                                if (e.button === 0) {
                                  setBomIsDragging(true);
                                  setBomSelection({ startRow: idx, startCol: 1, endRow: idx, endCol: 1 });
                                }
                              }}
                              onFocus={(e) => {
                                if (!bomIsDragging) {
                                  setBomSelection({ startRow: idx, startCol: 1, endRow: idx, endCol: 1 });
                                  e.target.select();
                                }
                              }}
                              onKeyDown={(e) => handleGridKeyDown(e, 'bom', idx, 1, 4)}
                              onChange={(e) => updateBomCell(idx, 1, e.target.value)}
                              className={`w-full h-8 px-2 text-xs border-none focus:outline-none bg-transparent focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:z-10 text-slate-800 ${
                                bomIsDragging ? 'pointer-events-none select-none' : ''
                              }`}
                            />
                          </td>

                          {/* Column C: Satuan */}
                          <td
                            className={`p-0 border-r border-slate-300 transition-colors relative cursor-cell select-none ${
                              isBomCellSelected(idx, 2)
                                ? 'bg-blue-100 ring-2 ring-blue-500 ring-inset z-10 font-bold'
                                : ''
                            }`}
                            onMouseDown={(e) => {
                              if (e.button === 0) {
                                setBomIsDragging(true);
                                setBomSelection({ startRow: idx, startCol: 2, endRow: idx, endCol: 2 });
                              }
                            }}
                            onMouseEnter={() => {
                              if (bomIsDragging && bomSelection) {
                                setBomSelection((prev) => (prev ? { ...prev, endRow: idx, endCol: 2 } : null));
                              }
                            }}
                          >
                            <input
                              type="text"
                              id={`bom-cell-${idx}-2`}
                              value={m.satuan}
                              placeholder="unit"
                              onDragStart={(e) => e.preventDefault()}
                              onPaste={(e) => handleBomCellPaste(e, idx)}
                              onMouseDown={(e) => {
                                if (e.button === 0) {
                                  setBomIsDragging(true);
                                  setBomSelection({ startRow: idx, startCol: 2, endRow: idx, endCol: 2 });
                                }
                              }}
                              onFocus={(e) => {
                                if (!bomIsDragging) {
                                  setBomSelection({ startRow: idx, startCol: 2, endRow: idx, endCol: 2 });
                                  e.target.select();
                                }
                              }}
                              onKeyDown={(e) => handleGridKeyDown(e, 'bom', idx, 2, 4)}
                              onChange={(e) => updateBomCell(idx, 2, e.target.value)}
                              className={`w-full h-8 px-2 text-xs text-center border-none focus:outline-none bg-transparent focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:z-10 text-slate-700 ${
                                bomIsDragging ? 'pointer-events-none select-none' : ''
                              }`}
                            />
                          </td>

                          {/* Column D: Install / Terpakai */}
                          <td
                            className={`p-0 border-r border-slate-300 transition-colors relative cursor-cell select-none ${
                              isBomCellSelected(idx, 3)
                                ? 'bg-blue-100 ring-2 ring-blue-500 ring-inset z-10 font-bold'
                                : 'bg-emerald-50/20'
                            }`}
                            onMouseDown={(e) => {
                              if (e.button === 0) {
                                setBomIsDragging(true);
                                setBomSelection({ startRow: idx, startCol: 3, endRow: idx, endCol: 3 });
                              }
                            }}
                            onMouseEnter={() => {
                              if (bomIsDragging && bomSelection) {
                                setBomSelection((prev) => (prev ? { ...prev, endRow: idx, endCol: 3 } : null));
                              }
                            }}
                          >
                            <input
                              type="text"
                              inputMode="numeric"
                              id={`bom-cell-${idx}-3`}
                              value={m.install ?? 0}
                              placeholder="0"
                              onDragStart={(e) => e.preventDefault()}
                              onPaste={(e) => handleBomCellPaste(e, idx)}
                              onMouseDown={(e) => {
                                if (e.button === 0) {
                                  setBomIsDragging(true);
                                  setBomSelection({ startRow: idx, startCol: 3, endRow: idx, endCol: 3 });
                                }
                              }}
                              onFocus={(e) => {
                                if (!bomIsDragging) {
                                  setBomSelection({ startRow: idx, startCol: 3, endRow: idx, endCol: 3 });
                                  e.target.select();
                                }
                              }}
                              onKeyDown={(e) => handleGridKeyDown(e, 'bom', idx, 3, 4)}
                              onChange={(e) => updateBomCell(idx, 3, e.target.value)}
                              className={`w-full h-8 px-2 text-xs text-center font-mono font-bold text-slate-900 border-none focus:outline-none bg-emerald-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:z-10 ${
                                bomIsDragging ? 'pointer-events-none select-none' : ''
                              }`}
                            />
                          </td>

                          {/* Action Del */}
                          <td className="py-0 px-1 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  bomItems: (prev.bomItems || []).filter((_, i) => i !== idx),
                                }));
                                setBomSelection(null);
                              }}
                              className="text-slate-400 hover:text-red-600 p-1"
                              title="Hapus baris ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Tips Copas Excel Footer */}
                <div className="bg-emerald-50 border-t border-slate-300 px-3.5 py-2.5 text-[11px] text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold shrink-0">💡 Navigasi Cepat & Excel:</span>
                    <span>
                      Gunakan tombol panah <strong>← ↑ ↓ →</strong>, <strong>Enter</strong>, dan <strong>Tab</strong> pada keyboard untuk langsung berpindah antar cell tanpa perlu klik mouse! Tekan <strong>Ctrl+C</strong> untuk salin blok, <strong>Del</strong> untuk mengosongkan nilai, atau gunakan <strong>📋 Paste dari Excel</strong> di atas untuk impor puluhan baris sekaligus.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: FOTO BER-WATERMARK */}
          {contractorSection === 'photos' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-slate-700" />
                    <span>Dokumentasi Foto Lapangan</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lampirkan foto dokumentasi visual pekerjaan fisik di lapangan secara langsung. Foto akan otomatis dilampirkan pada laporan dan tertera pada PDF unduhan.
                  </p>
                </div>

                <label className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs">
                  <Camera className="w-4 h-4" />
                  <span>{isUploadingPhoto ? 'Memproses Foto...' : 'Ambil / Upload Foto (Bisa Pilih Sekaligus)'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    disabled={isUploadingPhoto}
                    className="hidden"
                  />
                </label>
              </div>

              {formData.photos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {formData.photos.map((photo, pIdx) => (
                    <div key={photo.id || pIdx} className="border border-slate-200 rounded-lg p-2.5 space-y-2 bg-slate-50">
                      <div className="relative aspect-4/3 rounded overflow-hidden bg-slate-900">
                        <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              photos: prev.photos.filter((_, i) => i !== pIdx),
                            }));
                          }}
                          className="absolute top-2 right-2 p-1 bg-red-600/90 hover:bg-red-700 text-white rounded-md shadow"
                          title="Hapus foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                          Keterangan / Caption Foto:
                        </label>
                        <input
                          type="text"
                          value={photo.caption}
                          placeholder="Kosong (opsional diisi)..."
                          onChange={(e) => {
                            const copy = [...formData.photos];
                            copy[pIdx] = { ...copy[pIdx], caption: e.target.value };
                            setFormData((prev) => ({ ...prev, photos: copy }));
                          }}
                          className="w-full text-xs px-2 py-1 border border-slate-300 rounded bg-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 border border-dashed border-slate-300 rounded-lg text-center space-y-2">
                  <Camera className="w-8 h-8 text-slate-400 mx-auto" />
                  <div className="text-xs font-semibold text-slate-700">Belum ada foto dokumentasi terlampir</div>
                  <p className="text-[11px] text-slate-500">Klik tombol di atas untuk memilih dan mengupload beberapa foto sekaligus.</p>
                </div>
              )}
            </div>
          )}

          {/* SECTION 5: DETAIL DATA & TANDA TANGAN */}
          {contractorSection === 'general' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Detail Data Form */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
                    Detail Data
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Nama Paket Pekerjaan:</label>
                      <input
                        type="text"
                        value={project.name}
                        readOnly
                        className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded text-slate-700 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Lokasi Proyek:</label>
                      <input
                        type="text"
                        value={project.location}
                        readOnly
                        className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded text-slate-700 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Kontraktor Pelaksana:</label>
                      <input
                        type="text"
                        value={project.contractorName}
                        readOnly
                        className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded text-slate-700 font-semibold"
                      />
                    </div>

                    {/* Catatan Lapangan Field */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Catatan Lapangan (Kolom Catatan Dokumen):</label>
                      <textarea
                        rows={3}
                        value={formData.notes ?? formData.generalNotes ?? ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value, generalNotes: e.target.value }))}
                        placeholder="Pekerjaan dilaksanakan sesuai dengan jadwal dan instruksi pengawas lapangan."
                        className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">Catatan ini akan tampil pada kotak Catatan di sebelah daftar hadir dokumen cetak.</p>
                    </div>
                  </div>
                </div>

                {/* Form Edit SPV & HSE */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
                    Pengawas Lapangan (SPV & HSE)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Edit nama, jabatan, dan instansi/perusahaan untuk Supervisor dan HSE Officer pada daftar hadir laporan.
                  </p>

                  <div className="space-y-4 text-xs">
                    {/* SPV Form */}
                    {(() => {
                      const spv = (formData.attendees && formData.attendees[0]) || DEFAULT_ATTENDEES[0];
                      return (
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                            <span>Supervisor (SPV)</span>
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-0.5">Nama Lengkap:</label>
                              <input
                                type="text"
                                value={spv.nama || spv.name || ''}
                                onChange={(e) => {
                                  const atts = [...(formData.attendees && formData.attendees.length > 0 ? formData.attendees : DEFAULT_ATTENDEES)];
                                  atts[0] = { ...atts[0], nama: e.target.value, name: e.target.value };
                                  setFormData((prev) => ({ ...prev, attendees: atts }));
                                }}
                                className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-xs"
                                placeholder="Nama SPV..."
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-0.5">Jabatan:</label>
                              <input
                                type="text"
                                value={spv.jabatan || spv.position || ''}
                                onChange={(e) => {
                                  const atts = [...(formData.attendees && formData.attendees.length > 0 ? formData.attendees : DEFAULT_ATTENDEES)];
                                  atts[0] = { ...atts[0], jabatan: e.target.value, position: e.target.value };
                                  setFormData((prev) => ({ ...prev, attendees: atts }));
                                }}
                                className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-xs"
                                placeholder="Supervisor"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-0.5">Instansi / Perusahaan:</label>
                              <input
                                type="text"
                                value={spv.instansi || spv.company || ''}
                                onChange={(e) => {
                                  const atts = [...(formData.attendees && formData.attendees.length > 0 ? formData.attendees : DEFAULT_ATTENDEES)];
                                  atts[0] = { ...atts[0], instansi: e.target.value, company: e.target.value };
                                  setFormData((prev) => ({ ...prev, attendees: atts }));
                                }}
                                className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-xs"
                                placeholder="Nama Instansi..."
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* HSE Form */}
                    {(() => {
                      const hse = (formData.attendees && formData.attendees[1]) || DEFAULT_ATTENDEES[1];
                      return (
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                            <span>HSE Officer</span>
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-0.5">Nama Lengkap:</label>
                              <input
                                type="text"
                                value={hse.nama || hse.name || ''}
                                onChange={(e) => {
                                  const atts = [...(formData.attendees && formData.attendees.length > 0 ? formData.attendees : DEFAULT_ATTENDEES)];
                                  while (atts.length < 2) {
                                    atts.push(DEFAULT_ATTENDEES[atts.length] || { id: `att-${Date.now()}`, nama: '', jabatan: 'HSE', instansi: '' });
                                  }
                                  atts[1] = { ...atts[1], nama: e.target.value, name: e.target.value };
                                  setFormData((prev) => ({ ...prev, attendees: atts }));
                                }}
                                className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-xs"
                                placeholder="Nama HSE..."
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-0.5">Jabatan:</label>
                              <input
                                type="text"
                                value={hse.jabatan || hse.position || ''}
                                onChange={(e) => {
                                  const atts = [...(formData.attendees && formData.attendees.length > 0 ? formData.attendees : DEFAULT_ATTENDEES)];
                                  while (atts.length < 2) {
                                    atts.push(DEFAULT_ATTENDEES[atts.length] || { id: `att-${Date.now()}`, nama: '', jabatan: 'HSE', instansi: '' });
                                  }
                                  atts[1] = { ...atts[1], jabatan: e.target.value, position: e.target.value };
                                  setFormData((prev) => ({ ...prev, attendees: atts }));
                                }}
                                className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-xs"
                                placeholder="HSE Officer"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-0.5">Instansi / Perusahaan:</label>
                              <input
                                type="text"
                                value={hse.instansi || hse.company || ''}
                                onChange={(e) => {
                                  const atts = [...(formData.attendees && formData.attendees.length > 0 ? formData.attendees : DEFAULT_ATTENDEES)];
                                  while (atts.length < 2) {
                                    atts.push(DEFAULT_ATTENDEES[atts.length] || { id: `att-${Date.now()}`, nama: '', jabatan: 'HSE', instansi: '' });
                                  }
                                  atts[1] = { ...atts[1], instansi: e.target.value, company: e.target.value };
                                  setFormData((prev) => ({ ...prev, attendees: atts }));
                                }}
                                className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-xs"
                                placeholder="Nama Instansi..."
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Signatories Setup - Template Kiri ke Kanan: Diajukan Oleh (PM Kontraktor) -> Disetujui Oleh (PM Opsco) -> Disetujui Oleh (Plant Manager Opsco) */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Penandatangan Dokumen (Kiri ke Kanan)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Urutan dan informasi penandatangan dapat disesuaikan nama, jabatan, instansi/perusahaan, dan label persetujuan.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Kolom 1 (Kiri): Diajukan Oleh */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">1. Kolom Kiri</span>
                      <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold">
                        Kontraktor
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Label Aksi:</label>
                      <input
                        type="text"
                        value={formData.contractorSignatory?.actionLabel || 'Diajukan Oleh'}
                        onChange={(e) => {
                          setFormData((prev) => ({
                            ...prev,
                            contractorSignatory: {
                              ...(prev.contractorSignatory || DEFAULT_SIGNATORIES.contractor),
                              actionLabel: e.target.value,
                            },
                          }));
                        }}
                        className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
                        placeholder="Diajukan Oleh"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Perusahaan / Instansi:</label>
                      <input
                        type="text"
                        value={formData.contractorSignatory?.companyName || ''}
                        onChange={(e) => {
                          setFormData((prev) => ({
                            ...prev,
                            contractorSignatory: {
                              ...(prev.contractorSignatory || DEFAULT_SIGNATORIES.contractor),
                              companyName: e.target.value,
                            },
                          }));
                        }}
                        className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
                        placeholder="Nama PT / Instansi..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Nama Lengkap:</label>
                      <input
                        type="text"
                        value={formData.contractorSignatory?.signedBy || ''}
                        onChange={(e) => {
                          setFormData((prev) => ({
                            ...prev,
                            contractorSignatory: {
                              ...(prev.contractorSignatory || DEFAULT_SIGNATORIES.contractor),
                              signedBy: e.target.value,
                            },
                          }));
                        }}
                        className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
                        placeholder="Nama Penandatangan..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Jabatan:</label>
                      <input
                        type="text"
                        value={formData.contractorSignatory?.title || ''}
                        onChange={(e) => {
                          setFormData((prev) => ({
                            ...prev,
                            contractorSignatory: {
                              ...(prev.contractorSignatory || DEFAULT_SIGNATORIES.contractor),
                              title: e.target.value,
                            },
                          }));
                        }}
                        className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
                        placeholder="Jabatan..."
                      />
                    </div>
                  </div>

                  {/* Kolom 2 (Tengah): Disetujui Oleh (PM Opsco) */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">2. Kolom Tengah</span>
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold">
                        PM Opsco
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Label Aksi:</label>
                      <input
                        type="text"
                        value={formData.consultantSignatory?.actionLabel || 'Disetujui Oleh'}
                        onChange={(e) => {
                          setFormData((prev) => ({
                            ...prev,
                            consultantSignatory: {
                              ...(prev.consultantSignatory || DEFAULT_SIGNATORIES.consultant),
                              actionLabel: e.target.value,
                            },
                          }));
                        }}
                        className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
                        placeholder="Disetujui Oleh"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Perusahaan / Instansi:</label>
                      <input
                        type="text"
                        value={formData.consultantSignatory?.companyName || ''}
                        onChange={(e) => {
                          setFormData((prev) => ({
                            ...prev,
                            consultantSignatory: {
                              ...(prev.consultantSignatory || DEFAULT_SIGNATORIES.consultant),
                              companyName: e.target.value,
                            },
                          }));
                        }}
                        className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
                        placeholder="Nama PT / Instansi..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Nama Lengkap:</label>
                      <input
                        type="text"
                        value={formData.consultantSignatory?.signedBy || ''}
                        onChange={(e) => {
                          setFormData((prev) => ({
                            ...prev,
                            consultantSignatory: {
                              ...(prev.consultantSignatory || DEFAULT_SIGNATORIES.consultant),
                              signedBy: e.target.value,
                            },
                          }));
                        }}
                        className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
                        placeholder="Nama Penandatangan..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Jabatan:</label>
                      <input
                        type="text"
                        value={formData.consultantSignatory?.title || ''}
                        onChange={(e) => {
                          setFormData((prev) => ({
                            ...prev,
                            consultantSignatory: {
                              ...(prev.consultantSignatory || DEFAULT_SIGNATORIES.consultant),
                              title: e.target.value,
                            },
                          }));
                        }}
                        className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
                        placeholder="Jabatan..."
                      />
                    </div>
                  </div>

                  {/* Kolom 3 (Kanan): Disetujui Oleh (Plant Manager Opsco) */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">3. Kolom Kanan</span>
                      <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-semibold">
                        Plant Manager Opsco
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Label Aksi:</label>
                      <input
                        type="text"
                        value={formData.pmoSignatory?.actionLabel || 'Disetujui Oleh'}
                        onChange={(e) => {
                          setFormData((prev) => ({
                            ...prev,
                            pmoSignatory: {
                              ...(prev.pmoSignatory || DEFAULT_SIGNATORIES.pmo),
                              actionLabel: e.target.value,
                            },
                          }));
                        }}
                        className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
                        placeholder="Disetujui Oleh"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Perusahaan / Instansi:</label>
                      <input
                        type="text"
                        value={formData.pmoSignatory?.companyName || ''}
                        onChange={(e) => {
                          setFormData((prev) => ({
                            ...prev,
                            pmoSignatory: {
                              ...(prev.pmoSignatory || DEFAULT_SIGNATORIES.pmo),
                              companyName: e.target.value,
                            },
                          }));
                        }}
                        className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
                        placeholder="Nama PT / Instansi..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Nama Lengkap:</label>
                      <input
                        type="text"
                        value={formData.pmoSignatory?.signedBy || ''}
                        onChange={(e) => {
                          setFormData((prev) => ({
                            ...prev,
                            pmoSignatory: {
                              ...(prev.pmoSignatory || DEFAULT_SIGNATORIES.pmo),
                              signedBy: e.target.value,
                            },
                          }));
                        }}
                        className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
                        placeholder="Nama Penandatangan..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">Jabatan:</label>
                      <input
                        type="text"
                        value={formData.pmoSignatory?.title || ''}
                        onChange={(e) => {
                          setFormData((prev) => ({
                            ...prev,
                            pmoSignatory: {
                              ...(prev.pmoSignatory || DEFAULT_SIGNATORIES.pmo),
                              title: e.target.value,
                            },
                          }));
                        }}
                        className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
                        placeholder="Jabatan..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Symmetrical Bottom Save & Submit Bar for Contractor */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 mt-6">
        <div className="text-center sm:text-left">
          <div className="text-xs font-bold text-slate-900 flex items-center gap-2 justify-center sm:justify-start">
            <span>Status: {formData.approvalStatus === 'approved' ? 'Telah Disetujui PMO' : formData.approvalStatus === 'needs_revision' ? 'Perlu Revisi' : 'Draft Kontraktor'}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-100 text-slate-600">
              {formData.reportDate}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Laporan harian dapat disimpan sebagai draft atau dikirim langsung ke PMO setelah seluruh data lengkap.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
          {saveSuccessMsg && (
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              onSaveReport(formData);
              setSaveSuccessMsg('✓ Laporan tersimpan & tersinkron ke Supabase');
              setTimeout(() => setSaveSuccessMsg(''), 4000);
            }}
            className="flex-1 sm:flex-initial px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-center cursor-pointer"
          >
            Simpan Draft
          </button>

          {formData.approvalStatus !== 'approved' && (
            <button
              type="button"
              onClick={handleSubmitToPmo}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim Laporan Resmi ke PMO</span>
            </button>
          )}
        </div>
      </div>

      {/* Excel Paste Modal */}
      {excelModalTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Paste Data Excel ke {
                      excelModalTarget === 'boq' ? 'BOQ (Pekerjaan)' :
                      excelModalTarget === 'bom' ? 'BOM (Material)' :
                      excelModalTarget === 'manpower' ? 'Tenaga Kerja (Manpower)' :
                      'Peralatan (Equipment)'
                    }
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Salin baris & kolom dari Excel / Google Sheets lalu tempel (Ctrl+V) di area bawah
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setExcelModalTarget(null)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Area Tempel (Paste Clipboard):
                </label>
                <span className="text-[10px] text-slate-500">
                  {excelModalTarget === 'boq'
                    ? 'Format: Kode | Uraian Pekerjaan | Satuan | Install'
                    : excelModalTarget === 'bom'
                    ? 'Format: Kode Material | Jenis Material | Satuan | Terpakai'
                    : excelModalTarget === 'manpower'
                    ? 'Format: Tenaga Kerja / Posisi | Jumlah Orang | Jam Kerja'
                    : 'Format: Nama Peralatan | Jumlah Unit | Stok | Kondisi'}
                </span>
              </div>
              <textarea
                rows={5}
                value={excelPasteRawText}
                onChange={(e) => setExcelPasteRawText(e.target.value)}
                placeholder={
                  excelModalTarget === 'boq'
                    ? "Contoh copy dari Excel:\n1.01\tPembersihan Lokasi\tm2\t100\n1.02\tGalian Tanah Pondasi\tm3\t45\n1.03\tUrugan Pasir Bawah Pondasi\tm3\t12"
                    : excelModalTarget === 'bom'
                    ? "Contoh copy dari Excel:\nM-01\tSemen Portland Type 1\tsak\t150\nM-02\tPasir Pasang Pasang\tm3\t12\nM-03\tBesi Beton D16 Ulir\tbtg\t80"
                    : excelModalTarget === 'manpower'
                    ? "Contoh copy dari Excel:\nMandor Lapangan\t2\t8\nTukang Batu / Pasang\t8\t8\nTukang Besi / Pembesian\t6\t8\nPekerja Kasar / Helper\t14\t8"
                    : "Contoh copy dari Excel:\nExcavator PC200\t2\t0\tOperating\nDump Truck 10 Roda\t4\t1\tOperating\nBar Bender & Cutter\t2\t0\tOperating"
                }
                className="w-full text-xs font-mono p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-slate-50"
                autoFocus
              />
            </div>

            {/* Mode: Replace or Append */}
            <div className="flex items-center gap-4 text-xs font-medium text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="text-slate-500 text-[11px]">Tindakan:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="excelPasteMode"
                  checked={excelPasteMode === 'replace'}
                  onChange={() => setExcelPasteMode('replace')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Ganti semua baris yang ada</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="excelPasteMode"
                  checked={excelPasteMode === 'append'}
                  onChange={() => setExcelPasteMode('append')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Tambahkan ke baris paling bawah</span>
              </label>
            </div>

            {/* Live Preview if text is present */}
            {excelPasteRawText.trim() && (
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-slate-700">
                  Pratinjau Hasil ({parseClipboardTable(excelPasteRawText).length} baris terdeteksi):
                </div>
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 sticky top-0 border-b border-slate-200 font-semibold">
                      <tr>
                        {excelModalTarget === 'boq' && (
                          <>
                            <th className="py-1 px-2">Kode</th>
                            <th className="py-1 px-2">Uraian Pekerjaan</th>
                            <th className="py-1 px-2">Satuan</th>
                            <th className="py-1 px-2 text-center">Install</th>
                          </>
                        )}
                        {excelModalTarget === 'bom' && (
                          <>
                            <th className="py-1 px-2">Kode</th>
                            <th className="py-1 px-2">Jenis Material</th>
                            <th className="py-1 px-2">Satuan</th>
                            <th className="py-1 px-2 text-center">Install</th>
                          </>
                        )}
                        {excelModalTarget === 'manpower' && (
                          <>
                            <th className="py-1 px-2">No</th>
                            <th className="py-1 px-2">Tenaga Kerja / Posisi</th>
                            <th className="py-1 px-2 text-center">Jumlah Orang</th>
                            <th className="py-1 px-2 text-center">Jam Kerja</th>
                          </>
                        )}
                        {excelModalTarget === 'equipment' && (
                          <>
                            <th className="py-1 px-2">No</th>
                            <th className="py-1 px-2">Nama Peralatan</th>
                            <th className="py-1 px-2 text-center">Jumlah Unit</th>
                            <th className="py-1 px-2 text-center">Status</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {parseClipboardTable(excelPasteRawText).map((item, pIdx) => (
                        <tr key={item.id || pIdx} className="hover:bg-slate-50">
                          {excelModalTarget === 'boq' && (
                            <>
                              <td className="py-1 px-2 font-bold text-slate-800">{item.kode || '-'}</td>
                              <td className="py-1 px-2 font-sans truncate max-w-[220px]">{item.title || '-'}</td>
                              <td className="py-1 px-2">{item.satuan || '-'}</td>
                              <td className="py-1 px-2 text-center font-bold text-emerald-800">{item.install || '-'}</td>
                            </>
                          )}
                          {excelModalTarget === 'bom' && (
                            <>
                              <td className="py-1 px-2 font-bold text-slate-800">{item.kode || '-'}</td>
                              <td className="py-1 px-2 font-sans truncate max-w-[220px]">{item.title || '-'}</td>
                              <td className="py-1 px-2">{item.satuan || '-'}</td>
                              <td className="py-1 px-2 text-center font-bold text-emerald-800">{item.install || '-'}</td>
                            </>
                          )}
                          {excelModalTarget === 'manpower' && (
                            <>
                              <td className="py-1 px-2 font-bold text-slate-500">{pIdx + 1}</td>
                              <td className="py-1 px-2 font-sans font-semibold text-slate-800 truncate max-w-[220px]">{item.title || item.kode || '-'}</td>
                              <td className="py-1 px-2 text-center font-bold text-emerald-800">{parseInt(item.install, 10) || parseInt(item.satuan, 10) || 1} Org</td>
                              <td className="py-1 px-2 text-center text-slate-600">8 Jam</td>
                            </>
                          )}
                          {excelModalTarget === 'equipment' && (
                            <>
                              <td className="py-1 px-2 font-bold text-slate-500">{pIdx + 1}</td>
                              <td className="py-1 px-2 font-sans font-semibold text-slate-800 truncate max-w-[220px]">{item.title || item.kode || '-'}</td>
                              <td className="py-1 px-2 text-center font-bold text-emerald-800">{parseInt(item.install, 10) || parseInt(item.satuan, 10) || 1} Unit</td>
                              <td className="py-1 px-2 text-center text-emerald-700 font-semibold">Operating</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setExcelModalTarget(null)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!excelPasteRawText.trim()}
                onClick={handleApplyExcelPaste}
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
              >
                ✓ Terapkan ke Tabel {
                  excelModalTarget === 'boq' ? 'BOQ' :
                  excelModalTarget === 'bom' ? 'BOM' :
                  excelModalTarget === 'manpower' ? 'Tenaga Kerja' :
                  'Peralatan'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pengaturan & Kustomisasi Pilihan Status Peralatan */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-emerald-800 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-sm">Atur Pilihan Status Peralatan</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="p-1 rounded hover:bg-emerald-700 text-emerald-200 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Kustomisasi daftar pilihan status untuk kolom <strong>Kondisi / Status</strong> pada tabel Peralatan. Anda dapat menambahkan status baru (misal: <em>Dalam Perbaikan, Mobilisasi, Demobilisasi, Rusak Ringan, dsb.</em>) atau menghapus status yang tidak dibutuhkan.
              </p>

              {/* Form Tambah Status Baru */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  + Tambah Pilihan Status Baru
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newStatusInput}
                    onChange={(e) => setNewStatusInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const trimmed = newStatusInput.trim();
                        if (trimmed && !equipmentStatusOptions.includes(trimmed)) {
                          setEquipmentStatusOptions((prev) => [...prev, trimmed]);
                          setNewStatusInput('');
                        }
                      }
                    }}
                    placeholder="Contoh: Dalam Perbaikan, Mobilisasi..."
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={!newStatusInput.trim()}
                    onClick={() => {
                      const trimmed = newStatusInput.trim();
                      if (trimmed && !equipmentStatusOptions.includes(trimmed)) {
                        setEquipmentStatusOptions((prev) => [...prev, trimmed]);
                        setNewStatusInput('');
                      }
                    }}
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-colors shrink-0"
                  >
                    + Tambah
                  </button>
                </div>
              </div>

              {/* Daftar Status Saat Ini */}
              <div>
                <div className="font-bold text-slate-800 mb-2 flex items-center justify-between">
                  <span>Daftar Opsi Status Aktif ({equipmentStatusOptions.length})</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEquipmentStatusOptions([
                        'Baik / Operasi',
                        'Standby di site',
                        'Breakdown / Servis',
                        'Dalam Perbaikan',
                        'Mobilisasi',
                        'Demobilisasi',
                        'Rusak Ringan',
                      ]);
                    }}
                    className="text-[11px] text-emerald-700 hover:underline font-semibold"
                  >
                    Reset ke Default
                  </button>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 divide-y divide-slate-100">
                  {/* Opsi Kosong (Selalu ada) */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      <span className="font-medium text-slate-500 italic">-- Kosong / Belum Ada --</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Default Kosong</span>
                  </div>

                  {/* Presets and Custom Options */}
                  {equipmentStatusOptions.map((opt, idx) => (
                    <div
                      key={opt}
                      className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            opt.toLowerCase().includes('baik') || opt.toLowerCase().includes('operasi')
                              ? 'bg-emerald-500'
                              : opt.toLowerCase().includes('standby')
                              ? 'bg-amber-500'
                              : opt.toLowerCase().includes('breakdown') || opt.toLowerCase().includes('rusak')
                              ? 'bg-red-500'
                              : 'bg-blue-500'
                          }`}
                        />
                        <span className="font-semibold text-slate-800">{opt}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEquipmentStatusOptions((prev) => prev.filter((_, i) => i !== idx));
                        }}
                        className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                        title={`Hapus opsi "${opt}"`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
              >
                ✓ Selesai & Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal before Download */}
      <PdfPreviewModal
        isOpen={showPdfPreviewModal}
        onClose={() => setShowPdfPreviewModal(false)}
        report={formData}
        project={project}
      />
    </div>
  );
};
