# Sprint 1C Cloudflare Public Deployment and Anonymous UAT

## Deployment record

- Product: InfinityAtlas Climate & Health MRV Toolkit
- Environment: controlled public demonstration, read-only
- Territory: San Cristobal, Galapagos, Ecuador
- Branch: `feature/sprint-1c-dashboard-map-reporting`
- Application code deployed: `c565aa8f1152abfec02e6f38415fed6f527e04be`
- Deployment time: `2026-07-29T13:44:42.761Z`
- Cloudflare account: `carlos.cifuentes@infinitygaia.org`
- Worker: `infinityatlas-public-demo`
- Worker Version ID: `4208585c-7238-4d4b-914a-27d549a63985`
- Deployment ID: `db942f57-3579-4069-b4e0-ca8f54a5a37c`
- Active traffic: 100 percent on the recorded Worker version
- Public URL: <https://infinityatlas-public-demo.infinitygaia.workers.dev>
- Health URL: <https://infinityatlas-public-demo.infinitygaia.workers.dev/health>
- D1 database: `infinityatlas-public-demo-db`
- D1 binding: `env.DB`
- Asset binding: `env.ASSETS`

The deployed package contained ten public assets. The Worker upload was approximately
2,521 KiB uncompressed and 606 KiB compressed. No second application deployment was
performed during the UAT.

## Public data state

Post-UAT read-only queries confirmed:

- 6 controlled public observations
- 1 stored public climate snapshot
- 5 map-visible locations
- 1 location hidden by the configured public geoprivacy mode
- 0 pending D1 migrations
- no new write query during the UAT
- no user, credential, session, validation-comment, actor, private-audit, or evidence table

The only application data tables are `demo_observations` and `climate_snapshots`.
Cloudflare system tables and `d1_migrations` are present as expected.

## Anonymous UAT result

The public surface was tested with a new browser context without Cloudflare,
InfinityAtlas, ChatGPT, or application session data.

| Area | Result | Evidence |
| --- | --- | --- |
| Public access | Pass | Root page returned HTTP 200 and did not request authentication. |
| Health | Pass | `/health` returned HTTP 200, `status: ok`, D1, and 6 controlled records. |
| Reload and reopen | Pass | Health and dashboard loaded after reload and in a newly opened page. |
| Dashboard | Pass | Total and status, provenance, risk, category, and trend values matched D1. |
| Filters | Pass | Validated returned 2 records; a zero-result combination reset all metrics and map locations to zero. |
| Reproducible search | Pass | `?search=102` returned only public observation 102. |
| English and Spanish | Pass with limitations | Interface labels changed language and `html lang` changed correctly. See limitations. |
| Climate | Pass | Open-Meteo returned a current real response; source and observation time were visible. |
| Climate resilience | Pass by implementation review | The Worker exposes a stored real snapshot only as stale when the provider fails. |
| Map | Pass | San Cristobal rendered with OpenStreetMap attribution and 5 public markers. |
| Geoprivacy | Pass | Approximate, aggregate, and hidden modes were respected; one record disclosed no coordinates. |
| Public PDF | Pass | English and Spanish PDFs returned HTTP 200 and rendered as two readable pages. |
| Public CSV | Pass | UTF-8 with BOM, ISO 8601 dates, 6 rows, public fields only. |
| Filtered downloads | Pass | `status=validated` produced a 2-row CSV and a filtered PDF. |
| Write protection | Pass | Dashboard POST returned 405; auth and admin seed routes returned 404. |
| Sensitive-data review | Pass | No users, passwords, sessions, actors, comments, restricted evidence, UNICEF documents, or internal database were exposed. |
| Desktop | Pass | 1440 px capture showed no overlap or horizontal overflow. |
| Mobile | Pass with limitation | 390 px capture had zero horizontal overflow; controls, map, legend, and downloads remained usable. |
| Keyboard map access | Pass | Map region, markers, and zoom controls expose keyboard-focusable controls and labels. |
| Contextual tooltips | Pending | Conceptual status, provenance, and risk tooltips are not present in this public build. |
| Climate live announcements | Pending | Visual loading, spinner, temporary disable, and translated text work; `aria-busy` and `aria-live` are absent. |

## Live climate observation

The UAT received a current response from Open-Meteo:

- provider: Open-Meteo Weather Forecast API
- observed at: `2026-07-29T07:45`
- retrieved at: `2026-07-29T13:53:55.547Z`
- temperature: 25.9 C
- relative humidity: 78 percent
- apparent temperature: 28.7 C
- precipitation: 0 mm
- weather code: 3
- synthetic: false
- stale: false
- attribution: Open-Meteo, CC BY 4.0

The public climate route attempts a live provider request first. Its fallback retains
the real source, observed time, and retrieval time and explicitly marks the stored
observation as stale.

## Public evidence

| File | SHA-256 |
| --- | --- |
| `docs/demo/sprint-1c-cloudflare-public-desktop.png` | `4A930E1013F91B70313C0F2AAFBEF1804739DB03030E90938BD4998978EB7111` |
| `docs/demo/sprint-1c-cloudflare-public-mobile.png` | `0874C478F0CDAB8DBCD882F088548441D8A1C82290CAD47F8AB1CF152E26B358` |
| `docs/demo/sprint-1c-cloudflare-health.png` | `BF1CC7F183DA1D2A5816E6B8312A6477B0EA30553A504BB4F3C26B5EB5BD3647` |
| `docs/demo/infinityatlas-cloudflare-public-report-en.pdf` | `CAF1EBE6A84B5C1A166D03B134280F79E79CD83673042E0B01D5A3C4502A3F7B` |
| `docs/demo/infinityatlas-cloudflare-public-report-es.pdf` | `B011F99DFDF7FB65704617727D8307D6A6683C1D429417C1E5A07B2D27BB3A85` |
| `docs/demo/infinityatlas-cloudflare-public-observations.csv` | `22062FBF5B00BB728D9CF041D984F0A3BA574F4C0E3E34A262C097355EA5ABFB` |
| `docs/demo/infinityatlas-sprint-1c-public-demo.mp4` | `BC0CF6AAF1343E7AF22C9E65CA581E7C1BAD5BB7253C2D1A8BA931D720348406` |

The MP4 is the reproducible Sprint 1C walkthrough prepared before the Cloudflare
publication. The PNG, PDF, and CSV files with `cloudflare` in their names were
captured or downloaded from the deployed Worker.

## Security checks

- The public bundle contains no `.env`, token, credential, local database, internal
  backend, restricted evidence, or confidential UNICEF document.
- D1 is accessed only through `env.DB`; no connection string or database password is
  embedded in the application.
- The public Worker exposes read-only dashboard, health, climate, report, and export
  routes.
- The internal authentication, user, audit, actor, comment, evidence, and admin
  surfaces are absent.
- Git secret scanning of the deployment configuration and evidence set returned no
  findings.

## Known limitations

1. The deployed public surface does not include the accessible conceptual tooltips
   for review status, provenance, and risk definitions.
2. Climate refresh has translated visual feedback, a spinner, and duplicate-request
   prevention, but it does not yet expose `aria-busy` or an `aria-live` announcement.
3. At 390 px, the Spanish language label wraps to two lines. It does not overlap or
   cause horizontal scrolling, but it should be visually refined in a future approved
   accessibility update.
4. The Spanish PDF contains an English page-two section heading and technical enum
   labels. The report remains readable and does not misrepresent the controlled data.
5. The local Windows/ISP resolver retained an initial negative DNS cache for the new
   `workers.dev` hostname during UAT. Cloudflare and Google public DNS resolved the
   hostname correctly, and HTTPS/TLS requests reached the active Cloudflare edge.
   The anonymous browser run used a temporary host-resolution rule to that public
   edge while preserving the real hostname and certificate validation.
6. The video documents the reproducible Sprint 1C flow but is not a post-deployment
   network recording.

No functional file was changed after application deployment. This report and its
public evidence form the documentation-only closure.

- Application code deployed: `c565aa8f1152abfec02e6f38415fed6f527e04be`
- Documentation-only branch head: this documentation commit; the immutable SHA is
  reported in the Git delivery record because a commit cannot contain its own hash.
- `main` reference at closure: `579871f8f8a5f01476ac2760d871c9f15be1cb15`
- Pull request: none
- Merge: none
