'use client';
import React, { useEffect, useState } from 'react';
import { RefreshCw, Layers } from 'lucide-react';
import { useMineStore } from '../../store/useMineStore';

export const Navbar: React.FC = () => {
  const [online, setOnline] = useState(true);
  const clearAll = useMineStore((state) => state.clearAll);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/')
      .then((res) => setOnline(res.ok))
      .catch(() => setOnline(false));
  }, []);

  return (
    <nav className="h-14 z-[1001] bg-dark-900/95 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-500/40">
          <Layers className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="font-black tracking-wider text-slate-100 text-base uppercase">GeoMine AI</h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/60 rounded-full border border-slate-700/60 text-xs text-slate-300">
          <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <span>{online ? 'Engine Online' : 'Engine Offline'}</span>
        </div>

        <button
          onClick={clearAll}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg border border-slate-700 transition-all"
          title="Clear all active ROI, Lease Boundary, Heatmaps, and Analysis"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Clear Region</span>
        </button>
      </div>
    </nav>
  );
};
