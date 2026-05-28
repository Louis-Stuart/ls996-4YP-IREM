import { CrsOptionsResponse, RoadSegment, RoadSegmentsResponse, SegmentFilters } from "@/types/roadSegment";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

async function fetchApi<T>(path: string, params?: Record<string, string>): Promise<T> {
  const baseUrl = API_BASE || window.location.origin;
  const url = new URL(path, baseUrl);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, value);
      }
    });
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function fetchRoadSegments(filters: SegmentFilters): Promise<RoadSegmentsResponse> {
  const params: Record<string, string> = {};

  if (filters.bbox) params.bbox = filters.bbox;
  if (filters.minCo2e !== undefined) params.minCo2e = String(filters.minCo2e);
  if (filters.maxCo2e !== undefined) params.maxCo2e = String(filters.maxCo2e);
  if (filters.q) params.q = filters.q;
  if (filters.limit) params.limit = String(filters.limit);
  if (filters.offset) params.offset = String(filters.offset);
  if (filters.sourceCrs) params.sourceCrs = filters.sourceCrs;

  return fetchApi<RoadSegmentsResponse>("/api/road-segments", params);
}

export async function fetchRoadSegmentById(id: string, sourceCrs?: string): Promise<RoadSegment> {
  const params = sourceCrs ? { sourceCrs } : undefined;
  return fetchApi<RoadSegment>(`/api/road-segments/${id}`, params);
}

export async function fetchHealthStatus(): Promise<{ status: string }> {
  return fetchApi<{ status: string }>("/api/health");
}

export async function fetchCrsOptions(): Promise<CrsOptionsResponse> {
  return fetchApi<CrsOptionsResponse>("/api/crs/options");
}

export function isUsingMock() {
  return false;
}
