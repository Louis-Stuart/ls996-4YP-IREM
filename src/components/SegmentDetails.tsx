import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoadSegment, getEmissionColor, getEmissionLevel, getSegmentEmissionUnit, getSegmentEmissionValue } from "@/types/roadSegment";

interface SegmentDetailsProps {
  segment: RoadSegment;
  onClose: () => void;
}

export default function SegmentDetails({ segment, onClose }: SegmentDetailsProps) {
  const co2e = getSegmentEmissionValue(segment);
  const unit = getSegmentEmissionUnit(segment);
  const level = getEmissionLevel(co2e);

  return (
    <Card className="max-h-[80vh] overflow-y-auto border-0 shadow-none">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="text-base">{segment.name || segment.id}</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">{segment.id}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ background: getEmissionColor(level) }}
          />
          <span className="font-semibold">
            {co2e} {unit}
          </span>
          <Badge variant="outline" className="text-xs capitalize">
            {level}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          {segment.roadCat && (
            <div>
              <span className="block text-muted-foreground">Road Category</span>
              <p className="font-medium capitalize">{segment.roadCat}</p>
            </div>
          )}
          {segment.speedLimit && (
            <div>
              <span className="block text-muted-foreground">Speed Limit</span>
              <p className="font-medium">
                {segment.speedLimit.value} {segment.speedLimit.unit}
              </p>
            </div>
          )}
        </div>

        {segment.trafficVolume && (
          <div className="border-t pt-2">
            <h4 className="mb-1 text-xs font-semibold">Traffic Volume</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div>
                <span className="text-muted-foreground">Total</span>: {segment.trafficVolume.total}
              </div>
              <div>
                <span className="text-muted-foreground">Cars</span>: {segment.trafficVolume.cars}
              </div>
              <div>
                <span className="text-muted-foreground">LGVs</span>: {segment.trafficVolume.LGVs}
              </div>
              <div>
                <span className="text-muted-foreground">HGVs</span>: {segment.trafficVolume.HGVs}
              </div>
            </div>
          </div>
        )}

        {segment.weather && (
          <div className="border-t pt-2">
            <h4 className="mb-1 text-xs font-semibold">Weather Conditions</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div>
                <span className="text-muted-foreground">Temp</span>: {segment.weather.tas} {segment.weather.tasUnit}
              </div>
              <div>
                <span className="text-muted-foreground">Rainfall</span>: {segment.weather.rainfall} {segment.weather.rainfallUnit}
              </div>
            </div>
          </div>
        )}

        {segment.material && (
          <div className="border-t pt-2">
            <h4 className="mb-1 text-xs font-semibold">Road Material</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="col-span-2">
                <span className="text-muted-foreground">Type</span>: {segment.material.type}
              </div>
              <div>
                <span className="text-muted-foreground">Thickness</span>: {segment.material.thickness} {segment.material.thicknessUnit}
              </div>
              <div>
                <span className="text-muted-foreground">Age</span>: {segment.material.age} {segment.material.ageUnit}
              </div>
            </div>
          </div>
        )}

        {segment.fuelTypes && (
          <div className="border-t pt-2">
            <h4 className="mb-1 text-xs font-semibold">Fuel Types (Cars)</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div>Diesel: {(segment.fuelTypes.cars.diesel * 100).toFixed(1)}%</div>
              <div>Petrol: {(segment.fuelTypes.cars.petrol * 100).toFixed(1)}%</div>
              <div>Hybrid: {(segment.fuelTypes.cars.hybrid * 100).toFixed(1)}%</div>
              <div>BEV: {(segment.fuelTypes.cars.BEV * 100).toFixed(1)}%</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
