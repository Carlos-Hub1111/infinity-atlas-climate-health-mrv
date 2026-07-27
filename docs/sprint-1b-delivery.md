# Sprint 1B delivery

Date: 2026-07-26

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
| PATCH | `/api/v1/observations/{id}` | Admin or owning monitor while pending |
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

## Captures

- `docs/screenshots/sprint-1b/public-login.png`
- `docs/screenshots/sprint-1b/monitor-observation.png`
- `docs/screenshots/sprint-1b/validator-review.png`
- `docs/screenshots/sprint-1b/validator-validated.png`
- `docs/screenshots/sprint-1b/admin-users.png`
- `docs/screenshots/sprint-1b/admin-audit.png`

## Scope intentionally excluded

No final dashboard, complete map, PDF report, mobile application, sensor integration, predictive AI or
additional module was started. These remain Sprint 1C or funded-phase work.
