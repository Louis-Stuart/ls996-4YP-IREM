import type { LatLngBounds } from "leaflet";
import proj4 from "proj4";

import type { LineGeometry, PointCoord } from "@/types/roadSegment";

const WGS84 = "EPSG:4326";

function normalizeCrs(crs?: string) {
  return (crs || WGS84).toUpperCase();
}

export function registerCrsDefinitions(definitions: Record<string, string>) {
  Object.entries(definitions).forEach(([code, definition]) => {
    if (definition) {
      proj4.defs(code, definition);
    }
  });
}

function transformCoordinate(
  coordinate: [number, number],
  fromCrs: string,
  toCrs: string,
): [number, number] {
  if (normalizeCrs(fromCrs) === normalizeCrs(toCrs)) {
    return coordinate;
  }

  const transformed = proj4(fromCrs, toCrs, coordinate);
  return [transformed[0], transformed[1]];
}

export function pointToLeafletLatLng(point: PointCoord, responseCrs: string): [number, number] {
  if (normalizeCrs(responseCrs) === WGS84) {
    return [point.lat, point.lon];
  }

  const [lon, lat] = transformCoordinate([point.lon, point.lat], responseCrs, WGS84);
  return [lat, lon];
}

export function lineToLeafletLatLngs(
  line: LineGeometry | undefined,
  responseCrs: string,
): [number, number][] {
  if (!line) {
    return [];
  }

  return line.coordinates.map(([x, y]) => {
    if (normalizeCrs(responseCrs) === WGS84) {
      return [y, x];
    }

    const [lon, lat] = transformCoordinate([x, y], responseCrs, WGS84);
    return [lat, lon];
  });
}

export function leafletBoundsToResponseBbox(bounds: LatLngBounds, responseCrs: string): string {
  const west = bounds.getWest();
  const south = bounds.getSouth();
  const east = bounds.getEast();
  const north = bounds.getNorth();

  if (normalizeCrs(responseCrs) === WGS84) {
    return `${west},${south},${east},${north}`;
  }

  const corners: [number, number][] = [
    [west, south],
    [west, north],
    [east, south],
    [east, north],
  ].map((coordinate) => transformCoordinate(coordinate, WGS84, responseCrs));

  const xs = corners.map(([x]) => x);
  const ys = corners.map(([, y]) => y);

  return `${Math.min(...xs)},${Math.min(...ys)},${Math.max(...xs)},${Math.max(...ys)}`;
}
