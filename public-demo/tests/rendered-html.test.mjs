import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps the public surface branded and free of starter code", async () => {
  const [page, layout, dashboard, css, packageJson, dashboardRoute] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/PublicDashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/api/dashboard/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /<PublicDashboard \/>/);
  assert.match(layout, /InfinityAtlas Climate & Health MRV Toolkit/);
  assert.match(dashboard, /InfinityAtlas/);
  assert.match(dashboard, /San Cristobal/);
  assert.match(dashboard, /Controlled public demonstration/);
  assert.match(dashboard, /\/api\/dashboard/);
  assert.match(dashboard, /\/api\/climate/);
  assert.match(dashboard, /\/api\/report\.pdf/);
  assert.match(dashboard, /\/api\/export\.csv/);
  assert.match(dashboard, /OpenStreetMap/);
  assert.match(dashboard, /await import\("leaflet"\)/);
  assert.doesNotMatch(dashboard, /import L from "leaflet"/);
  assert.match(dashboard, /Stored real observation/);
  assert.match(dashboard, /Observación real almacenada/);
  assert.match(css, /@media \(max-width: 440px\)/);
  assert.match(packageJson, /"leaflet": "1\.9\.4"/);
  assert.match(dashboardRoute, /public_location_mode/);
  assert.match(dashboardRoute, /prototype_notice/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(dashboard, /Your site is taking shape/);
});

test("keeps deployment health and climate routes portable", async () => {
  const [healthAlias, climateRoute, reportRoute] = await Promise.all([
    readFile(new URL("../app/health/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/climate/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/report.pdf/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(healthAlias, /api\/health\/route/);
  assert.match(climateRoute, /AbortController/);
  assert.match(climateRoute, /climateSnapshots/);
  assert.match(climateRoute, /is_stale: true/);
  assert.match(reportRoute, /climateSnapshots/);
  assert.match(reportRoute, /Stored fallback/);
  assert.match(climateRoute, /stale-while-revalidate=900/);
  assert.doesNotMatch(climateRoute, /cacheEverything|cacheTtl/);
});
