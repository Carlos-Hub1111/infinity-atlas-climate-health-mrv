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

`.openai/hosting.json` declares the logical D1 binding `DB`; Sites owns the deployed resource.

## Attribution

- Weather: Open-Meteo, CC BY 4.0.
- Map: OpenStreetMap contributors, ODbL.
- Leaflet: BSD-2-Clause.

Prototype / controlled test - Not a validated field pilot.
