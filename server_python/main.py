from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import os

from model_service import EmissionsService
from settings import Settings, load_settings

class PointCoord(BaseModel):
    lat: float
    lon: float

class LineGeometry(BaseModel):
    type: str = "LineString"
    coordinates: List[List[float]]

class SegmentGeometry(BaseModel):
    point: PointCoord
    line: Optional[LineGeometry] = None

class EmissionFactor(BaseModel):
    value: float
    unit: str

class TrafficVolume(BaseModel):
    cars: float
    LGVs: float
    HGVs: float
    total: float

class Weather(BaseModel):
    tas: float
    tasUnit: str
    rainfall: float
    rainfallUnit: str

class Material(BaseModel):
    type: str
    thickness: float
    thicknessUnit: str
    age: float
    ageUnit: str

class SpeedLimit(BaseModel):
    value: float
    unit: str

class FuelTypeBreakdown(BaseModel):
    diesel: float
    petrol: float
    hybrid: float
    BEV: float

class FuelTypes(BaseModel):
    cars: FuelTypeBreakdown
    LGVs: FuelTypeBreakdown
    HGVs: FuelTypeBreakdown

class RoadSegment(BaseModel):
    id: str
    name: Optional[str] = None
    roadCat: Optional[str] = None
    geometry: SegmentGeometry
    emissionFactor: EmissionFactor
    trafficVolume: Optional[TrafficVolume] = None
    weather: Optional[Weather] = None
    material: Optional[Material] = None
    speedLimit: Optional[SpeedLimit] = None
    fuelTypes: Optional[FuelTypes] = None
    lastUpdated: Optional[str] = None
    source: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    count: int

class RoadSegmentsResponse(BaseModel):
    count: int
    items: List[RoadSegment]

class CrsOptionsResponse(BaseModel):
    responseCrs: str
    defaultSourceCrs: str
    allowedSourceCrs: List[str]


def create_app(settings: Optional[Settings] = None) -> FastAPI:
    resolved_settings = settings or load_settings()
    service = EmissionsService(resolved_settings)

    app = FastAPI()
    app.state.service = service
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[resolved_settings.cors_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health", response_model=HealthResponse)
    async def health_check():
        return {
            "status": "ok",
            "timestamp": datetime.now().isoformat(),
            "count": service.get_total_count(),
        }

    @app.get("/api/crs/options", response_model=CrsOptionsResponse)
    async def get_crs_options():
        return service.get_crs_options()

    @app.get("/api/road-segments", response_model=RoadSegmentsResponse)
    async def list_segments(
        bbox: Optional[str] = None,
        minCo2e: Optional[float] = None,
        maxCo2e: Optional[float] = None,
        q: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
        crs: Optional[str] = None,
        sourceCrs: Optional[str] = None,
    ):
        try:
            items = service.get_segments(
                bbox=bbox,
                min_co2=minCo2e,
                max_co2=maxCo2e,
                query=q,
                source_crs=sourceCrs or crs,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        paged_items = items[offset: offset + limit]
        return {
            "count": len(items),
            "items": paged_items,
        }

    @app.get("/api/road-segments/{id}", response_model=RoadSegment)
    async def get_segment(id: str, crs: Optional[str] = None, sourceCrs: Optional[str] = None):
        try:
            seg = service.get_segment_by_id(id, source_crs=sourceCrs or crs)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        if not seg:
            raise HTTPException(status_code=404, detail="Segment not found")
        return seg

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 3001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
