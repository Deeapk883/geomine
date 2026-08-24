'use client';
import React from 'react';
import { MapContainer as LeafletMap, TileLayer } from 'react-leaflet';
import { useMineStore } from '../../store/useMineStore';
import { BasemapSwitcher } from './BasemapSwitcher';
import { MapControls } from './MapControls';
import { HeatmapOverlay } from './HeatmapOverlay';

const tileProviders = {
  'google-sat': 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
  'google-hybrid': 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
  'osm': 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
};

export const MapContainer: React.FC = () => {
  const { basemap } = useMineStore();

  return (
    <div className="relative w-full h-full">
      <BasemapSwitcher />
      <LeafletMap
        center={[15.1482, 76.9241]}
        zoom={13}
        zoomControl={false}
        className="w-full h-full"
      >
        <TileLayer url={tileProviders[basemap]} maxZoom={20} />
        <MapControls />
        <HeatmapOverlay />
      </LeafletMap>
    </div>
  );
};


export default MapContainer;
