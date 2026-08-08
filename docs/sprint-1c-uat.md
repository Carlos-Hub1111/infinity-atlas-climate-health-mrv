# Sprint 1C final UAT guide

## Local start

1. Run `.\start-local.ps1` from the repository root.
2. Open `http://127.0.0.1:5173`.
3. Keep all demo passwords in the local password manager or local console only.
4. Finish with `.\stop-local.ps1`.

## Public dashboard

1. Confirm InfinityAtlas, San Cristobal, period, `Pacific/Galapagos`, update time, API state and
   controlled prototype notice.
2. Confirm real Open-Meteo temperature, humidity, apparent temperature, precipitation, source and
   observation time.
3. Apply date/category/status/provenance/risk/territory/record filters.
4. Confirm counts, five visualizations, map and record list change consistently.
5. Clear filters and confirm the full aggregate view returns.
6. Switch English/Spanish and repeat at 390 px mobile width.

## Geoprivacy

1. Confirm map attribution and legend.
2. Select a public point and confirm only number, title, category, status, risk, provenance and date
   appear.
3. Confirm the public view does not show actors, validation comments, evidence, audit history,
   credentials or hidden coordinates.

## Roles

1. Monitor: confirm own metrics, own map, form access and no validation control.
2. Validator: confirm pending/observed queue, risk priority and review access.
3. Administrator: confirm general metrics, active users, recent activity, audit and authorized
   exports.

## Downloads

1. Download public PDF in English and Spanish; verify report identifier, period, climate, indicators,
   methodology, sources, limitations and prototype notice.
2. Download public CSV; verify UTF-8, ISO 8601 dates, provenance, status, score and methodology.
3. Confirm internal downloads require authentication and follow role scope.

## Public HTTPS demonstration

1. Confirm HTTPS and `/api/health`.
2. Reload and verify D1 records persist.
3. Confirm Open-Meteo refresh, map tiles, PDF and CSV.
4. Confirm no login or public write control exists.

Record any finding before Sprint 1C is frozen. Do not modify `main`, merge or open a PR until authorized INFINITYGAIA review approves the branch.
