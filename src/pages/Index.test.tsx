import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Index from "@/pages/Index";

vi.mock("@/hooks/useDebounce", () => ({
  useDebounce: (value: unknown) => value,
}));

vi.mock("@/components/MapView", () => ({
  default: ({ onBoundsChange }: { onBoundsChange: (bbox: string) => void }) => (
    <div>
      <div data-testid="map-response-crs">EPSG:4326</div>
      <button type="button" onClick={() => onBoundsChange("0,0,1,1")}>
        Emit bounds
      </button>
    </div>
  ),
}));

const crsOptions = {
  responseCrs: "EPSG:4326",
  defaultSourceCrs: "EPSG:3857",
  allowedSourceCrs: ["EPSG:3857", "EPSG:4326"],
};

const segment4326 = {
  id: "seg-1",
  name: "A10",
  roadCat: "TA",
  geometry: {
    point: { lat: 52.2, lon: 0.1 },
    line: { type: "LineString", coordinates: [[0.09, 52.19], [0.11, 52.21]] },
  },
  emissionFactor: { value: 1026.81279220757, unit: "kgCO2/vehicle" },
  trafficVolume: { cars: 7000, LGVs: 2000, HGVs: 1000, total: 10000 },
  weather: { tas: 15, tasUnit: "C", rainfall: 600, rainfallUnit: "mm/year" },
  material: { type: "HFS", thickness: 40, thicknessUnit: "mm", age: 5, ageUnit: "years" },
  speedLimit: { value: 30, unit: "mph" },
  fuelTypes: {
    cars: { diesel: 0.3, petrol: 0.4, hybrid: 0.25, BEV: 0.05 },
    LGVs: { diesel: 0.7, petrol: 0.2, hybrid: 0.05, BEV: 0.05 },
    HGVs: { diesel: 0.9, petrol: 0.05, hybrid: 0.03, BEV: 0.02 },
  },
};

const segmentFrom4326Source = {
  ...segment4326,
  geometry: {
    point: { lat: 40.7128, lon: -74.006 },
    line: { type: "LineString", coordinates: [[-74.01, 40.71], [-74.0, 40.72]] },
  },
};

function jsonResponse(body: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
  });
}

describe("Index", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
  });

  it("renders the backend source CRS selector with the default value and allowed options", async () => {
    const fetchMock = vi.fn((input: string) => {
      const url = new URL(input);
      if (url.pathname === "/api/crs/options") {
        return jsonResponse(crsOptions);
      }
      return jsonResponse({ count: 1, items: [segment4326] });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<Index />);

    await screen.findByText("A10");
    const trigger = screen.getByRole("combobox", { name: "Backend source CRS" });
    expect(trigger).toHaveValue("EPSG:3857");
    expect(screen.getByRole("option", { name: "EPSG:3857" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "EPSG:4326" })).toBeInTheDocument();
  });

  it("changing the backend source CRS triggers a refetch and keeps emission values stable", async () => {
    const requestUrls: string[] = [];
    const fetchMock = vi.fn((input: string) => {
      const url = new URL(input);
      requestUrls.push(url.toString());

      if (url.pathname === "/api/crs/options") {
        return jsonResponse(crsOptions);
      }

      if (url.searchParams.get("sourceCrs") === "EPSG:4326") {
        return jsonResponse({ count: 1, items: [segmentFrom4326Source] });
      }

      return jsonResponse({ count: 1, items: [segment4326] });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<Index />);

    await screen.findByText("A10");
    expect(screen.getByText(/1026\.81279220757/)).toBeInTheDocument();
    expect(screen.getByText("kgCO2/vehicle")).toBeInTheDocument();
    expect(requestUrls.some((url) => url.includes("sourceCrs=EPSG%3A3857"))).toBe(true);

    const trigger = screen.getByRole("combobox", { name: "Backend source CRS" });
    fireEvent.change(trigger, { target: { value: "EPSG:4326" } });

    await waitFor(() => {
      expect(requestUrls.some((url) => url.includes("sourceCrs=EPSG%3A4326"))).toBe(true);
    });

    expect(screen.getByText(/1026\.81279220757/)).toBeInTheDocument();
    expect(screen.getByText("kgCO2/vehicle")).toBeInTheDocument();
    expect(screen.getByTestId("map-response-crs")).toHaveTextContent("EPSG:4326");
  });

  it("keeps existing filters functional while including the selected backend source CRS", async () => {
    const requestUrls: string[] = [];
    const fetchMock = vi.fn((input: string) => {
      const url = new URL(input);
      requestUrls.push(url.toString());

      if (url.pathname === "/api/crs/options") {
        return jsonResponse(crsOptions);
      }

      const query = url.searchParams.get("q");
      if (query === "A10") {
        return jsonResponse({ count: 1, items: [segment4326] });
      }

      return jsonResponse({ count: 1, items: [segment4326] });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<Index />);

    await screen.findByText("A10");

    const trigger = screen.getByRole("combobox", { name: "Backend source CRS" });
    fireEvent.change(trigger, { target: { value: "EPSG:4326" } });

    const searchInput = screen.getByPlaceholderText("Search segments...");
    fireEvent.change(searchInput, { target: { value: "A10" } });

    await waitFor(() => {
      expect(requestUrls.some((url) => url.includes("q=A10") && url.includes("sourceCrs=EPSG%3A4326"))).toBe(true);
    });

    fireEvent.click(screen.getByRole("button", { name: "Emit bounds" }));

    await waitFor(() => {
      expect(requestUrls.some((url) => url.includes("bbox=0%2C0%2C1%2C1") && url.includes("sourceCrs=EPSG%3A4326"))).toBe(true);
    });
  });
});
