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

export interface AreaMetrics {
  m2: number;
  ha: number;
  km2: number;
}

export interface EncroachmentResponse {
  status: string;
  violation_detected: boolean;
  severity: "COMPLIANT" | "WARNING" | "CRITICAL";
  permitted_lease_area: AreaMetrics;
  legal_mined_area: AreaMetrics;
  encroached_area: AreaMetrics;
  encroached_features: any[]; // GeoJSON Feature geometries
  legal_mined_features: any[];
}

export interface ChatAnalysis {
  mined_material: string;
  confidence: "High" | "Medium" | "Low";
  visual_findings: string[];
  location_context: string;
  summary: string;
}

export interface ChatResponse {
  status: string;
  location: string;
  analysis: ChatAnalysis;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'gemini';
  timestamp: string;
  text?: string;
  location?: string;
  imagePreview?: string;
  analysis?: ChatAnalysis;
}
