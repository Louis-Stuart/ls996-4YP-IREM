import { EMISSION_LOW_THRESHOLD, EMISSION_MEDIUM_THRESHOLD } from "@/config/emissions";

export interface PointCoord {
  lat: number;
  lon: number;
}

export interface LineGeometry {
  type: "LineString";
  coordinates: [number, number][];
}

export interface SegmentGeometry {
  point: PointCoord;
  line?: LineGeometry;
}

export interface EmissionFactor {
  value: number;
  unit: string;
}

export interface TrafficVolume {
  cars: number;
  LGVs: number;
  HGVs: number;
  total: number;
}

export interface Weather {
  tas: number;
  tasUnit: string;
  rainfall: number;
  rainfallUnit: string;
}

export interface Material {
  type: string;
  thickness: number;
  thicknessUnit: string;
  age: number;
  ageUnit: string;
}

export interface SpeedLimit {
  value: number;
  unit: string;
}

export interface FuelTypeBreakdown {
  diesel: number;
  petrol: number;
  hybrid: number;
  BEV: number;
}

export interface FuelTypes {
  cars: FuelTypeBreakdown;
  LGVs: FuelTypeBreakdown;
  HGVs: FuelTypeBreakdown;
}

export interface RoadSegment {
  id: string;
  name?: string;
  roadCat?: string;
  roadType?: string;
  geometry: SegmentGeometry;
  emissionFactor: EmissionFactor;
  emissionFactors?: { co2e: number; unit: string };
  trafficVolume?: TrafficVolume;
  weather?: Weather;
  material?: Material;
  speedLimit?: SpeedLimit;
  fuelTypes?: FuelTypes;
  lastUpdated?: string;
  source?: string;
}

export interface RoadSegmentsResponse {
  count: number;
  items: RoadSegment[];
}

export interface SegmentFilters {
  bbox?: string;
  minCo2e?: number;
  maxCo2e?: number;
  q?: string;
  limit?: number;
  offset?: number;
  sourceCrs?: string;
}

export interface CrsOptionsResponse {
  responseCrs: string;
  defaultSourceCrs: string;
  allowedSourceCrs: string[];
}

export type EmissionLevel = "low" | "medium" | "high";

export function getEmissionLevel(co2e: number): EmissionLevel {
  if (co2e < EMISSION_LOW_THRESHOLD) return "low";
  if (co2e < EMISSION_MEDIUM_THRESHOLD) return "medium";
  return "high";
}

export function getEmissionColor(level: EmissionLevel): string {
  switch (level) {
    case "low":
      return "#22c55e";
    case "medium":
      return "#f59e0b";
    case "high":
      return "#ef4444";
  }
}

export function getSegmentEmissionValue(segment: RoadSegment): number {
  return segment.emissionFactor?.value ?? segment.emissionFactors?.co2e ?? 0;
}

export function getSegmentEmissionUnit(segment: RoadSegment): string {
  return segment.emissionFactor?.unit ?? segment.emissionFactors?.unit ?? "kgCO2/vehicle";
}
