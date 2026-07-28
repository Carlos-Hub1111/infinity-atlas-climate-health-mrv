# Sprint 1C-A - Dashboard, Metrics, Charts and Filters

## Scope completed

- Public and role-scoped dashboard contracts are calculated by the backend.
- The default public scope is San Cristobal and `Pacific/Galapagos`.
- Global filters cover dates, category, review status, provenance, risk level,
  territory, and record number or title.
- Applied filters are represented in the browser URL.
- Public indicators distinguish review state, provenance, and methodological
  risk level.
- Role summaries expose only permission-appropriate aggregate data.
- Five focused visualizations cover review status, risk, category, time, and
  provenance.
- Every chart has a title, short explanation, accessible text summary, and
  empty state.
- Current Open-Meteo conditions remain visibly attributed and may be refreshed
  independently from the territorial observation workflow.

## API

- `GET /api/v1/dashboard/public`
- `GET /api/v1/dashboard/internal`
- `GET /api/v1/dashboard/trends`

All filter values are validated by FastAPI. The frontend displays the returned
metrics and does not recalculate institutional counts.

## Open-source component

Recharts `3.10.1` is used for charts under the MIT License. Color supports the
labels and numeric values; it is not the only means of communicating state.

## Verification

- Backend: 30 tests passed.
- Frontend: 16 tests passed.
- Frontend production build: passed.
- Empty results, bilingual labels, URL filter state, role scope, and safe public
  contracts are covered by automated tests.

## Known limitation

The chart library currently produces a JavaScript bundle-size warning. This is
not a functional failure; route-level code splitting remains a production
optimization candidate.
