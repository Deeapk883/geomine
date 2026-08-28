import { create } from 'zustand';
import { ScanResponse, InspectResponse, HotspotItem, EncroachmentResponse } from '../types';

export type BasemapType = 'google-sat' | 'google-hybrid' | 'osm';
export type DrawingModeType = 'roi' | 'boundary';

interface MineState {
  roiCoordinates: number[][][] | null;
  isScanning: boolean;
  scanStep: string;
  scanResults: ScanResponse | null;
  selectedPit: HotspotItem | null;
  inspectData: InspectResponse | null;
  isInspecting: boolean;
  basemap: BasemapType;

  // Boundary Monitoring State
  leaseBoundary: number[][][] | null;
  drawingMode: DrawingModeType;
  encroachmentResult: EncroachmentResponse | null;
  isCheckingBoundary: boolean;

  // View Layer Visibility State
  showHeatmapOverlay: boolean;

  setRoiCoordinates: (coords: number[][][] | null) => void;
  setIsScanning: (scanning: boolean) => void;
  setScanStep: (step: string) => void;
  setScanResults: (results: ScanResponse | null) => void;
  setSelectedPit: (pit: HotspotItem | null) => void;
  setInspectData: (data: InspectResponse | null) => void;
  setIsInspecting: (inspecting: boolean) => void;
  setBasemap: (basemap: BasemapType) => void;

  setLeaseBoundary: (coords: number[][][] | null) => void;
  setDrawingMode: (mode: DrawingModeType) => void;
  setEncroachmentResult: (res: EncroachmentResponse | null) => void;
  setIsCheckingBoundary: (checking: boolean) => void;
  clearLeaseBoundary: () => void;
  resetScan: () => void;
  clearAll: () => void;

  setShowHeatmapOverlay: (show: boolean) => void;
  toggleHeatmapOverlay: () => void;
}

export const useMineStore = create<MineState>((set) => ({
  roiCoordinates: null,
  isScanning: false,
  scanStep: '',
  scanResults: null,
  selectedPit: null,
  inspectData: null,
  isInspecting: false,
  basemap: 'google-sat',

  leaseBoundary: null,
  drawingMode: 'roi',
  encroachmentResult: null,
  isCheckingBoundary: false,

  showHeatmapOverlay: true,

  setRoiCoordinates: (coords) => set({ roiCoordinates: coords }),
  setIsScanning: (scanning) => set({ isScanning: scanning }),
  setScanStep: (step: string) => set({ scanStep: step }),
  setScanResults: (results) => set({ scanResults: results }),
  setSelectedPit: (pit) => set({ selectedPit: pit }),
  setInspectData: (data) => set({ inspectData: data }),
  setIsInspecting: (inspecting) => set({ isInspecting: inspecting }),
  setBasemap: (basemap) => set({ basemap }),

  setLeaseBoundary: (coords) => set({ leaseBoundary: coords }),
  setDrawingMode: (mode) => set({ drawingMode: mode }),
  setEncroachmentResult: (res) => set({ encroachmentResult: res }),
  setIsCheckingBoundary: (checking) => set({ isCheckingBoundary: checking }),
  clearLeaseBoundary: () => set({ leaseBoundary: null, encroachmentResult: null }),
  resetScan: () => set({ roiCoordinates: null, scanResults: null, selectedPit: null, inspectData: null, encroachmentResult: null }),
  clearAll: () => set({ roiCoordinates: null, scanResults: null, selectedPit: null, inspectData: null, leaseBoundary: null, encroachmentResult: null, isScanning: false, isInspecting: false, isCheckingBoundary: false, showHeatmapOverlay: true }),

  setShowHeatmapOverlay: (show) => set({ showHeatmapOverlay: show }),
  toggleHeatmapOverlay: () => set((state) => ({ showHeatmapOverlay: !state.showHeatmapOverlay })),
}));

