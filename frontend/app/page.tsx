'use client';
import dynamic from 'next/dynamic';
import React from 'react';
import { Navbar } from '../components/UI/Navbar';
import { ScanProgress } from '../components/UI/ScanProgress';
import { SummaryHUD } from '../components/UI/SummaryHUD';
import { InspectDrawer } from '../components/Inspection/InspectDrawer';
import { BoundaryToolbar } from '../components/UI/BoundaryToolbar';
import { EncroachmentAlertHUD } from '../components/UI/EncroachmentAlertHUD';

// Client-side rendering dynamic import for Leaflet
const DynamicMap = dynamic(() => import('../components/Map/MapContainer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-dark-900 flex items-center justify-center text-slate-400 font-mono text-sm">
      Loading GeoMine Canvas...
    </div>
  ),
});

export default function Home() {
  return (
    <main className="flex flex-col w-screen h-screen overflow-hidden bg-dark-900">
      {/* Fixed 56px navbar */}
      <Navbar />

      {/* Map area fills remaining space — all floating HUDs are positioned relative to this */}
      <div className="relative flex-1 overflow-hidden">
        <DynamicMap />
        <BoundaryToolbar />
        <EncroachmentAlertHUD />
        <ScanProgress />
        <SummaryHUD />
        <InspectDrawer />
      </div>
    </main>
  );
}
