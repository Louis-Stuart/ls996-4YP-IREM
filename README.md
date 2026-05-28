# IREM

Integrated Road Emission Model (IREM) is a web application for exploring road-segment emissions data on an interactive map. It combines a React frontend with a FastAPI backend that serves the real emissions model from `server_python/emissions_model.py`.

The application is designed so confidential CSV inputs stay out of version control. Runtime data paths are supplied through `.env`, while the frontend consumes a stable API contract and renders map geometry in `EPSG:4326`.

## Overview

The system has two main parts:

- Frontend: React, TypeScript, Vite, Tailwind CSS, and Leaflet
- Backend: FastAPI, `pyproj`, and the vendor emissions model in `server_python/emissions_model.py`

High-level data flow:

```text
Confidential CSV files
        |
        v
server_python/emissions_model.py
        |
        v
FastAPI service layer (/api/*)
        |
        v
React + Leaflet frontend
```

## Key Features

- Interactive map of road segments and emission factor output
- Filtering by visible map bounds, search text, and emission range
- Backend-configurable CSV paths via `.env`
- Frontend control over the backend source CRS selection
- Fixed map rendering in `EPSG:4326` for compatibility with Leaflet
- Backend and frontend test coverage for integration-critical behavior

## Technology Stack

### Frontend

- React 18
- TypeScript
- Vite
- Leaflet
- Tailwind CSS
- Vitest

### Backend

- Python
- FastAPI
- Uvicorn
- `pyproj`
- `pytest`

## Repository Structure

```text
.
├── public/                     Static assets served directly by Vite
├── server_python/              Python backend and emissions integration
│   ├── main.py                 FastAPI entrypoint
│   ├── settings.py             .env loading and backend configuration
│   ├── model_service.py        Thin service layer around EmissionsModel
│   ├── crs.py                  CRS validation and geometry transformation helpers
│   ├── emissions_model.py      Vendor emissions model logic
│   ├── tests/                  Backend pytest suite
│   └── requirements.txt        Backend Python dependencies
├── src/                        Frontend application source
│   ├── components/             UI and map-related components
│   ├── config/                 Shared frontend configuration values
│   ├── hooks/                  React hooks
│   ├── lib/                    Frontend utilities
│   ├── pages/                  Route-level pages
│   ├── services/               API client layer
│   ├── test/                   Frontend test setup
│   └── types/                  Shared frontend data types and helpers
├── .env.example                Example environment file with placeholders
├── index.html                  HTML entrypoint and favicon metadata
├── package.json                Frontend scripts and dependencies
└── README.md                   Project documentation
```

## Frontend Structure

The frontend is centered around a single main page:

- `src/pages/Index.tsx`: top-level screen composition, filter state, API loading, and layout
- `src/components/MapView.tsx`: Leaflet map rendering and bbox updates
- `src/components/FilterControls.tsx`: search, emission range, source CRS selector, and refresh
- `src/components/SegmentTable.tsx`: tabular list of currently loaded segments
- `src/components/SegmentDetails.tsx`: detail panel for a selected segment
- `src/components/EmissionLegend.tsx`: legend for low, medium, and high emission bands
- `src/services/api.ts`: typed calls to the FastAPI backend
- `src/types/roadSegment.ts`: canonical frontend data contract and helper functions

## Backend Structure

The backend keeps the model integration intentionally thin:

- `server_python/emissions_model.py`
  The source of truth for emissions calculation and base segment generation. The calculation logic is treated as vendor logic and should not be changed.

- `server_python/settings.py`
  Loads `.env`, validates required configuration, and resolves CSV file paths.

- `server_python/model_service.py`
  Wraps `EmissionsModel` with API-facing behavior such as source CRS selection and response transformation.

- `server_python/crs.py`
  Handles CRS normalization and geometry/bbox transformation.

- `server_python/main.py`
  Creates the FastAPI app and exposes the API routes.

## Getting Started

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Configure backend environment

Copy `.env.example` to `.env` and provide your local confidential CSV paths.

Example:

```env
VITE_API_BASE_URL=http://localhost:3001
EMISSIONS_SEGMENTS_CSV_PATH=/absolute/path/to/road_segments.csv
EMISSIONS_GEOMETRY_CSV_PATH=/absolute/path/to/segment_geometry.csv
EMISSIONS_SOURCE_CRS=EPSG:3857
EMISSIONS_DEFAULT_RESPONSE_CRS=EPSG:4326
EMISSIONS_ALLOWED_CRS=EPSG:3857,EPSG:4326
```

### 3. Install backend dependencies

```bash
cd server_python
pip install -r requirements.txt
```

### 4. Run the backend

From `server_python/`:

```bash
python main.py
```

Default backend URL:

```text
http://localhost:3001
```

### 5. Run the frontend

From the repository root:

```bash
npm run dev
```

Default frontend URL:

```text
http://localhost:8080
```

## Configuration

### Frontend environment variables

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL used by the frontend API client | `""` |

### Backend environment variables

| Variable | Description |
|---|---|
| `EMISSIONS_SEGMENTS_CSV_PATH` | Path to the confidential road-segment CSV |
| `EMISSIONS_GEOMETRY_CSV_PATH` | Path to the confidential geometry CSV |
| `EMISSIONS_SOURCE_CRS` | Default CRS used to interpret CSV geometry |
| `EMISSIONS_DEFAULT_RESPONSE_CRS` | API response CRS. Keep this as `EPSG:4326` for the current Leaflet frontend |
| `EMISSIONS_ALLOWED_CRS` | Comma-separated allowlist of source CRS codes exposed in the frontend selector |
| `CORS_ORIGIN` | Allowed CORS origin for the backend |
| `PORT` | Backend port |

## CRS Behavior

The application uses a deliberate split between source CRS and display CRS:

- The frontend map always renders in `EPSG:4326`
- The backend can interpret the CSV geometry using a selectable source CRS
- The API returns geometry in `EMISSIONS_DEFAULT_RESPONSE_CRS`
- For the current app, that response CRS should remain `EPSG:4326`

This means the source CRS selector in the frontend controls how the backend reads the CSV geometry, not how Leaflet renders the map.

Bounding-box behavior:

- The frontend sends bbox filters in `EPSG:4326`
- The backend transforms the bbox into the selected source CRS before applying spatial filtering

## API

### Health

- `GET /api/health`

Returns backend health metadata and loaded segment count.

### CRS options

- `GET /api/crs/options`

Returns:

- fixed response CRS used by the API
- default backend source CRS
- allowed source CRS values for the frontend selector

### List segments

- `GET /api/road-segments`

Supported query parameters:

- `bbox`
- `minCo2e`
- `maxCo2e`
- `q`
- `limit`
- `offset`
- `sourceCrs`

Example:

```text
/api/road-segments?bbox=0.0,52.0,0.2,52.3&minCo2e=0.1&sourceCrs=EPSG:3857
```

### Get one segment

- `GET /api/road-segments/{id}`

Optional query parameters:

- `sourceCrs`

## Testing

### Frontend

```bash
npm run test
```

### Backend

```bash
cd server_python
pytest
```

### Build

```bash
npm run build
```

## Notes

- Do not commit confidential CSV files.
- Use `.env` for all local confidential file paths.
- The committed `server_python/road_segments.csv` file should not be treated as a production data source.
- The emissions calculation behavior in `server_python/emissions_model.py` is intentionally preserved.
