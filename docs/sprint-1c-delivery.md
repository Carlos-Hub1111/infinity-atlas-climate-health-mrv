# Sprint 1C delivery

Date: 2026-07-28

Branch: `feature/sprint-1c-dashboard-map-reporting`

Origin checkpoint: `b61b1ce77b374f482a13f9b0295a09c15ec5a8f4`

## Implemented scope

- Sprint 1C-A: backend-owned dashboard metrics, trends, role indicators, global filters and five
  accessible Recharts visualizations.
- Sprint 1C-B: Leaflet/OpenStreetMap map, filter-consistent points, accessible record list and
  `exact`/`approximate`/`aggregate`/`hidden` geoprivacy.
- Sprint 1C-C: bilingual public/internal PDF, UTF-8 CSV, one-command local lifecycle, clean-demo
  procedure, controlled public deployment and evidence package.

## Endpoints

Public:

- `GET /health`
- `GET /api/v1/dashboard/public`
- `GET /api/v1/dashboard/trends`
- `GET /api/v1/map/observations`
- `GET /api/v1/climate/current?territory_id={id}`
- `GET /api/v1/reports/public.pdf`
- `GET /api/v1/exports/public.csv`

Authenticated:

- `GET /api/v1/dashboard/internal`
- `GET /api/v1/map/internal`
- `GET /api/v1/reports/internal.pdf`
- `GET /api/v1/exports/observations.csv`

Filters are validated in the backend. Internal endpoints retain existing RBAC and Monitor ownership
scope.

## Public deployment boundary

The internet demonstration under `public-demo/` is read-only. Its managed D1 database contains only
controlled/synthetic/public-reference rows. There are no login, write, seed or administrative routes,
and no secrets are required by the application.

## Verification

- local FastAPI health and public climate endpoint verified;
- desktop 1440 px and mobile 390 px verified without horizontal overflow;
- Leaflet tile pixels and public map points verified;
- English and Spanish PDF pages rendered and visually inspected;
- public CSV verified as UTF-8 with ISO 8601 dates;
- local start and stop scripts executed successfully;
- automated test, build, dependency, license and secret results are recorded in the final handoff.

## Known limitations

- Docker remains pending validation where Docker is unavailable.
- The public report links to the live map instead of embedding a static third-party tile image.
- The prototype does not provide MFA, password recovery, production rate limiting, cryptographic
  audit immutability or a production disaster-recovery SLA.
- Open-Meteo free access is for evaluation/prototyping; funded use requires a reviewed plan,
  self-hosting or replacement source.
- OpenStreetMap production traffic requires an appropriate compliant tile provider.

Sprint 1C does not add mobile apps, sensors, predictive AI or future modules.
