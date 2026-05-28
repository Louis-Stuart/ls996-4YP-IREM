import { EMISSION_LOW_THRESHOLD, EMISSION_MEDIUM_THRESHOLD } from "@/config/emissions";
import { getEmissionColor } from "@/types/roadSegment";

function formatThreshold(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toString();
}

const levels = [
  { label: `Low (<${formatThreshold(EMISSION_LOW_THRESHOLD)})`, level: "low" as const },
  {
    label: `Medium (${formatThreshold(EMISSION_LOW_THRESHOLD)}-${formatThreshold(EMISSION_MEDIUM_THRESHOLD)})`,
    level: "medium" as const,
  },
  { label: `High (>${formatThreshold(EMISSION_MEDIUM_THRESHOLD)})`, level: "high" as const },
];

export default function EmissionLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">Emission factor:</span>
      {levels.map((level) => (
        <span key={level.level} className="flex items-center gap-1">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ background: getEmissionColor(level.level) }}
          />
          {level.label}
        </span>
      ))}
    </div>
  );
}
