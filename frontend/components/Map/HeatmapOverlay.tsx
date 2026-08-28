'use client';
import React from 'react';
import { ImageOverlay } from 'react-leaflet';
import { useMineStore } from '../../store/useMineStore';

export const HeatmapOverlay: React.FC = () => {
  const { scanResults, showHeatmapOverlay } = useMineStore((state) => ({
    scanResults: state.scanResults,
    showHeatmapOverlay: state.showHeatmapOverlay,
  }));

  if (!scanResults || !scanResults.heatmap_image) return null;

  return (
    <>
      {/* Heatmap Image Overlay (Visible when showHeatmapOverlay is true) */}
      {showHeatmapOverlay && (
        <ImageOverlay
          url={scanResults.heatmap_image}
          bounds={scanResults.bounds}
          opacity={0.8}
        />
      )}

      {/* Heatmap Legend Floating Bar */}
      <div className="absolute bottom-28 left-6 pointer-events-auto flex flex-col items-start gap-2.5 z-[1000]">
        <div className="bg-dark-900/90 backdrop-blur-xl border border-slate-700/70 p-3 rounded-xl shadow-2xl w-56 text-xs font-mono">
          <div className="flex justify-between text-slate-300 font-semibold mb-1.5 text-[10px] uppercase tracking-wider">
            <span>Mine Density Heatmap</span>
            <span className={showHeatmapOverlay ? 'text-amber-400 font-bold' : 'text-slate-500 font-bold'}>
              {showHeatmapOverlay ? 'VISIBLE' : 'HIDDEN'}
            </span>
          </div>
          <div className={`h-2.5 w-full rounded-full bg-gradient-to-r from-red-950 via-red-600 via-amber-500 to-yellow-200 shadow-inner border border-slate-700/50 transition-opacity ${!showHeatmapOverlay ? 'opacity-30' : 'opacity-100'}`}></div>
          <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-semibold">
            <span>Low (15%)</span>
            <span>High (65%+)</span>
          </div>
        </div>
      </div>
    </>
  );
};
