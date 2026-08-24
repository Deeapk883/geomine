'use client';
import React from 'react';
import { useMineStore } from '../../store/useMineStore';
import { Zap } from 'lucide-react';

export const SummaryHUD: React.FC = () => {
  const { scanResults } = useMineStore();

  if (!scanResults) return null;

  return (
    <div className="absolute bottom-6 left-6 z-[1000] bg-dark-800/90 backdrop-blur-md border border-slate-700/60 p-4 rounded-xl shadow-xl flex items-center gap-5">
      <div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Mined Area</div>
        <div className="text-xl font-black text-slate-100">{scanResults.total_mined_area_km2} <span className="text-xs font-normal text-slate-400">km²</span></div>
      </div>
      {scanResults.cached && (
        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/30">
          <Zap className="w-3 h-3" />
          <span>CACHED</span>
        </div>
      )}
    </div>
  );
};
