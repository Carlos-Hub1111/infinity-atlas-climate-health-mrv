# Technical backlog

## Sprint 0 - Architecture and skeleton

Status: completed and frozen at commit `00e0bb268c677899a9fd728a971ce246643b37ca`.

## Sprint 1A - Climate, territory and observation

Status: completed and frozen at commit `2086d25289908a4438ed53cd6efbbae74dd76aa9`.

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

Status: implemented on `feature/sprint-1b-validation-risk-rbac`, pending final freeze approval.

- Argon2 authentication, revocable JWT sessions and logout.
- Backend-enforced admin, monitor, validator and public roles.
- Reviewer workflow, comments and state transition rules.
- Transparent risk formula and versioned score snapshots.
- Append-only audit events and territory timezone.
- English/Spanish role workspaces and aggregate-only public view.
- Searchable short record titles with role-based edits and append-only history.
- Accessible public guidance for workflow state, provenance and risk.

## Sprint 1C - Dashboard, map, report and public view

Status: not authorized and not started.

- Operational dashboard.
- Real geospatial map.
- Report generation.
- Public-safe observation view.

## Later hardening

- Production identity provider, MFA, recovery and HttpOnly cookie architecture.
- Private evidence object storage and malware scanning.
- PostgreSQL/PostGIS Docker validation.
- Accessibility and user testing.
- Production provider and commercial-use review.
- Tamper-evident external audit retention.
