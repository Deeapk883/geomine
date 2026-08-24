'use client';
import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import { useMineStore } from '../../store/useMineStore';
import { scanRegionOfInterest } from '../../services/api';

export const MapControls: React.FC = () => {
  const map = useMap();
  const { 
    setRoiCoordinates, 
    setIsScanning, 
    setScanStep, 
    setScanResults, 
    resetScan 
  } = useMineStore();

  useEffect(() => {
    if (!map) return;

    // Add Geoman drawing controls
    map.pm.addControls({
      position: 'topleft',
      drawPolygon: true,
      drawRectangle: true,
      drawCircleMarker: false,
      drawPolyline: false,
      drawCircle: false,
      drawText: false,
      editMode: false,
      dragMode: false,
      cutPolygon: false,
      removalMode: true,
    });

    map.pm.setGlobalOptions({
      pathOptions: {
        color: '#f59e0b',
        fillColor: '#f59e0b',
        fillOpacity: 0.15,
        weight: 2,
      },
    });

    const handleCreate = async (e: any) => {
      const layer = e.layer;
      const geojson = layer.toGeoJSON();
      const rawCoords = geojson.geometry.coordinates;

      setRoiCoordinates(rawCoords);
      setIsScanning(true);
      
      try {
        setScanStep('Fetching 9-Band Composite from GEE...');
        await new Promise((r) => setTimeout(r, 600));

        setScanStep('Running EfficientNet-B0 Sliding Window Inference...');
        const response = await scanRegionOfInterest(rawCoords);

        setScanStep('Generating Multi-Spectral Density Heatmap Overlay...');
        await new Promise((r) => setTimeout(r, 400));

        setScanResults(response);
      } catch (err) {
        console.error('Scan Error:', err);
      } finally {
        setIsScanning(false);
        setScanStep('');
      }
    };

    map.on('pm:create', handleCreate);

    return () => {
      map.off('pm:create', handleCreate);
    };
  }, [map, setRoiCoordinates, setIsScanning, setScanStep, setScanResults]);

  return null;
};
