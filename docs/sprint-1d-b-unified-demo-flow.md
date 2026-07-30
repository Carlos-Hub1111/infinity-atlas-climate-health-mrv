# Sprint 1D-B - Unified demonstration flow

## Scope

Sprint 1D-B connects the Central Access Portal to the approved Sprint 1C public dashboard while
preserving the institutional security boundary. It does not deploy institutional access, alter the
stable Cloudflare Worker, write to remote D1, or change the validation methodology.

## Local architecture

| Surface | Local URL | Storage | Access |
| --- | --- | --- | --- |
| Central Access Portal | `http://127.0.0.1:5173/` | None | Public entry |
| Approved public dashboard | `http://127.0.0.1:5173/#public` | Isolated local D1 | Read only |
| Institutional login | `http://127.0.0.1:5173/#institutional` | `backend/local.db` through FastAPI | Authenticated |
| Portal health | `http://127.0.0.1:5173/health.json` | None | Read only |
| Backend health | `http://127.0.0.1:8000/health` | Backend connectivity | Read only |

The public iframe loads `public-demo` from `http://127.0.0.1:4173`. It preserves the frozen Sprint 1C
filters, selection, PDF, CSV, climate, charts, map and geoprivacy implementation. A narrow,
origin-checked message exchanges only the active language between the public dashboard and portal.
The approved source is traceable to commit `0847739ef76447c60847cd68fd8549fbc536c72f`.

## Primary UNICEF demonstration

1. A Monitor signs in and creates a territorial observation. The backend assigns `pending`.
2. The Monitor can see only owned records and cannot call validation endpoints.
3. An Administrator signs in, opens the review queue and uses the existing validation service.
4. `pending -> observed`, `observed -> validated`, and authorized rejection require the established
   comments and transition rules.
5. Every action preserves actor, role, UTC time, previous state, next state and comment in append-only
   audit events.
6. Public publication remains a separate future authorization step. Creating or validating an
   internal record does not write it automatically into public D1.

## Optional Validator

The `validator` role, permissions, routes, models and historical tests remain intact. The
`demo-validator` account is excluded from the primary demonstration user list and is inactive while
`DEMO_VALIDATOR_ENABLED=false`. The login endpoint enforces the same flag even if a database operator
accidentally leaves the account active.

To reactivate this optional path locally:

1. Set `DEMO_VALIDATOR_ENABLED=true` in ignored `backend/.env`.
2. Set a distinct local `DEMO_VALIDATOR_PASSWORD` of at least 12 characters.
3. Run `.\.venv\Scripts\python.exe -m app.demo_users --reset-passwords` from `backend`.
4. Restart local services.

No credential value belongs in Git, screenshots, documentation or chat.

## Service availability indicator

The portal status checks three independent signals:

- the static Central Portal health resource;
- FastAPI `/health`;
- the public summary API.

All three available yields `Platform services available`. A subset yields `Services partially
available`. No available signal yields `Platform unavailable`. The bilingual tooltip exposes each
component result to keyboard, pointer, touch and assistive technology users.

## Security boundary

- Public D1 and `backend/local.db` remain separate.
- The public dashboard has no authentication or write endpoint.
- The public Worker rejects every method other than `GET` and `HEAD` with HTTP 405.
- RBAC is enforced by FastAPI, not by menu visibility.
- `demo-validator` cannot be reactivated through the normal admin interface while its configuration
  flag is false.
- Remote D1 is not modified by local startup or UAT.
- The stable Cloudflare public deployment remains unchanged.

## Local verification

- Backend: 38 automated tests passed; dependency consistency and Python compilation passed.
- Central Portal: 18 frontend tests passed; production build passed.
- Public dashboard: 9 tests passed; lint, build and Cloudflare dry run passed.
- Production dependency audits: zero known vulnerabilities.
- Complete public-demo audit: the two previously approved, development-only findings remain
  documented in `docs/demo/sprint-1c-d2s/`; neither is included in the Worker or browser assets.
- Remote D1 read-only verification: six controlled observations, one climate snapshot, zero pending
  migrations and zero rows written.
- Secret scan: no token, credential, private key or functional secret pattern in changed text files.

## UAT evidence

- `docs/demo/sprint-1d-b/central-portal-desktop-en.jpg`
- `docs/demo/sprint-1d-b/public-dashboard-integrated-desktop-es.jpg`
- Existing approved 390 px portal reference:
  `docs/demo/sprint-1d-a/portal-es-mobile-390-viewport.jpg`
- Existing approved 390 px frozen-dashboard reference:
  `docs/demo/sprint-1c-final-uat-corrections/InfinityAtlas_Seleccion_Mobile_390_ES.png`

## Proposed commit

`Complete Sprint 1D-B unified demo flow and public dashboard integration`
