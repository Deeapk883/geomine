'use client';
import React from 'react';
import { Polygon, Tooltip } from 'react-leaflet';
import { useMineStore } from '../../store/useMineStore';

export const RoiOverlay: React.FC = () => {
  const roiCoordinates = useMineStore((state) => state.roiCoordinates);

  if (!roiCoordinates || !roiCoordinates.length) return null;

  const ring = roiCoordinates[0] || roiCoordinates;
  const positions = ring.map((pt) => [pt[1], pt[0]] as [number, number]);

  return (
    <Polygon
      positions={positions}
      pathOptions={{
        color: '#f59e0b',
        fillColor: '#f59e0b',
        fillOpacity: 0.12,
        weight: 2,
        dashArray: '4, 4',
      }}
    >
      <Tooltip sticky direction="top">
        <span className="font-semibold text-amber-400 font-sans">
          📍 Active Scan ROI
        </span>
      </Tooltip>
    </Polygon>
  );
};

export default RoiOverlay;
