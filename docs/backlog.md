# Technical backlog

## Sprint 0 - Architecture and skeleton

Status: completed and frozen at commit `00e0bb268c677899a9fd728a971ce246643b37ca`.

## Sprint 1A - Climate, territory and observation

Status: implemented on `feature/sprint-1a-climate-observation`, pending final review.

- Public San Cristobal reference territory.
- Open-Meteo adapter with timeout and validation.
- Database-backed climate cache and stale fallback.
- Attributed climate endpoint and OpenAPI description.
- Bilingual observation form.
- URL evidence reference.
- Pending observation persistence and list.
- Backend and frontend automated tests.
- Demonstration screenshots.

## Sprint 1B - Validation, risk score and traceability

Status: not authorized and not started.

- Reviewer workflow and role boundary.
- Validation records and comments.
- Transparent risk formula and versioning.
- Confidence and audit events.
- Full state transition rules.

## Sprint 1C - Dashboard, map, report and public view

Status: not authorized and not started.

- Operational dashboard.
- Real geospatial map.
- Report generation.
- Public-safe observation view.

## Later hardening

- Authentication and role-based access.
- Private evidence object storage and malware scanning.
- PostgreSQL/PostGIS Docker validation.
- Accessibility and user testing.
- Production provider and commercial-use review.
