import { Search, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

interface FilterControlsProps {
  search: string;
  onSearchChange: (value: string) => void;
  co2eRange: [number, number];
  onCo2eRangeChange: (value: [number, number]) => void;
  showLines: boolean;
  onShowLinesChange: (value: boolean) => void;
  onRefresh: () => void;
  loading: boolean;
  sourceCrs: string;
  availableSourceCrs: string[];
  onSourceCrsChange: (value: string) => void;
}

export default function FilterControls({
  search,
  onSearchChange,
  co2eRange,
  onCo2eRangeChange,
  showLines,
  onShowLinesChange,
  onRefresh,
  loading,
  sourceCrs,
  availableSourceCrs,
  onSourceCrsChange,
}: FilterControlsProps) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search segments..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Emission factor range: {co2eRange[0]} - {co2eRange[1]}
        </Label>
        <Slider
          min={0}
          max={5}
          step={0.1}
          value={co2eRange}
          onValueChange={(value) => onCo2eRangeChange(value as [number, number])}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="crs-select" className="text-xs text-muted-foreground">
          Backend source CRS
        </Label>
        <select
          id="crs-select"
          aria-label="Backend source CRS"
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={sourceCrs}
          onChange={(event) => onSourceCrsChange(event.target.value)}
        >
          {availableSourceCrs.map((crs) => (
            <option key={crs} value={crs}>
              {crs}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={showLines} onCheckedChange={onShowLinesChange} id="lines-toggle" />
        <Label htmlFor="lines-toggle" className="cursor-pointer text-sm">
          Show road lines
        </Label>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
    </div>
  );
}
