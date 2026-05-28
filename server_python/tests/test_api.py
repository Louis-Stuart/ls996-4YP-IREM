from __future__ import annotations

import csv
import hashlib
import importlib
import inspect
import json
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pyproj import Transformer

import settings as settings_module
from emissions_model import predict_EF
from model_service import EmissionsService


PREDICT_EF_SOURCE_HASH = "b2ea9f1ec0b8f0d7343b9126536d846a5d4dcaa17604d18ec4ab4e7fbbaa6a8e"
EXPECTED_ROW_ONE_EMISSION = 1026.81279220757
DEFAULT_SOURCE_CRS = "EPSG:3857"
RESPONSE_CRS = "EPSG:4326"

SEGMENT_HEADERS = [
    "Section_La",
    "Road_Numbe",
    "Road_categ",
    "Speed_limi",
    "tas",
    "rain",
    "Car_prop",
    "LGV_prop",
    "HGV_prop",
    "Cars_BEV",
    "LGVs_BEV",
    "Cars_Diesel",
    "Cars_Petrol",
    "LGVs_Diesel",
    "LGVs_Petrol",
    "material",
    "Length",
    "DirectionS",
    "All_motor_",
    "meanthicc",
    "meanage",
    "Cars_HEV",
    "LGVs_HEV",
    "HGVs_Diesel",
    "HGVs_Petrol",
    "HGVs_HEV",
    "HGVs_BEV",
]

SEGMENT_ROWS = [
    {
        "Section_La": "seg-1",
        "Road_Numbe": "A10",
        "Road_categ": "TA",
        "Speed_limi": "30",
        "tas": "15",
        "rain": "600",
        "Car_prop": "0.7",
        "LGV_prop": "0.2",
        "HGV_prop": "0.1",
        "Cars_BEV": "0.05",
        "LGVs_BEV": "0.05",
        "Cars_Diesel": "0.3",
        "Cars_Petrol": "0.4",
        "LGVs_Diesel": "0.7",
        "LGVs_Petrol": "0.2",
        "material": "HFS",
        "Length": "1000",
        "DirectionS": "East",
        "All_motor_": "10000",
        "meanthicc": "40",
        "meanage": "5",
        "Cars_HEV": "0.25",
        "LGVs_HEV": "0.05",
        "HGVs_Diesel": "0.9",
        "HGVs_Petrol": "0.05",
        "HGVs_HEV": "0.03",
        "HGVs_BEV": "0.02",
    },
    {
        "Section_La": "seg-2",
        "Road_Numbe": "M11",
        "Road_categ": "PM",
        "Speed_limi": "60",
        "tas": "12",
        "rain": "300",
        "Car_prop": "0.55",
        "LGV_prop": "0.25",
        "HGV_prop": "0.2",
        "Cars_BEV": "0.08",
        "LGVs_BEV": "0.03",
        "Cars_Diesel": "0.25",
        "Cars_Petrol": "0.45",
        "LGVs_Diesel": "0.75",
        "LGVs_Petrol": "0.15",
        "material": "TSF",
        "Length": "1800",
        "DirectionS": "West",
        "All_motor_": "8000",
        "meanthicc": "35",
        "meanage": "8",
        "Cars_HEV": "0.22",
        "LGVs_HEV": "0.07",
        "HGVs_Diesel": "0.88",
        "HGVs_Petrol": "0.06",
        "HGVs_HEV": "0.04",
        "HGVs_BEV": "0.02",
    },
]

WGS84_GEOMETRY = [
    {
        "point": (52.2, 0.1),
        "coordinates": [(0.09, 52.19), (0.11, 52.21)],
    },
    {
        "point": (52.4, 0.4),
        "coordinates": [(0.39, 52.39), (0.41, 52.41)],
    },
]


def make_geometry_rows(source_crs: str) -> list[dict[str, str]]:
    if source_crs == RESPONSE_CRS:
        return [
            {
                "point": f"[{lat}, {lon}]",
                "coordinates": str([[x, y] for x, y in item["coordinates"]]),
            }
            for item in WGS84_GEOMETRY
            for lat, lon in [item["point"]]
        ]

    transformer = Transformer.from_crs(RESPONSE_CRS, source_crs, always_xy=True)
    rows: list[dict[str, str]] = []
    for item in WGS84_GEOMETRY:
        lat, lon = item["point"]
        point_x, point_y = transformer.transform(lon, lat)
        coordinates = [list(transformer.transform(x, y)) for x, y in item["coordinates"]]
        rows.append(
            {
                "point": f"[{point_y}, {point_x}]",
                "coordinates": str(coordinates),
            }
        )
    return rows


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def configure_env(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> tuple[Path, Path]:
    segments_path = tmp_path / "segments.csv"
    geometry_path = tmp_path / "geometry.csv"
    write_csv(segments_path, SEGMENT_HEADERS, SEGMENT_ROWS)
    write_csv(geometry_path, ["point", "coordinates"], make_geometry_rows(DEFAULT_SOURCE_CRS))

    monkeypatch.setenv("EMISSIONS_SEGMENTS_CSV_PATH", str(segments_path))
    monkeypatch.setenv("EMISSIONS_GEOMETRY_CSV_PATH", str(geometry_path))
    monkeypatch.setenv("EMISSIONS_SOURCE_CRS", DEFAULT_SOURCE_CRS)
    monkeypatch.setenv("EMISSIONS_DEFAULT_RESPONSE_CRS", RESPONSE_CRS)
    monkeypatch.setenv("EMISSIONS_ALLOWED_CRS", "EPSG:3857,EPSG:4326")
    monkeypatch.delenv("ROAD_SEGMENTS_CSV_PATH", raising=False)
    monkeypatch.delenv("SEGMENT_GEOMETRY_CSV_PATH", raising=False)

    return segments_path, geometry_path


def create_test_client(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> TestClient:
    configure_env(monkeypatch, tmp_path)

    sys.modules.pop("main", None)
    main_module = importlib.import_module("main")
    return TestClient(main_module.create_app())


def strip_geometry(segment: dict) -> dict:
    copy = dict(segment)
    copy.pop("geometry", None)
    return copy


def test_missing_segments_env_var_fails_clearly(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.delenv("EMISSIONS_SEGMENTS_CSV_PATH", raising=False)
    monkeypatch.delenv("EMISSIONS_GEOMETRY_CSV_PATH", raising=False)
    monkeypatch.delenv("ROAD_SEGMENTS_CSV_PATH", raising=False)
    monkeypatch.delenv("SEGMENT_GEOMETRY_CSV_PATH", raising=False)

    with pytest.raises(ValueError, match="EMISSIONS_SEGMENTS_CSV_PATH"):
        settings_module.load_settings(tmp_path / ".missing-env")


def test_missing_geometry_env_var_fails_clearly(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    segments_path = tmp_path / "segments.csv"
    write_csv(segments_path, SEGMENT_HEADERS, SEGMENT_ROWS[:1])

    monkeypatch.setenv("EMISSIONS_SEGMENTS_CSV_PATH", str(segments_path))
    monkeypatch.delenv("EMISSIONS_GEOMETRY_CSV_PATH", raising=False)
    monkeypatch.delenv("SEGMENT_GEOMETRY_CSV_PATH", raising=False)

    with pytest.raises(ValueError, match="EMISSIONS_GEOMETRY_CSV_PATH"):
        settings_module.load_settings(tmp_path / ".missing-env")


def test_model_loads_from_env_configured_csv_paths(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    configure_env(monkeypatch, tmp_path)
    settings = settings_module.load_settings(tmp_path / ".missing-env")
    service = EmissionsService(settings)

    assert service.get_total_count() == len(SEGMENT_ROWS)


def test_predict_ef_source_hash_is_unchanged() -> None:
    source_hash = hashlib.sha256(inspect.getsource(predict_EF).encode()).hexdigest()
    assert source_hash == PREDICT_EF_SOURCE_HASH


def test_integrated_flow_preserves_expected_emission_value(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    client = create_test_client(monkeypatch, tmp_path)

    response = client.get("/api/road-segments/seg-1")
    response.raise_for_status()
    payload = response.json()

    assert payload["emissionFactor"]["value"] == pytest.approx(EXPECTED_ROW_ONE_EMISSION)


def test_default_response_schema_is_preserved(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    segments_path, geometry_path = configure_env(monkeypatch, tmp_path)
    sys.modules.pop("main", None)
    main_module = importlib.import_module("main")
    client = TestClient(main_module.create_app())

    response = client.get("/api/road-segments")
    response.raise_for_status()
    payload = response.json()
    first_item = payload["items"][0]

    assert payload["count"] == len(SEGMENT_ROWS)
    assert {"id", "name", "roadCat", "geometry", "emissionFactor", "trafficVolume", "weather", "material", "speedLimit", "fuelTypes"} <= set(first_item.keys())
    assert {"point", "line"} <= set(first_item["geometry"].keys())
    assert {"lat", "lon"} <= set(first_item["geometry"]["point"].keys())
    assert first_item["geometry"]["line"]["type"] == "LineString"
    assert first_item["geometry"]["point"]["lat"] == pytest.approx(52.2, abs=1e-3)
    assert first_item["geometry"]["point"]["lon"] == pytest.approx(0.1, abs=1e-3)
    assert str(segments_path) not in json.dumps(payload)
    assert str(geometry_path) not in json.dumps(payload)


def test_source_crs_override_changes_geometry_only(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    client = create_test_client(monkeypatch, tmp_path)

    default_response = client.get("/api/road-segments")
    alternate_response = client.get("/api/road-segments", params={"sourceCrs": "EPSG:4326"})

    default_response.raise_for_status()
    alternate_response.raise_for_status()

    default_items = default_response.json()["items"]
    alternate_items = alternate_response.json()["items"]

    assert len(default_items) == len(alternate_items)
    assert [item["id"] for item in default_items] == [item["id"] for item in alternate_items]

    for default_item, alternate_item in zip(default_items, alternate_items):
        assert strip_geometry(default_item) == strip_geometry(alternate_item)
        assert default_item["geometry"] != alternate_item["geometry"]


def test_invalid_crs_is_rejected(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    client = create_test_client(monkeypatch, tmp_path)

    response = client.get("/api/road-segments", params={"sourceCrs": "EPSG:999999"})

    assert response.status_code == 400
    assert "Unsupported CRS" in response.json()["detail"]


def test_bbox_semantics_are_consistent_with_fixed_response_crs(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    client = create_test_client(monkeypatch, tmp_path)

    default_response = client.get("/api/road-segments", params={"bbox": "0.0,52.0,0.2,52.3"})
    default_response.raise_for_status()
    assert [item["id"] for item in default_response.json()["items"]] == ["seg-1"]

    explicit_source_response = client.get(
        "/api/road-segments",
        params={
            "bbox": "0.0,52.0,0.2,52.3",
            "sourceCrs": "EPSG:3857",
        },
    )
    explicit_source_response.raise_for_status()

    assert [item["id"] for item in explicit_source_response.json()["items"]] == ["seg-1"]


def test_existing_filters_still_work_with_source_crs_selection(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    client = create_test_client(monkeypatch, tmp_path)

    all_segments = client.get("/api/road-segments")
    all_segments.raise_for_status()
    emissions = {
        item["id"]: item["emissionFactor"]["value"]
        for item in all_segments.json()["items"]
    }
    midpoint = (emissions["seg-1"] + emissions["seg-2"]) / 2
    higher_id = max(emissions, key=emissions.get)
    lower_id = min(emissions, key=emissions.get)

    min_filtered = client.get("/api/road-segments", params={"minCo2e": midpoint, "sourceCrs": "EPSG:3857"})
    max_filtered = client.get("/api/road-segments", params={"maxCo2e": midpoint, "sourceCrs": "EPSG:3857"})
    query_filtered = client.get("/api/road-segments", params={"q": "M11", "sourceCrs": "EPSG:3857"})

    assert [item["id"] for item in min_filtered.json()["items"]] == [higher_id]
    assert [item["id"] for item in max_filtered.json()["items"]] == [lower_id]
    assert [item["id"] for item in query_filtered.json()["items"]] == ["seg-2"]


def test_single_segment_endpoint_honors_source_crs(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    client = create_test_client(monkeypatch, tmp_path)

    default_response = client.get("/api/road-segments/seg-1")
    alternate_response = client.get("/api/road-segments/seg-1", params={"sourceCrs": "EPSG:4326"})

    default_response.raise_for_status()
    alternate_response.raise_for_status()

    default_item = default_response.json()
    alternate_item = alternate_response.json()

    assert default_item["id"] == alternate_item["id"] == "seg-1"
    assert default_item["emissionFactor"] == alternate_item["emissionFactor"]
    assert strip_geometry(default_item) == strip_geometry(alternate_item)
    assert default_item["geometry"] != alternate_item["geometry"]
