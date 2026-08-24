'use client';
import React from 'react';
import { useMineStore } from '../../store/useMineStore';
import { X, Sparkles, MapPin, Maximize2, Loader2 } from 'lucide-react';

export const InspectDrawer: React.FC = () => {
  const { isInspecting, selectedPit, inspectData, setIsInspecting } = useMineStore();

  if (!isInspecting || !selectedPit) return null;

  return (
    <div className="absolute top-4 right-4 bottom-6 w-96 z-[1000] bg-dark-900/95 backdrop-blur-xl border border-slate-700/70 rounded-2xl p-5 shadow-2xl flex flex-col overflow-y-auto">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/30">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-lg uppercase tracking-wide">
                {selectedPit.id}
              </h3>
              <p className="text-xs text-slate-400">
                Confidence: <span className="text-emerald-400 font-semibold">{(selectedPit.confidence * 100).toFixed(1)}%</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsInspecting(false)}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Satellite RGB Thumbnail Crop Placeholder */}
        <div className="mt-5">
          <div className="relative h-40 bg-slate-950 rounded-xl overflow-hidden border border-slate-800/80 flex items-center justify-center">
            {/* Pulsing radar lines and grid */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent animate-pulse"></div>
            <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 opacity-10 pointer-events-none">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="border-[0.5px] border-slate-500"></div>
              ))}
            </div>
            {/* Centered crosshair */}
            <div className="absolute w-6 h-6 border border-amber-500/30 rounded-full flex items-center justify-center">
              <div className="w-1 h-1 bg-amber-500 rounded-full"></div>
            </div>
            <div className="z-10 text-center">
              <MapPin className="w-8 h-8 text-amber-500 mx-auto mb-2 animate-bounce" />
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-mono block">
                Sentinel-2 RGB Crop
              </span>
              <span className="text-[9px] text-slate-500 font-mono">
                Lat: {selectedPit.centroid[0].toFixed(4)} | Lng: {selectedPit.centroid[1].toFixed(4)}
              </span>
            </div>
          </div>
        </div>

        {/* Gemini Material Identification */}
        <div className="mt-5 space-y-4">
          <div className="bg-dark-800/80 rounded-xl p-4 border border-amber-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-amber-400 tracking-wider uppercase">
                Predicted Mineral
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {inspectData ? `${inspectData.material_analysis.confidence} Confidence` : 'Analyzing...'}
              </span>
            </div>

            <div className="text-2xl font-black text-slate-50 tracking-tight flex items-center gap-2">
              {!inspectData && <Loader2 className="w-5 h-5 text-amber-400 animate-spin shrink-0" />}
              {inspectData ? inspectData.material_analysis.material_name : 'Scanning Spectrum...'}
            </div>

            {inspectData && (
              <ul className="mt-3 space-y-2 border-t border-slate-800 pt-3">
                {inspectData.material_analysis.reasoning.map((point, idx) => (
                  <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Spatial Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Surface Area</span>
              </div>
              <div className="text-lg font-bold text-slate-100">
                {selectedPit.area_km2} <span className="text-xs text-slate-400 font-normal">km²</span>
              </div>
            </div>

            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Centroid</span>
              </div>
              <div className="text-xs font-mono font-bold text-slate-200">
                {selectedPit.centroid[0].toFixed(4)}, {selectedPit.centroid[1].toFixed(4)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

