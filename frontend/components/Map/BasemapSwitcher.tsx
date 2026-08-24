'use client';
import React from 'react';
import { useMineStore, BasemapType } from '../../store/useMineStore';
import { Eye, EyeOff } from 'lucide-react';

export const BasemapSwitcher: React.FC = () => {
  const { basemap, setBasemap, showHeatmapOverlay, toggleHeatmapOverlay, scanResults } = useMineStore();

  const options: { id: BasemapType; label: string }[] = [
    { id: 'google-sat', label: 'Google Satellite' },
    { id: 'google-hybrid', label: 'Google Hybrid' },
    { id: 'osm', label: 'OpenStreetMap' },
  ];

  return (
    <div className="absolute top-4 right-4 z-[1000] bg-dark-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-1.5 shadow-2xl flex items-center gap-1.5">
      {scanResults && (
        <>
          <button
            onClick={toggleHeatmapOverlay}
            title={showHeatmapOverlay ? "Click to view original satellite imagery before mapping" : "Click to view AI Heatmap & Encroachment Overlay"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              showHeatmapOverlay
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30 ring-2 ring-emerald-500/40 animate-pulse'
            }`}
          >
            {showHeatmapOverlay ? (
              <>
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>AI Heatmap: ON</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-emerald-400" />
                <span>Raw Satellite View</span>
              </>
            )}
          </button>
          <div className="h-4 w-px bg-slate-700/60" />
        </>
      )}

      <div className="flex bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/60">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setBasemap(opt.id)}
            className={`px-2.5 py-1 text-xs rounded-lg transition-all font-medium ${
              basemap === opt.id
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};
