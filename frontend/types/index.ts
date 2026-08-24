export interface HotspotItem {
  id: string;
  confidence: number;
  centroid: [number, number]; // [Latitude, Longitude]
  area_km2: number;
}

export interface ScanResponse {
  status: string;
  cached: boolean;
  scan_id: string;
  timestamp: string;
  heatmap_image: string;
  bounds: [[number, number], [number, number]];
  total_pits_found: number;
  total_mined_area_km2: number;
  hotspots: HotspotItem[];
}

export interface MaterialAnalysis {
  material_name: string;
  confidence: "High" | "Medium" | "Low";
  reasoning: string[];
}

export interface InspectResponse {
  scan_id: string;
  pit_id: string;
  latitude: number;
  longitude: number;
  material_analysis: MaterialAnalysis;
}

