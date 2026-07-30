# Sprint 1D-A: Central Access Portal and Visual Identity

## Scope

Sprint 1D-A adds a bilingual conceptual entry point for InfinityAtlas:

- public information without authentication;
- institutional access through the existing login;
- a consistent InfinityAtlas header and official logo;
- visible ownership by INFINITYGAIA S.A.S. B.I.C.;
- platform availability and controlled-prototype notices;
- a return path to the Central Access Portal;
- responsive behavior at 390 px.

Authentication, role detection, RBAC and logout behavior remain the existing backend-owned
implementation. Their functional hardening belongs to Sprint 1D-B.

## Local navigation

| Surface | Local URL |
| --- | --- |
| Central portal | `http://127.0.0.1:5173/` |
| Public information | `http://127.0.0.1:5173/#public` |
| Institutional login | `http://127.0.0.1:5173/#institutional` |

Dashboard filters remain query parameters and preserve the active surface fragment.

## Security boundary

The portal does not grant permissions. Public and institutional data remain separated:

- public access uses authorized aggregate and geoprivacy-aware API projections;
- institutional access uses the existing authenticated FastAPI routes;
- the backend remains authoritative for role and ownership checks;
- no password, token or demo credential is present in portal code or screenshots;
- the stable public Worker and remote D1 database were not modified.

## Deployment model before institutional publication

| Component | Sprint 1D-A state |
| --- | --- |
| Cloudflare public Worker | Stable, public, read-only, unchanged |
| Public D1 | Remote, controlled public data, unchanged |
| Central portal | Local UAT only |
| Institutional frontend | Local only |
| FastAPI authentication and write API | Local only |
| Internal SQLite database | Local only and never exposed to the Internet |

An Internet deployment of institutional access requires explicit approval and a separate security
design for secrets, session transport, rate limiting, CORS, durable storage, backups and operational
monitoring.

## Verification

- frontend tests: 18 passed;
- TypeScript and Vite production build: passed;
- English and Spanish portal content: verified;
- public and institutional navigation: verified;
- active URL fragment retained after applying public filters;
- mobile viewport: 390 px with no horizontal overflow;
- official logo SHA-256 matches the public-demo asset;
- backend, remote D1 and stable public deployment: unchanged.
