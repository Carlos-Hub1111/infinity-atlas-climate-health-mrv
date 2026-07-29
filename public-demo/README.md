# InfinityAtlas public demonstration

Read-only public Sprint 1C surface for InfinityAtlas Climate & Health MRV Toolkit.

## Scope

- public dashboard metrics calculated in the server API;
- global filter state in the URL;
- real Open-Meteo climate context;
- Leaflet and OpenStreetMap map with safe public coordinates;
- bilingual public PDF and UTF-8 CSV downloads;
- managed D1 controlled demonstration records;
- `/api/health` database health check.

The deployment contains no login, write, seed or administrative endpoint. D1 migration rows are
explicitly marked as controlled, synthetic or public reference data. No operational records,
credentials, evidence, personal information or confidential documents are included.

## Local development

Requirements: Node.js 22 and pnpm.

```powershell
pnpm install --frozen-lockfile
pnpm dev
pnpm test
```

## Cloudflare Workers production

`wrangler.jsonc` is the production source of truth. It declares only the public Worker and the
separate public D1 binding `DB`. The D1 resource is created explicitly with `wrangler d1 create`,
and its non-secret identifier is recorded in the Wrangler configuration. Apply the tracked
migrations before the public UAT:

```powershell
pnpm build
pnpm deploy:dry-run
pnpm deploy
pnpm db:migrate:remote
pnpm deploy
```

The application uses same-origin API requests and intentionally sends no permissive CORS headers.
Production values are managed by Cloudflare and no secret is required by this read-only surface.
Wrangler authentication must be completed interactively by an authorized InfinityGaia account and
must never be stored in Git, scripts, screenshots or documentation.

The production Worker exposes only `GET` routes for the dashboard, climate, health, PDF and CSV.
There is no authentication, session, write, seed, audit or administrative route. The public D1
database is independent from `backend/local.db`.

## Attribution

- Weather: Open-Meteo, CC BY 4.0.
- Map: OpenStreetMap contributors, ODbL.
- Leaflet: BSD-2-Clause.

Prototype / controlled test - Not a validated field pilot.
