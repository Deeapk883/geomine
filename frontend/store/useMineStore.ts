import { create } from 'zustand';
import { ScanResponse, InspectResponse, HotspotItem } from '../types';

export type BasemapType = 'google-sat' | 'google-hybrid' | 'osm';

interface MineState {
  roiCoordinates: number[][][] | null;
  isScanning: boolean;
  scanStep: string;
  scanResults: ScanResponse | null;
  selectedPit: HotspotItem | null;
  inspectData: InspectResponse | null;
  isInspecting: boolean;
  basemap: BasemapType;

  setRoiCoordinates: (coords: number[][][] | null) => void;
  setIsScanning: (scanning: boolean) => void;
  setScanStep: (step: string) => void;
  setScanResults: (results: ScanResponse | null) => void;
  setSelectedPit: (pit: HotspotItem | null) => void;
  setInspectData: (data: InspectResponse | null) => void;
  setIsInspecting: (inspecting: boolean) => void;
  setBasemap: (basemap: BasemapType) => void;
  resetScan: () => void;
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

  setRoiCoordinates: (coords) => set({ roiCoordinates: coords }),
  setIsScanning: (scanning) => set({ isScanning: scanning }),
  setScanStep: (step: string) => set({ scanStep: step }),
  setScanResults: (results) => set({ scanResults: results }),
  setSelectedPit: (pit) => set({ selectedPit: pit }),
  setInspectData: (data) => set({ inspectData: data }),
  setIsInspecting: (inspecting) => set({ isInspecting: inspecting }),
  setBasemap: (basemap) => set({ basemap }),
  resetScan: () => set({ roiCoordinates: null, scanResults: null, selectedPit: null, inspectData: null }),
}));

