import { useCallback, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { RoadSegment, getEmissionColor, getEmissionLevel, getSegmentEmissionUnit, getSegmentEmissionValue } from "@/types/roadSegment";

interface MapViewProps {
  segments: RoadSegment[];
  showLines: boolean;
  selectedSegmentId: string | null;
  onSelectSegment: (segment: RoadSegment) => void;
  onBoundsChange: (bbox: string) => void;
}

function createMarkerIcon(co2e: number, isSelected: boolean) {
  const level = getEmissionLevel(co2e);
  const color = getEmissionColor(level);
  const size = isSelected ? 18 : 12;
  const border = isSelected ? "3px solid hsl(210,80%,45%)" : "2px solid white";

  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px; height:${size}px; border-radius:50%;
      background:${color}; border:${border};
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function MapView({
  segments,
  showLines,
  selectedSegmentId,
  onSelectSegment,
  onBoundsChange,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup>(L.layerGroup());
  const linesRef = useRef<L.LayerGroup>(L.layerGroup());
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const lastFlownId = useRef<string | null>(null);

  const emitBounds = useCallback(() => {
    if (!mapRef.current) return;

    const bounds = mapRef.current.getBounds();
    onBoundsChange(`${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`);
  }, [onBoundsChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView([52.2, 0.12], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    markersRef.current.addTo(map);
    linesRef.current.addTo(map);

    const handleMove = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(emitBounds, 400);
    };

    map.on("moveend", handleMove);
    mapRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
      emitBounds();
    }, 200);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [emitBounds]);

  useEffect(() => {
    if (mapRef.current) {
      emitBounds();
    }
  }, [emitBounds]);

  useEffect(() => {
    markersRef.current.clearLayers();
    linesRef.current.clearLayers();

    segments.forEach((segment) => {
      const emissionValue = getSegmentEmissionValue(segment);
      const emissionUnit = getSegmentEmissionUnit(segment);
      const { lat, lon } = segment.geometry.point;
      const isSelected = segment.id === selectedSegmentId;
      const icon = createMarkerIcon(emissionValue, isSelected);
      const marker = L.marker([lat, lon], { icon });
      const speedLimit = segment.speedLimit
        ? `${segment.speedLimit.value} ${segment.speedLimit.unit}`
        : null;

      marker.bindPopup(`
        <div style="font-family:system-ui;min-width:160px;">
          <strong>${segment.name || segment.id}</strong><br/>
          <span style="color:${getEmissionColor(getEmissionLevel(emissionValue))}; font-weight:600;">
            ${emissionValue} ${emissionUnit}
          </span><br/>
          ${segment.roadCat ? `<span style="color:#666;font-size:12px;">${segment.roadCat}${speedLimit ? ` | ${speedLimit}` : ""}</span><br/>` : ""}
          <button onclick="window.dispatchEvent(new CustomEvent('select-segment',{detail:'${segment.id}'}))"
            style="margin-top:6px;padding:4px 10px;background:hsl(210,80%,45%);color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">
            View Details
          </button>
        </div>
      `);

      marker.on("click", () => onSelectSegment(segment));
      markersRef.current.addLayer(marker);

      if (showLines && segment.geometry.line) {
        const coords = segment.geometry.line.coordinates.map(([x, y]) => [y, x] as [number, number]);
        const line = L.polyline(coords, {
          color: getEmissionColor(getEmissionLevel(emissionValue)),
          weight: 4,
          opacity: 0.8,
        });
        linesRef.current.addLayer(line);
      }
    });
  }, [segments, showLines, selectedSegmentId, onSelectSegment]);

  useEffect(() => {
    const handler = (event: Event) => {
      const id = (event as CustomEvent).detail;
      const segment = segments.find((item) => item.id === id);
      if (segment) onSelectSegment(segment);
    };

    window.addEventListener("select-segment", handler);
    return () => window.removeEventListener("select-segment", handler);
  }, [segments, onSelectSegment]);

  useEffect(() => {
    if (!selectedSegmentId) {
      lastFlownId.current = null;
      return;
    }

    if (!mapRef.current || lastFlownId.current === selectedSegmentId) {
      return;
    }

    const segment = segments.find((item) => item.id === selectedSegmentId);
    if (!segment) {
      return;
    }

    mapRef.current.flyTo([segment.geometry.point.lat, segment.geometry.point.lon], 14, {
      duration: 0.8,
    });
    lastFlownId.current = selectedSegmentId;
  }, [selectedSegmentId, segments]);

  return <div ref={containerRef} className="h-full w-full" />;
}
