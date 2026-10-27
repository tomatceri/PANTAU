import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Check, PenTool } from 'lucide-react';
import { Signature } from '../types';

interface SignaturePadProps {
  label: string;
  defaultName: string;
  defaultTitle: string;
  onSave: (signature: Signature) => void;
  onCancel?: () => void;
  existingSignature?: Signature;
  readOnly?: boolean;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  label,
  defaultName,
  defaultTitle,
  onSave,
  onCancel,
  existingSignature,
  readOnly = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [name, setName] = useState(existingSignature?.signedBy || defaultName);
  const [title, setTitle] = useState(existingSignature?.title || defaultTitle);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-dpi displays
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // If existing signature dataUrl exists, draw it
    if (existingSignature?.signatureDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasDrawn(true);
      };
      img.src = existingSignature.signatureDataUrl;
    }
  }, [existingSignature]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');

    const signature: Signature = {
      signedBy: name.trim() || defaultName,
      title: title.trim() || defaultTitle,
      signatureDataUrl: dataUrl,
      timestamp: new Date().toLocaleString(),
    };
    onSave(signature);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PenTool className="w-4 h-4 text-slate-700" />
          <h4 className="text-sm font-semibold text-slate-900">{label}</h4>
        </div>
        {existingSignature?.timestamp && (
          <span className="text-xs text-slate-500 font-mono">
            Signed: {existingSignature.timestamp}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
          <input
            type="text"
            disabled={readOnly}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            placeholder="Signatory Name"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Designation / Title</label>
          <input
            type="text"
            disabled={readOnly}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            placeholder="Official Title"
          />
        </div>
      </div>

      {/* Canvas Area */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-500">
            {readOnly ? 'Verified E-Signature Stamp' : 'Sign here with finger or mouse:'}
          </span>
          {!readOnly && (
            <button
              type="button"
              onClick={clearCanvas}
              className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <Eraser className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
        <div className="relative border border-dashed border-slate-300 rounded-md bg-slate-50/50 overflow-hidden">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className={`w-full h-28 touch-none ${readOnly ? 'cursor-default' : 'cursor-crosshair'}`}
          />
          {!hasDrawn && !readOnly && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-medium">
              Draw Signature Here
            </div>
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="flex items-center justify-end gap-2 pt-1">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Apply Signature
          </button>
        </div>
      )}
    </div>
  );
};
