import axios from 'axios';
import { ScanResponse, InspectResponse, EncroachmentResponse, ChatResponse } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const scanRegionOfInterest = async (coordinates: number[][][], forceRescan = false): Promise<ScanResponse> => {
  const response = await apiClient.post<ScanResponse>('/scan', {
    coordinates,
    force_rescan: forceRescan,
  });
  return response.data;
};

export const inspectPitLocation = async (scanId: string, pitId: string, lat: number, lng: number): Promise<InspectResponse> => {
  const response = await apiClient.post<InspectResponse>('/inspect', {
    scan_id: scanId,
    pit_id: pitId,
    latitude: lat,
    longitude: lng,
  });
  return response.data;
};

export const checkBoundaryEncroachment = async (
  scanCoordinates: number[][][],
  boundaryCoordinates: number[][][],
  scanId?: string
): Promise<EncroachmentResponse> => {
  const response = await apiClient.post<EncroachmentResponse>('/boundary/check', {
    scan_coordinates: scanCoordinates,
    boundary_coordinates: boundaryCoordinates,
    scan_id: scanId,
  });
  return response.data;
};

export const analyzeMiningChat = async (
  image: string | null,
  location: string,
  message?: string
): Promise<ChatResponse> => {
  const response = await apiClient.post<ChatResponse>('/chat/analyze', {
    image,
    location,
    message: message || '',
  });
  return response.data;
};


