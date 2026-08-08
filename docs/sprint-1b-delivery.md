# Sprint 1B delivery

Date: 2026-07-28

Branch: `feature/sprint-1b-validation-risk-rbac`

## Implemented

- Argon2 login by username or email.
- Signed JWT with expiry, server-side revocable session, active-state check and logout.
- Backend RBAC for administrator, monitor, validator and public access.
- Manual local demo-user bootstrap with optional explicit password reset.
- Validation transitions with mandatory comments for observed/rejected decisions.
- Transparent backend risk scoring and calculation snapshots.
- Append-only normal-API traceability.
- Territory timezone `Pacific/Galapagos` with UTC database storage.
- Role-specific English/Spanish interface and aggregate-only public view.
- Required short record title with an editable category/territory suggestion.
- Number/title search in observation and audit workspaces.
- Backend-enforced title editing and append-only `record_title_changed` traceability.
- Accessible bilingual public explanations for provenance, risk levels and the non-clinical formula.
- OpenAPI documentation and protected seed endpoint.

## Endpoints

| Method | Path | Access |
| --- | --- | --- |
| POST | `/api/v1/auth/login` | Public |
| GET | `/api/v1/auth/me` | Authenticated |
| POST | `/api/v1/auth/logout` | Authenticated |
| GET | `/api/v1/projects` | Admin, monitor, validator |
| GET | `/api/v1/territories` | Admin, monitor, validator |
| GET | `/api/v1/climate/current` | Admin, monitor, validator |
| POST | `/api/v1/observations` | Admin, monitor |
| GET | `/api/v1/observations` | Role and ownership scoped |
| GET | `/api/v1/observations/{id}` | Role and ownership scoped |
| PATCH | `/api/v1/observations/{id}` | Admin; owning monitor content while pending and title while pending/observed |
| POST | `/api/v1/observations/{id}/validation` | Admin, validator |
| GET | `/api/v1/observations/{id}/audit` | Role and ownership scoped |
| GET | `/api/v1/observations/{id}/risk-score` | Role and ownership scoped |
| GET | `/api/v1/public/summary` | Public aggregate |
| GET/PATCH | `/api/v1/admin/users...` | Admin |
| GET | `/api/v1/admin/audit` | Admin |
| POST | `/api/v1/admin/seed` | Local development plus admin |

## Controlled local acceptance

The browser acceptance created controlled observation `#5` in the local ignored database. It remained
traceable after refresh, received score `3 / low`, and then recorded:

1. `pending -> observed` with a methodological clarification comment;
2. `observed -> validated` after controlled clarification review.

This is a controlled prototype exercise, not a verified territorial event.

The formal Product Owner UAT subsequently created controlled observation `#6`, received score
`7 / moderate`, confirmed role restrictions and recorded `pending -> observed -> validated` with
comments and actors. The experience findings and their resolutions are documented in
`docs/sprint-1b-uat-findings.md`.

## Product Owner UAT hardening

- Accessible bilingual explanations for every aggregate public review status.
- Animated, locked and screen-reader-announced climate refresh state with explicit success and
  stored-data fallback messages.
- Navigable administrator audit with observation search, filters, ordering and observation-only
  timelines.
- Required short record titles, editable suggestions, role-based title corrections and searchable
  display as `#id — title — territory`.
- Accessible bilingual guidance for data provenance, risk levels and the methodological formula.
- Frontend and backend coverage for all five findings.

## Captures

- `docs/screenshots/sprint-1b/public-login.png`
- `docs/screenshots/sprint-1b/monitor-observation.png`
- `docs/screenshots/sprint-1b/validator-review.png`
- `docs/screenshots/sprint-1b/validator-validated.png`
- `docs/screenshots/sprint-1b/admin-users.png`
- `docs/screenshots/sprint-1b/admin-audit.png`
- `docs/screenshots/sprint-1b/final-record-title-desktop.png`
- `docs/screenshots/sprint-1b/final-public-guidance-mobile.png`

## Final automated verification

- Backend: 27 tests passed.
- Frontend: 14 tests passed.
- Frontend TypeScript and production build: passed.
- Mobile overlap and tooltip positioning: verified at the final responsive capture viewport.

## Scope intentionally excluded

No final dashboard, complete map, PDF report, mobile application, sensor integration, predictive AI or
additional module was started. These remain Sprint 1C or funded-phase work.
