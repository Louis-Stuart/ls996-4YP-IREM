import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import EmissionLegend from "@/components/EmissionLegend";
import FilterControls from "@/components/FilterControls";
import MapView from "@/components/MapView";
import SegmentDetails from "@/components/SegmentDetails";
import SegmentTable from "@/components/SegmentTable";
import StatusIndicator from "@/components/StatusIndicator";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { fetchCrsOptions, fetchRoadSegments } from "@/services/api";
import { CrsOptionsResponse, RoadSegment, SegmentFilters } from "@/types/roadSegment";
import { useDebounce } from "@/hooks/useDebounce";

const DEFAULT_CRS_OPTIONS: CrsOptionsResponse = {
  responseCrs: "EPSG:4326",
  defaultSourceCrs: "EPSG:3857",
  allowedSourceCrs: ["EPSG:3857", "EPSG:4326"],
};

const SESSION_CRS_KEY = "road-emissions-source-crs";

export default function Index() {
  const [segments, setSegments] = useState<RoadSegment[]>([]);
  const [cachedSegments, setCachedSegments] = useState<RoadSegment[]>([]);
  const [crsOptions, setCrsOptions] = useState<CrsOptionsResponse>(DEFAULT_CRS_OPTIONS);
  const [selectedSourceCrs, setSelectedSourceCrs] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bbox, setBbox] = useState("");
  const [search, setSearch] = useState("");
  const [co2eRange, setCo2eRange] = useState<[number, number]>([0, 5]);
  const [showLines, setShowLines] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState<RoadSegment | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);

  const debouncedSearch = useDebounce(search, 300);
  const debouncedCo2e = useDebounce(co2eRange, 300);
  const fetchRef = useRef(0);

  useEffect(() => {
    let active = true;

    async function loadAvailableCrs() {
      try {
        const options = await fetchCrsOptions();
        if (!active) return;

        setCrsOptions(options);

        const savedCrs = window.sessionStorage.getItem(SESSION_CRS_KEY);
        const nextCrs = savedCrs && options.allowedSourceCrs.includes(savedCrs)
          ? savedCrs
          : options.defaultSourceCrs;
        setSelectedSourceCrs(nextCrs);
      } catch (err) {
        if (!active) return;

        setError(err instanceof Error ? err.message : "Failed to load CRS options");
        setCrsOptions(DEFAULT_CRS_OPTIONS);
        setSelectedSourceCrs(DEFAULT_CRS_OPTIONS.defaultSourceCrs);
      }
    }

    loadAvailableCrs();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (selectedSourceCrs) {
      window.sessionStorage.setItem(SESSION_CRS_KEY, selectedSourceCrs);
    }
  }, [selectedSourceCrs]);

  const loadSegments = useCallback(async () => {
    if (!selectedSourceCrs) {
      return;
    }

    const id = ++fetchRef.current;
    setLoading(true);
    setError(null);

    const filters: SegmentFilters = { sourceCrs: selectedSourceCrs };
    if (bbox) filters.bbox = bbox;
    if (debouncedSearch) filters.q = debouncedSearch;
    if (debouncedCo2e[0] > 0) filters.minCo2e = debouncedCo2e[0];
    if (debouncedCo2e[1] < 5) filters.maxCo2e = debouncedCo2e[1];

    try {
      const data = await fetchRoadSegments(filters);
      if (id !== fetchRef.current) return;

      setSegments(data.items);
      setCachedSegments(data.items);
      setSelectedSegment((current) => {
        if (!current) return null;
        return data.items.find((item) => item.id === current.id) ?? null;
      });
    } catch (err) {
      if (id !== fetchRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to load");
      setSegments(cachedSegments);
    } finally {
      if (id === fetchRef.current) {
        setLoading(false);
      }
    }
  }, [bbox, cachedSegments, debouncedCo2e, debouncedSearch, selectedSourceCrs]);

  useEffect(() => {
    if (selectedSourceCrs) {
      loadSegments();
    }
  }, [bbox, debouncedSearch, debouncedCo2e, selectedSourceCrs]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectSegment = useCallback((segment: RoadSegment) => {
    setSelectedSegment(segment);
    setPanelOpen(true);
  }, []);

  const status = loading ? "loading" : error ? "error" : "connected";

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="shrink-0 border-b bg-card px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/dr-logo.png" alt="DR logo" className="h-9 w-9 rounded-sm object-contain" />
            <h1 className="text-lg font-bold tracking-tight text-foreground">RDGP-CO2</h1>
          </div>
          <div className="flex items-center gap-3">
            <EmissionLegend />
            <Separator orientation="vertical" className="h-5" />
            <StatusIndicator status={status} />
          </div>
        </div>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        <div className="relative flex-1">
          <MapView
            segments={segments}
            showLines={showLines}
            selectedSegmentId={selectedSegment?.id ?? null}
            onSelectSegment={handleSelectSegment}
            onBoundsChange={setBbox}
          />

          {error && (
            <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={loadSegments} className="h-7 text-xs">
                Retry
              </Button>
            </div>
          )}

          <Button
            variant="secondary"
            size="sm"
            className="absolute right-3 top-3 z-10 shadow-md md:hidden"
            onClick={() => setPanelOpen(!panelOpen)}
          >
            {panelOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            Panel
          </Button>
        </div>

        <aside
          className={`
            ${panelOpen ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-x-full"}
            fixed bottom-0 left-0 right-0 z-20 h-[60vh] w-full border-t bg-card transition-transform duration-300 md:static md:bottom-auto md:z-auto md:h-auto md:w-96 md:border-l md:border-t-0
          `}
        >
          <div className="flex justify-center py-1.5 md:hidden">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          <div className="flex h-full flex-col overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {selectedSegment && (
                <>
                  <SegmentDetails segment={selectedSegment} onClose={() => setSelectedSegment(null)} />
                  <Separator />
                </>
              )}

              <div>
                <h2 className="mb-3 text-sm font-semibold text-foreground">Filters</h2>
                <FilterControls
                  search={search}
                  onSearchChange={setSearch}
                  co2eRange={co2eRange}
                  onCo2eRangeChange={setCo2eRange}
                  showLines={showLines}
                  onShowLinesChange={setShowLines}
                  onRefresh={loadSegments}
                  loading={loading}
                  sourceCrs={selectedSourceCrs || crsOptions.defaultSourceCrs}
                  availableSourceCrs={crsOptions.allowedSourceCrs}
                  onSourceCrsChange={setSelectedSourceCrs}
                />
              </div>

              <Separator />

              <div>
                <h2 className="mb-2 text-sm font-semibold text-foreground">
                  Segments ({segments.length})
                </h2>
                <SegmentTable
                  segments={segments}
                  selectedId={selectedSegment?.id ?? null}
                  onSelect={handleSelectSegment}
                />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
