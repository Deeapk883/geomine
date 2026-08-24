'use client';
import React from 'react';
import { ImageOverlay, Marker } from 'react-leaflet';
import L from 'leaflet';
import { useMineStore } from '../../store/useMineStore';
import { inspectPitLocation } from '../../services/api';
import { HotspotItem } from '../../types';

const createHotspotPin = (label: string, confidence: number) => {
  return L.divIcon({
    className: 'custom-pin',
    html: `
      <div class="bg-dark-900/90 backdrop-blur-md border border-amber-500/70 text-amber-400 font-semibold px-2.5 py-1 rounded-lg shadow-xl text-xs flex items-center gap-1.5 transform -translate-x-1/2 -translate-y-full hover:scale-110 transition-all cursor-pointer">
        <span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
        <span>${label} (${(confidence * 100).toFixed(0)}%)</span>
      </div>
    `,
    iconSize: [0, 0],
  });
};

export const HeatmapOverlay: React.FC = () => {
  const { scanResults, scan_id, setSelectedPit, setInspectData, setIsInspecting } = useMineStore((state) => ({
    scanResults: state.scanResults,
    scan_id: state.scanResults?.scan_id,
    setSelectedPit: state.setSelectedPit,
    setInspectData: state.setInspectData,
    setIsInspecting: state.setIsInspecting,
  }));

  if (!scanResults || !scanResults.heatmap_image) return null;

  const handleHotspotClick = async (hotspot: HotspotItem) => {
    setSelectedPit(hotspot);
    setIsInspecting(true);
    setInspectData(null);

    const [lat, lng] = hotspot.centroid;
    try {
      const inspectRes = await inspectPitLocation(scan_id || 'scan_active', hotspot.id, lat, lng);
      setInspectData(inspectRes);
    } catch (err) {
      console.error('Inspection failed:', err);
    }
  };

  return (
    <>
      {/* Heatmap Image Overlay */}
      <ImageOverlay
        url={scanResults.heatmap_image}
        bounds={scanResults.bounds}
        opacity={0.8}
      />



      {/* Heatmap Legend Floating Bar */}
      <div className="leaflet-bottom leaflet-right mb-8 mr-6 pointer-events-auto">
        <div className="bg-dark-900/90 backdrop-blur-xl border border-slate-700/70 p-3 rounded-xl shadow-2xl w-56 text-xs font-mono">
          <div className="flex justify-between text-slate-300 font-semibold mb-1.5 text-[10px] uppercase tracking-wider">
            <span>Mine Density Heatmap</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-gradient-to-r from-red-950 via-red-600 via-amber-500 to-yellow-200 shadow-inner border border-slate-700/50"></div>
          <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-semibold">
            <span>Low (15%)</span>
            <span>High (65%+)</span>
          </div>
        </div>
      </div>
    </>
  );
};
