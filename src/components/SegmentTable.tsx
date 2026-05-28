import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RoadSegment, getEmissionColor, getEmissionLevel, getSegmentEmissionUnit, getSegmentEmissionValue } from "@/types/roadSegment";

interface SegmentTableProps {
  segments: RoadSegment[];
  selectedId: string | null;
  onSelect: (segment: RoadSegment) => void;
}

export default function SegmentTable({ segments, selectedId, onSelect }: SegmentTableProps) {
  if (segments.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No segments in current view.
      </p>
    );
  }

  return (
    <div className="max-h-64 overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Emission</TableHead>
            <TableHead>Traffic</TableHead>
            <TableHead>Speed</TableHead>
            <TableHead className="text-right">Last Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {segments.map((segment) => {
            const co2e = getSegmentEmissionValue(segment);
            const unit = getSegmentEmissionUnit(segment);
            const level = getEmissionLevel(co2e);

            return (
              <TableRow
                key={segment.id}
                className={segment.id === selectedId ? "bg-muted" : ""}
                onClick={() => onSelect(segment)}
              >
                <TableCell className="font-medium">{segment.id}</TableCell>
                <TableCell>{segment.name || "-"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: getEmissionColor(level) }}
                    />
                    <span>
                      {co2e} <span className="text-xs text-muted-foreground">{unit}</span>
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {segment.trafficVolume ? Math.round(segment.trafficVolume.total) : "-"}
                </TableCell>
                <TableCell>{segment.speedLimit ? segment.speedLimit.value : "-"}</TableCell>
                <TableCell className="text-right">
                  {segment.lastUpdated ? new Date(segment.lastUpdated).toLocaleDateString() : "-"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
