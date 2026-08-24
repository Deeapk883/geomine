'use client';
import React from 'react';
import { Polygon, GeoJSON, Tooltip } from 'react-leaflet';
import { useMineStore } from '../../store/useMineStore';

export const BoundaryOverlay: React.FC = () => {
  const { leaseBoundary, encroachmentResult, showHeatmapOverlay } = useMineStore();

  if (!leaseBoundary && !encroachmentResult) return null;

  // Convert GeoJSON [[[lng, lat], ...]] coordinates to Leaflet positions [[[lat, lng], ...]]
  const getLeafletPositions = (coords: number[][][]) => {
    if (!coords || !coords.length) return [];
    const ring = coords[0] || coords;
    return ring.map((pt) => [pt[1], pt[0]] as [number, number]);
  };

  const boundaryPositions = leaseBoundary ? getLeafletPositions(leaseBoundary) : [];

  return (
    <>
      {/* 1. Legal Lease Boundary Polygon (Emerald Green) */}
      {boundaryPositions.length > 0 && (
        <Polygon
          positions={boundaryPositions}
          pathOptions={{
            color: '#10b981',
            fillColor: '#10b981',
            fillOpacity: showHeatmapOverlay ? 0.15 : 0.05,
            weight: 3,
            dashArray: '6, 6',
          }}
        >
          <Tooltip sticky direction="top" className="custom-tooltip">
            <span className="font-semibold text-emerald-400 font-sans">
              🛡️ Legal Mining Permit Area
            </span>
          </Tooltip>
        </Polygon>
      )}

      {/* 2. Illegal Encroached Mining Polygons (Pulsing Red - Visible when Heatmap Overlay is ON) */}
      {showHeatmapOverlay && encroachmentResult && encroachmentResult.encroached_features && (
        encroachmentResult.encroached_features.map((feature, idx) => (
          <GeoJSON
            key={`encroached_${idx}`}
            data={feature}
            style={{
              color: '#ef4444',
              fillColor: '#f87171',
              fillOpacity: 0.6,
              weight: 3,
            }}
          >
            <Tooltip sticky direction="top">
              <div className="font-bold text-rose-500 font-sans flex items-center gap-1">
                <span>🚨 ILLEGAL ENCROACHMENT ZONE</span>
              </div>
            </Tooltip>
          </GeoJSON>
        ))
      )}

      {/* 3. Legal Mining Activity Polygons (Emerald - Visible when Heatmap Overlay is ON) */}
      {showHeatmapOverlay && encroachmentResult && encroachmentResult.legal_mined_features && (
        encroachmentResult.legal_mined_features.map((feature, idx) => (
          <GeoJSON
            key={`legal_mined_${idx}`}
            data={feature}
            style={{
              color: '#059669',
              fillColor: '#34d399',
              fillOpacity: 0.25,
              weight: 2,
            }}
          >
            <Tooltip sticky direction="top">
              <span className="font-medium text-emerald-300 font-sans">
                ✅ Compliant Mining Activity
              </span>
            </Tooltip>
          </GeoJSON>
        ))
      )}
    </>
  );
};
