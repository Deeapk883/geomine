'use client';
import React from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, X } from 'lucide-react';
import { useMineStore } from '../../store/useMineStore';

export const EncroachmentAlertHUD: React.FC = () => {
  const { encroachmentResult, setEncroachmentResult } = useMineStore();

  if (!encroachmentResult) return null;

  const isViolation = encroachmentResult.violation_detected;

  return (
    <div className="absolute top-20 right-6 z-[1000] w-80 bg-dark-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-slate-100 font-sans transition-all animate-in fade-in slide-in-from-top-4 duration-300">
      {/* Header & Close Button */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {isViolation ? (
            <div className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/40 animate-pulse">
              <ShieldAlert className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/40">
              <ShieldCheck className="w-5 h-5" />
            </div>
          )}
          <div>
            <h3 className="font-extrabold text-sm tracking-wide uppercase">
              {isViolation ? 'Encroachment Alert' : 'Geofence Status'}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">Real-Time Boundary Audit</p>
          </div>
        </div>

        <button
          onClick={() => setEncroachmentResult(null)}
          className="p-1 text-slate-400 hover:text-white rounded-lg transition-all hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Status Badge */}
      <div className="my-3">
        {isViolation ? (
          <div className="flex items-center justify-between px-3 py-2 bg-rose-950/60 border border-rose-600/60 rounded-xl">
            <div className="flex items-center gap-2 text-rose-400 font-extrabold text-xs">
              <AlertTriangle className="w-4 h-4 animate-bounce" />
              <span>VIOLATION DETECTED</span>
            </div>
            <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-rose-600 text-slate-950">
              {encroachmentResult.severity}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between px-3 py-2 bg-emerald-950/60 border border-emerald-600/60 rounded-xl">
            <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs">
              <ShieldCheck className="w-4 h-4" />
              <span>COMPLIANT (INSIDE PERMIT)</span>
            </div>
            <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-emerald-500 text-slate-950">
              CLEAN
            </span>
          </div>
        )}
      </div>

      {/* Metrics Breakdown Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl">
          <div className="text-[10px] text-slate-400 font-medium">Permitted Lease</div>
          <div className="text-base font-extrabold text-slate-100 mt-0.5">
            {encroachmentResult.permitted_lease_area.ha} <span className="text-[10px] font-normal text-slate-400">ha</span>
          </div>
          <div className="text-[9px] font-mono text-slate-400 mt-0.5">
            {encroachmentResult.permitted_lease_area.km2} km²
          </div>
        </div>

        <div className="p-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl">
          <div className="text-[10px] text-slate-400 font-medium">Legal Mining</div>
          <div className="text-base font-extrabold text-emerald-400 mt-0.5">
            {encroachmentResult.legal_mined_area.ha} <span className="text-[10px] font-normal text-slate-400">ha</span>
          </div>
          <div className="text-[9px] font-mono text-slate-400 mt-0.5">
            {encroachmentResult.legal_mined_area.km2} km²
          </div>
        </div>
      </div>

      {/* Encroached Area Highlight Panel */}
      <div className={`mt-2 p-3 rounded-xl border flex items-center justify-between ${
        isViolation
          ? 'bg-rose-900/30 border-rose-500/50 text-rose-300'
          : 'bg-slate-800/40 border-slate-700/40 text-slate-300'
      }`}>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider">Illegal Encroached Area</div>
          <div className="text-xs font-mono text-slate-400 mt-0.5">
            {encroachmentResult.encroached_area.m2} sq. meters
          </div>
        </div>
        <div className={`text-lg font-black ${isViolation ? 'text-rose-400' : 'text-slate-200'}`}>
          {encroachmentResult.encroached_area.ha} <span className="text-xs font-normal">ha</span>
        </div>
      </div>
    </div>
  );
};
