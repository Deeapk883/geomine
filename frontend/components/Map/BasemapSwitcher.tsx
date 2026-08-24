'use client';
import React from 'react';
import { useMineStore, BasemapType } from '../../store/useMineStore';
import { Layers } from 'lucide-react';

export const BasemapSwitcher: React.FC = () => {
  const { basemap, setBasemap } = useMineStore();

  const options: { id: BasemapType; label: string }[] = [
    { id: 'google-sat', label: 'Google Satellite' },
    { id: 'google-hybrid', label: 'Google Hybrid' },
    { id: 'osm', label: 'OpenStreetMap' },
  ];

  return (
    <div className="absolute top-4 right-4 z-[1000] bg-dark-800/90 backdrop-blur-md border border-slate-700/60 rounded-lg p-1.5 shadow-xl flex items-center gap-1">
      <div className="px-2 py-1 flex items-center gap-1.5 text-xs text-slate-400 font-medium border-r border-slate-700">
        <Layers className="w-3.5 h-3.5 text-amber-500" />
        <span>Basemap</span>
      </div>
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => setBasemap(opt.id)}
          className={`px-2.5 py-1 text-xs rounded-md transition-all font-medium ${
            basemap === opt.id
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
              : 'text-slate-300 hover:bg-slate-700/50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};
