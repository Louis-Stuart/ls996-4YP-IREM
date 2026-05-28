import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import EmissionLegend from "@/components/EmissionLegend";
import { EMISSION_LOW_THRESHOLD, EMISSION_MEDIUM_THRESHOLD } from "@/config/emissions";

describe("EmissionLegend", () => {
  it("renders labels from the shared emission thresholds", () => {
    render(<EmissionLegend />);

    expect(screen.getByText(`Low (<${EMISSION_LOW_THRESHOLD})`)).toBeInTheDocument();
    expect(
      screen.getByText(`Medium (${EMISSION_LOW_THRESHOLD}-${EMISSION_MEDIUM_THRESHOLD})`),
    ).toBeInTheDocument();
    expect(screen.getByText(`High (>${EMISSION_MEDIUM_THRESHOLD})`)).toBeInTheDocument();
  });
});
