'use client';
import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import { useMineStore } from '../../store/useMineStore';
import { scanRegionOfInterest, checkBoundaryEncroachment } from '../../services/api';

export const MapControls: React.FC = () => {
  const map = useMap();
  const { 
    setRoiCoordinates, 
    setIsScanning, 
    setScanStep, 
    setScanResults, 
    setLeaseBoundary,
    drawingMode,
    setEncroachmentResult,
    setIsCheckingBoundary
  } = useMineStore();

  // Dynamically update Geoman styling based on active drawing mode
  useEffect(() => {
    if (!map || !map.pm) return;

    if (drawingMode === 'boundary') {
      map.pm.setGlobalOptions({
        pathOptions: {
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.25,
          weight: 3,
          dashArray: '6, 6'
        },
      });
    } else {
      map.pm.setGlobalOptions({
        pathOptions: {
          color: '#f59e0b',
          fillColor: '#f59e0b',
          fillOpacity: 0.15,
          weight: 2,
          dashArray: undefined
        },
      });
    }
  }, [map, drawingMode]);

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

    const handleCreate = async (e: any) => {
      const layer = e.layer;
      const geojson = layer.toGeoJSON();
      const rawCoords = geojson.geometry.coordinates;

      const currentMode = useMineStore.getState().drawingMode;
      const currentRoi = useMineStore.getState().roiCoordinates;
      const currentBoundary = useMineStore.getState().leaseBoundary;

      if (currentMode === 'boundary') {
        // Remove raw drawn layer (rendered dynamically by BoundaryOverlay)
        map.removeLayer(layer);
        setLeaseBoundary(rawCoords);

        // If scan area already exists, run boundary check immediately
        const activeRoi = currentRoi || rawCoords;
        try {
          setIsCheckingBoundary(true);
          const boundaryRes = await checkBoundaryEncroachment(activeRoi, rawCoords);
          setEncroachmentResult(boundaryRes);
        } catch (err) {
          console.error('Boundary Check Error:', err);
        } finally {
          setIsCheckingBoundary(false);
        }
      } else {
        // Scan ROI Mode (Remove raw drawn layer so it is rendered by RoiOverlay)
        map.removeLayer(layer);
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

          // Check boundary encroachment if boundary is active
          if (currentBoundary) {
            setIsCheckingBoundary(true);
            const boundaryRes = await checkBoundaryEncroachment(rawCoords, currentBoundary, response.scan_id);
            setEncroachmentResult(boundaryRes);
          }
        } catch (err) {
          console.error('Scan Error:', err);
        } finally {
          setIsScanning(false);
          setScanStep('');
          setIsCheckingBoundary(false);
        }
      }
    };

    const handleRemove = () => {
      useMineStore.getState().clearAll();
    };

    map.on('pm:create', handleCreate);
    map.on('pm:remove', handleRemove);

    return () => {
      map.off('pm:create', handleCreate);
      map.off('pm:remove', handleRemove);
    };
  }, [map, setRoiCoordinates, setIsScanning, setScanStep, setScanResults, setLeaseBoundary, setEncroachmentResult, setIsCheckingBoundary]);

  return null;
};
