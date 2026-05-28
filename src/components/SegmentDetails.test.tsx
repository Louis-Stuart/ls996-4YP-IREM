import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SegmentDetails from "@/components/SegmentDetails";

const canonicalSegment = {
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

describe("SegmentDetails", () => {
  it("renders canonical backend fields without legacy aliases", () => {
    render(<SegmentDetails segment={canonicalSegment} onClose={vi.fn()} />);

    expect(screen.getByText("A10")).toBeInTheDocument();
    expect(screen.getByText("TA")).toBeInTheDocument();
    expect(screen.getByText(/1026\.81279220757 kgCO2\/vehicle/)).toBeInTheDocument();
    expect(screen.getByText("30 mph")).toBeInTheDocument();
  });
});
