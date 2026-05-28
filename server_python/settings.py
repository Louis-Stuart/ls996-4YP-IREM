from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Tuple

from pyproj import CRS


REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ENV_PATH = REPO_ROOT / ".env"
LEGACY_ENV_ALIASES = {
    "EMISSIONS_SEGMENTS_CSV_PATH": "ROAD_SEGMENTS_CSV_PATH",
    "EMISSIONS_GEOMETRY_CSV_PATH": "SEGMENT_GEOMETRY_CSV_PATH",
}


def load_env_file(env_path: Optional[Path] = None) -> None:
    path = env_path or DEFAULT_ENV_PATH
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()

        if value and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]

        os.environ.setdefault(key, value)


def normalize_crs(value: str, var_name: str) -> str:
    try:
        return CRS.from_user_input(value).to_string()
    except Exception as exc:  # pragma: no cover - pyproj error details are not stable
        raise ValueError(f"{var_name} is not a valid CRS.") from exc


def _read_required_env(name: str) -> str:
    value = os.environ.get(name)
    if value:
        return value.strip()

    legacy_name = LEGACY_ENV_ALIASES.get(name)
    if legacy_name:
        legacy_value = os.environ.get(legacy_name)
        if legacy_value:
            return legacy_value.strip()

    raise ValueError(f"Missing required environment variable: {name}")


def _read_path(name: str) -> Path:
    raw_value = _read_required_env(name)
    candidate = Path(raw_value).expanduser()
    if not candidate.is_absolute():
        candidate = (REPO_ROOT / candidate).resolve()

    if not candidate.exists():
        raise FileNotFoundError(f"Configured file for {name} was not found.")
    if not candidate.is_file():
        raise ValueError(f"Configured path for {name} is not a file.")

    return candidate


def _read_allowed_crs(default_source_crs: str) -> Tuple[str, ...]:
    raw_value = os.environ.get("EMISSIONS_ALLOWED_CRS", "EPSG:3857,EPSG:4326")
    values = [item.strip() for item in raw_value.split(",") if item.strip()]
    if not values:
        values = [default_source_crs]

    normalized = []
    for value in values:
        code = normalize_crs(value, "EMISSIONS_ALLOWED_CRS")
        if code not in normalized:
            normalized.append(code)

    if default_source_crs not in normalized:
        normalized.insert(0, default_source_crs)

    return tuple(normalized)


@dataclass(frozen=True)
class Settings:
    segments_csv_path: Path
    geometry_csv_path: Path
    source_crs: str
    default_response_crs: str
    allowed_crs: Tuple[str, ...]
    cors_origin: str = "*"


def load_settings(env_path: Optional[Path] = None) -> Settings:
    load_env_file(env_path)

    segments_csv_path = _read_path("EMISSIONS_SEGMENTS_CSV_PATH")
    geometry_csv_path = _read_path("EMISSIONS_GEOMETRY_CSV_PATH")
    source_crs = normalize_crs(os.environ.get("EMISSIONS_SOURCE_CRS", "EPSG:3857"), "EMISSIONS_SOURCE_CRS")
    default_response_crs = normalize_crs(
        os.environ.get("EMISSIONS_DEFAULT_RESPONSE_CRS", "EPSG:4326"),
        "EMISSIONS_DEFAULT_RESPONSE_CRS",
    )
    allowed_crs = _read_allowed_crs(source_crs)
    cors_origin = os.environ.get("CORS_ORIGIN", "*")

    return Settings(
        segments_csv_path=segments_csv_path,
        geometry_csv_path=geometry_csv_path,
        source_crs=source_crs,
        default_response_crs=default_response_crs,
        allowed_crs=allowed_crs,
        cors_origin=cors_origin,
    )
