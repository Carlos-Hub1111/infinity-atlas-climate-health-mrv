# Sprint 1C-D Local UAT Package

This folder contains the local Product Owner review package for:

**Sprint 1C-D - Public UX, Reporting and Brand Hardening**

The package is public-safe and contains no credentials, internal users, private
audit events, restricted evidence, confidential proposal documents, or internal
databases.

## Baseline

- Branch: `feature/sprint-1c-dashboard-map-reporting`
- Baseline and currently deployed application commit:
  `a27fde531f7aac50755f3e30fbd2d921731624e3`
- Active Cloudflare Worker version before this micro-sprint:
  `51ebd40e-ccc6-42ca-ad4a-49ec31a4d34f`
- Public URL:
  <https://infinityatlas-public-demo.infinitygaia.workers.dev>
- No Sprint 1C-D redeploy has been performed.

Pre-start checkpoint:

- File: `InfinityAtlas_Sprint1C-D_PreStart_a27fde531f7a_2026-07-29.zip`
- SHA-256:
  `EAC004B6451AA50858699C704D7DBE73D94C5990D15B01E17A5B4CD5CC944263`

## Review Artifacts

- `infinityatlas-1c-d-local-desktop.jpg`
- `infinityatlas-1c-d-local-mobile-390.jpg`
- `infinityatlas-territorial-intelligence-en.pdf`
- `infinityatlas-territorial-intelligence-es.pdf`
- `infinityatlas-public-technical.csv`

The public CSV schema is documented at:

- `public-demo/public/data/infinityatlas-public-data-dictionary.csv`

## Validation Results

- Backend: 36 tests passed.
- Internal frontend: 18 tests passed and production build completed.
- Public demo: 7 tests passed, lint passed and production build completed.
- Cloudflare dry run: passed; D1 `env.DB` and static assets recognized.
- Remote D1 read-only check: 6 observations, 1 climate snapshot, 0 pending
  migrations, 0 rows written.
- Dependency audit: no known Python or production Node vulnerabilities.
- Secret scan: no credential, token, private key, or functional secret pattern
  found in the Sprint 1C-D package.
- Responsive check: no horizontal overflow at the 390 px viewport.
- Keyboard check: bilingual D1 tooltip opens from focus/click and closes with
  Escape.
- Localization check: six controlled public record titles, labels, filters,
  map content and reports render in English and Spanish.
- Report check: four A4 pages in each language were rendered to images and
  visually reviewed.
- CSV check: UTF-8 BOM, 12 stable columns, 6 rows, ISO 8601 dates, empty
  coordinates for the hidden location, and no internal fields.

## Responsible Use

The public records are controlled demonstration data. High or critical
methodological scores do not represent real territorial emergencies.

This prototype does not claim UNICEF selection, financing, partnership,
endorsement, or institutional support. No UNICEF logo or distinctive mark is
included.

## Known Limitation

The generated PDF is text-extractable and visually verified, but `pdf-lib` does
not produce a fully tagged PDF/UA structure. Tagged PDF accessibility remains a
documented post-prototype improvement and does not affect the web dashboard's
keyboard or screen-reader semantics.
