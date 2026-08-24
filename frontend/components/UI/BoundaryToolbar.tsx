'use client';
import React from 'react';
import { Shield, Scan, Trash2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useMineStore } from '../../store/useMineStore';

export const BoundaryToolbar: React.FC = () => {
  const {
    drawingMode,
    setDrawingMode,
    leaseBoundary,
    clearLeaseBoundary,
    encroachmentResult,
    isCheckingBoundary
  } = useMineStore();

  return (
    <div className="absolute top-4 left-16 z-[1000] flex items-center gap-2 p-1.5 bg-dark-900/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl">
      {/* Mode Switcher Buttons */}
      <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
        <button
          onClick={() => setDrawingMode('roi')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            drawingMode === 'roi'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <Scan className="w-3.5 h-3.5" />
          <span>Scan ROI Mode</span>
        </button>

        <button
          onClick={() => setDrawingMode('boundary')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            drawingMode === 'boundary'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Draw Lease Boundary</span>
        </button>
      </div>

      {/* Boundary Status Pill */}
      {leaseBoundary && (
        <div className="flex items-center gap-2 pl-2 pr-1 border-l border-slate-700/60">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Boundary Active</span>
          </div>

          <button
            onClick={clearLeaseBoundary}
            title="Clear Legal Boundary"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all border border-transparent hover:border-rose-500/30"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Violation Quick Alert Badge */}
      {encroachmentResult && (
        <div className="pl-1 border-l border-slate-700/60">
          {encroachmentResult.violation_detected ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/20 border border-rose-500/50 text-rose-400 rounded-lg text-xs font-bold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Violation ({encroachmentResult.encroached_area.ha} ha)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 rounded-lg text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Compliant</span>
            </div>
          )}
        </div>
      )}

      {isCheckingBoundary && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 text-slate-400 text-xs font-mono animate-pulse">
          <span>Analyzing Geofence...</span>
        </div>
      )}
    </div>
  );
};
