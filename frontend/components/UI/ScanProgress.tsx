'use client';
import React from 'react';
import { useMineStore } from '../../store/useMineStore';
import { Loader2 } from 'lucide-react';

export const ScanProgress: React.FC = () => {
  const { isScanning, scanStep } = useMineStore();

  if (!isScanning) return null;

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] bg-dark-800/95 backdrop-blur-xl border border-amber-500/50 px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
      <span className="text-xs font-semibold text-slate-200">{scanStep}</span>
    </div>
  );
};
