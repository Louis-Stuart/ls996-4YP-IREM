from __future__ import annotations

import warnings
from copy import deepcopy
from typing import Any, Dict, Iterable, List, Optional

from pyproj import CRS, Transformer


def canonical_crs(code: str) -> str:
    try:
        return CRS.from_user_input(code).to_string()
    except Exception as exc:
        raise ValueError(f"Unsupported CRS: {code}") from exc


def proj4_definition(code: str) -> str:
    with warnings.catch_warnings():
        warnings.filterwarnings(
            "ignore",
            message="You will likely lose important projection information.*",
            category=UserWarning,
        )
        return CRS.from_user_input(code).to_proj4()


def transform_bbox_to_source(
    bbox: Optional[str],
    request_crs: str,
    source_crs: str,
) -> Optional[str]:
    if not bbox or request_crs == source_crs:
        return bbox

    try:
        min_x, min_y, max_x, max_y = map(float, bbox.split(","))
    except ValueError:
        return bbox

    transformer = Transformer.from_crs(request_crs, source_crs, always_xy=True)
    corners = [
        transformer.transform(min_x, min_y),
        transformer.transform(min_x, max_y),
        transformer.transform(max_x, min_y),
        transformer.transform(max_x, max_y),
    ]

    xs = [point[0] for point in corners]
    ys = [point[1] for point in corners]
    return f"{min(xs)},{min(ys)},{max(xs)},{max(ys)}"


def transform_segment_geometry(
    segment: Dict[str, Any],
    source_crs: str,
    target_crs: str,
) -> Dict[str, Any]:
    if source_crs == target_crs:
        return deepcopy(segment)

    transformer = Transformer.from_crs(source_crs, target_crs, always_xy=True)
    transformed = deepcopy(segment)
    point = transformed["geometry"]["point"]
    point_x, point_y = transformer.transform(point["lon"], point["lat"])
    point["lat"] = point_y
    point["lon"] = point_x

    line = transformed["geometry"].get("line")
    if line and line.get("coordinates"):
        coordinates = []
        for x, y in line["coordinates"]:
            transformed_x, transformed_y = transformer.transform(x, y)
            coordinates.append([transformed_x, transformed_y])
        line["coordinates"] = coordinates

    return transformed


def transform_segments(
    segments: Iterable[Dict[str, Any]],
    source_crs: str,
    target_crs: str,
) -> List[Dict[str, Any]]:
    return [transform_segment_geometry(segment, source_crs, target_crs) for segment in segments]
