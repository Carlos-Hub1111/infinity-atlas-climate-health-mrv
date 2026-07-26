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
