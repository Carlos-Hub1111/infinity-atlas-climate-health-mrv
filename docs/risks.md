# Known risks

## R1 - Docker not available locally

Impact: PostgreSQL/PostGIS cannot be validated in this environment today.

Mitigation: Sprint 0 runs with SQLite and includes Docker Compose for later validation on a machine with Docker.

## R2 - Synthetic seed data can be confused with real pilot evidence

Impact: UNICEF may misunderstand the maturity of the data if it is not marked clearly.

Mitigation: every seed record uses `is_synthetic=true`, and README states that seed data is synthetic.

## R3 - Scope expansion before August 10

Impact: trying to build future modules could prevent completion of the required flow.

Mitigation: keep future modules in documentation only. Build only the Climate & Health MRV flow.

## R4 - GitHub contains sensitive or confidential material

Impact: compliance and confidentiality risk.

Mitigation: `.gitignore`, README rules, and no upload of UNICEF RFPS documents, legal files, personal data or secrets.

## R5 - No human technical lead yet

Impact: lower technical credibility for production, security and contract phase.

Mitigation: keep architecture simple, document decisions, and prepare for later review by a human technical lead.

## R6 - Development seed endpoint exposed outside local use

Impact: demo data could be recreated or polluted in a public environment.

Mitigation: `POST /api/v1/admin/seed` is hidden and disabled unless `APP_ENV` is local/development/test. A future production deployment must replace this with admin permissions or remove the route.

## R7 - Public weather source availability

Impact: the Open-Meteo free endpoint may be delayed, unavailable or rate-limited.

Mitigation: use an 8-second timeout, a 15-minute database cache and the last stored public record with
`is_stale=true`. Observation entry remains available when no climate record can be returned.

## R8 - Model data interpreted as a local measurement

Impact: weather model output could be presented as if it came from an on-site station.

Mitigation: the interface names Open-Meteo, displays observation and retrieval times, links attribution,
and documentation states that the values are model-based. The full provider request URL is stored.

## R9 - Free API conditions change or become incompatible

Impact: non-commercial limits or attribution requirements may not fit a later commercial deployment.

Mitigation: Sprint 1A documents CC BY 4.0 attribution and current free-tier limits. Reassess terms and
select a paid or alternative provider before commercial production use.

## R10 - External evidence link changes or exposes sensitive content

Impact: linked evidence can disappear, change or contain prohibited personal information.

Mitigation: Sprint 1A stores only a URL plus metadata and displays a privacy warning. Private object
storage, malware scanning, retention and access control require a later reviewed design.

## R11 - Test client dependency transition

Impact: the current Starlette test client emits a deprecation warning indicating a future transition
from `httpx` to `httpx2`.

Mitigation: tests are currently green and the production climate adapter still uses supported `httpx`.
Review the FastAPI/Starlette test client dependency during Sprint 1B instead of changing the runtime
stack inside Sprint 1A.
