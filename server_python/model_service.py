from __future__ import annotations

from typing import Any, Dict, List, Optional

from crs import canonical_crs, transform_bbox_to_source, transform_segment_geometry, transform_segments
from emissions_model import EmissionsModel
from settings import Settings


class EmissionsService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.model = EmissionsModel(
            dataset_path=str(settings.segments_csv_path),
            geom_path=str(settings.geometry_csv_path),
        )

    def resolve_source_crs(self, requested_crs: Optional[str]) -> str:
        if not requested_crs:
            return self.settings.source_crs

        canonical = canonical_crs(requested_crs)
        if canonical not in self.settings.allowed_crs:
            raise ValueError(f"Unsupported CRS: {requested_crs}")
        return canonical

    def get_segments(
        self,
        bbox: Optional[str] = None,
        min_co2: Optional[float] = None,
        max_co2: Optional[float] = None,
        query: Optional[str] = None,
        source_crs: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        resolved_source_crs = self.resolve_source_crs(source_crs)
        # The frontend always sends bbox in the fixed response CRS. Transform it
        # back into the selected source CRS before applying model filtering.
        source_bbox = transform_bbox_to_source(
            bbox,
            self.settings.default_response_crs,
            resolved_source_crs,
        )
        items = self.model.get_segments(
            bbox=source_bbox,
            min_co2=min_co2,
            max_co2=max_co2,
            query=query,
        )
        return transform_segments(items, resolved_source_crs, self.settings.default_response_crs)

    def get_segment_by_id(
        self,
        segment_id: str,
        source_crs: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        resolved_source_crs = self.resolve_source_crs(source_crs)
        segment = self.model.get_segment_by_id(segment_id)
        if not segment:
            return None
        return transform_segment_geometry(segment, resolved_source_crs, self.settings.default_response_crs)

    def get_total_count(self) -> int:
        return self.model.get_total_count()

    def get_crs_options(self) -> Dict[str, Any]:
        return {
            "responseCrs": self.settings.default_response_crs,
            "defaultSourceCrs": self.settings.source_crs,
            "allowedSourceCrs": list(self.settings.allowed_crs),
        }
