# Sprint 0 delivery note

Date: 2026-07-26

Status: completed for local execution.

## What was built

- Repository structure for the InfinityAtlas Climate & Health MRV Toolkit.
- Initial React/Vite frontend.
- Initial FastAPI backend/API.
- SQLAlchemy minimum data model.
- Alembic migration `0001_initial_schema`.
- Local SQLite database for immediate validation.
- Docker Compose configuration for PostgreSQL/PostGIS.
- `.env.example` without real secrets.
- Synthetic demo seed data.
- Local-only guard for the admin seed endpoint.
- Internationalization baseline with English default and Spanish selectable.
- README with installation instructions.
- Architecture diagram, backlog, risks, decisions and data dictionary.

## Minimum entities implemented

- User
- Role
- Project
- Territory
- Observation
- Evidence
- Validation
- ClimateData
- RiskScore

## Local URLs

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://127.0.0.1:8000`
- API docs: `http://127.0.0.1:8000/docs`

## Validation evidence

- Backend dependencies installed successfully.
- Alembic migration executed successfully.
- Seed data executed successfully and is idempotent.
- Backend Python modules compiled successfully.
- Frontend dependencies installed successfully.
- Frontend TypeScript and Vite production build completed successfully.
- API `/health` returned `status=ok`.
- API dashboard summary returned 1 project, 1 territory, 1 observation and 1 synthetic observation.
- Frontend local server returned HTTP 200.
- Seed endpoint is enabled only in local/development/test environments.
- HTTP check confirmed `POST /api/v1/admin/seed` returns 200 locally and 404 in `APP_ENV=production`.
- `pip-audit -r requirements.txt` returned no known vulnerabilities after dependency update.
- `pnpm audit --prod` returned no known production vulnerabilities.

## Scope and compliance guardrails

- No identifiable child data was added.
- No real community sensitive data was added.
- No UNICEF confidential document was copied into the app code.
- No real secret was stored.
- No microservices were introduced.
- No future InfinityAtlas modules were implemented.
- All demo records are synthetic and marked with `is_synthetic=true`.
- Visible frontend text was moved into translation files.

## Known limitations

- Docker is configured but was not validated because Docker is not available in this local environment.
- This folder is not currently initialized as a Git repository.
- Authentication and authorization are represented by minimum entities only; no login flow exists yet.
- The map is a frontend placeholder, not a real geospatial map.
- Climate data is a synthetic placeholder; the public source adapter belongs to Sprint 1.

## Next recommended task

Sprint 1 should build the first functional MRV flow:

`public climate data source -> observation creation -> evidence placeholder -> validation -> risk score -> dashboard/map -> exportable report`
