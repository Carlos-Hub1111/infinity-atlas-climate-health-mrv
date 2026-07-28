# Sprint 1C-B - Territorial Map and Geoprivacy

## Scope completed

- Leaflet map centered on San Cristobal with OpenStreetMap attribution.
- Risk is represented by both color and a letter symbol.
- Provenance is represented by marker shape/border and visible text.
- Popups contain only record number, short title, category, status,
  methodological risk, provenance, date, and controlled-test notice.
- An adjacent text list provides the same record summary without requiring map
  interaction.
- Center, zoom, keyboard navigation, responsive layout, legend, and empty state
  are available.
- Dashboard filters are passed unchanged to the map endpoint.

## Privacy modes

| Mode | Public behavior |
| --- | --- |
| `exact` | Stored coordinate is returned. |
| `approximate` | Coordinate is rounded to configured precision. |
| `aggregate` | Territory reference coordinate is returned. |
| `hidden` | No public coordinate is returned. |

New observations default to `approximate`. The local prototype uses three
decimal places. Authorized internal endpoints retain role-scoped access to the
stored coordinate.

## API

- `GET /api/v1/map/observations`
- `GET /api/v1/map/internal`

The public contract does not include actor, responsible role, evidence,
validation comments, credentials, or audit history.

## Components and licenses

- Leaflet `1.9.4`: BSD-2-Clause.
- OpenStreetMap tiles/data: visible contributor attribution required.

The React-specific Leaflet wrapper was removed after its installed release
declared a license that was not suitable for this MIT institutional prototype.

## Verification

- Backend: 32 tests passed.
- Frontend: 17 tests passed.
- Frontend production build: passed.
- Local database migrated to `0005_sprint_1c_geo`; integrity check returned
  `ok`.
