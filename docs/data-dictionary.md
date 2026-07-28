# Sprint 1C data dictionary

## Controlled vocabularies

| Field | Values |
| --- | --- |
| Data provenance | `public_real`, `controlled_test`, `synthetic_demo` |
| Observation status | `pending`, `observed`, `validated`, `rejected` |
| Role | `admin`, `monitor`, `validator`, `public` |
| Category | `water`, `waste`, `heat`, `environmental_pollution` |
| Risk level | `low`, `moderate`, `high`, `critical` |
| Public location mode | `exact`, `approximate`, `aggregate`, `hidden` |

`synthetic_demo` always derives `is_synthetic=true`. Controlled and synthetic records are labeled in
the interface. A synthetic record is never presented as a real territorial assessment.

## User and Role

`User` stores a minimal prototype identity: username, optional email, display name, Argon2 password
hash, role, active state, synthetic/demo marker and UTC creation time. It does not require personal,
clinical or child-identifying information.

`Role` stores the server authorization role and description.

## AuthSession

Stores the JWT identifier (`jti`), user, creation time, expiry and optional revocation time. Logout sets
`revoked_at`; normal APIs do not delete session history.

## Project

The manual idempotent reference bootstrap manages:

- name `InfinityAtlas Climate & Health MRV Prototype`;
- status `prototype_reference`;
- notice that it is a controlled prototype, not a validated field pilot.

## Territory

Stores project, name, country, province, coordinates, synthetic marker and IANA `timezone`. The initial
reference is San Cristobal, Galapagos, Ecuador at `-0.9002`, `-89.6127`, with
`Pacific/Galapagos`.

## ClimateData

Stores territory, provider name and request URL, provider observation time, application retrieval time,
temperature, relative humidity, apparent temperature, precipitation, WMO weather code, provenance,
synthetic marker and raw provider response. Only attributable non-synthetic public records are eligible
for stale fallback.

## Observation

Stores project, territory, creator, required `record_title` (1-80 characters), category, description,
hazard/exposure/vulnerability (each 1-4), coordinates, UTC observation and creation times, source,
responsible role/team, provenance, synthetic confirmation, status and synthetic marker.
It also stores `public_location_mode`, which defaults to `approximate` and controls only the
public-safe coordinate projection. The exact submitted coordinate remains available to authorized
internal workflows.

Every new API record starts as `pending`. A monitor can update the content of only their own pending
record and can edit its title while it is `pending` or `observed`. An administrator can edit the title
in any state; a validator cannot. Updating a risk component appends a new `RiskScore`.

## Evidence

Stores an external URL reference, type, description, source, UTC evidence time, provenance and
synthetic marker. No file content is stored in Git or application storage. Synthetic markers are not
rendered as links. Open-Meteo response URLs are visibly labeled as technical source data.

## Validation

Each row stores observation, previous status, next status, comment, validator and UTC decision time.
Rows are append-only through normal APIs. Comments are mandatory for `observed` and `rejected`.

Validation confirms completeness and methodological review. It does not constitute a medical diagnosis
or independently verify the territorial event.

## RiskScore

Each snapshot stores:

- observation;
- hazard, exposure and vulnerability inputs;
- total score and level;
- data provenance;
- methodology version `climate-health-risk-v0.1`;
- responsible calculator;
- UTC calculation time;
- `is_clinical_diagnosis=false`.

Formula: `hazard + exposure + vulnerability`. Bands: 3-5 low, 6-8 moderate, 9-10 high and 11-12
critical.

## AuditEvent

Append-only event fields are actor, actor role, UTC timestamp, event type, entity type/identifier,
previous state, next state, comment and optional methodology version. Tracked events include
observation creation/update, `record_title_changed`, risk calculation, validation, status changes,
successful/failed login, logout and user active-state changes.

## Public dashboard projection

The public dashboard response contains territory, consulted period, generated time, active filters,
aggregate status/provenance/risk/category counts and daily trends. It excludes observation creators,
validators, comments, evidence, audit events, credentials and sessions.

The role-scoped dashboard uses the same metric contract. A Monitor receives own-record metrics; a
Validator receives queue and age metrics; an Administrator receives active-user, record and recent
activity indicators.

## Public map projection

The public map exposes record number, short title, category, review status, provenance, risk level,
observation date, public location mode and only the coordinate allowed by that mode. `hidden` returns
no public coordinate. The internal projection remains authenticated and role-scoped.

## Reports and exports

Public PDF/CSV outputs use the active validated filter contract and public-safe projection. Internal
PDF/CSV outputs require `admin`, `monitor` or `validator`; Monitor exports remain owner-scoped.

CSV output is UTF-8 with BOM and ISO 8601 UTC timestamps. PDF reports record the territory, period,
generation time, unique report identifier, methodology version, source attribution, prototype notice
and limitations. Neither format includes passwords, tokens or personal/clinical data.

## Public demonstration D1 record

`public-demo/db/schema.ts` defines a separate read-only demonstration table with short title,
category, status, provenance, risk components/result, UTC observation time and safe public location.
Its migration inserts only explicitly controlled, synthetic or public-reference rows. It is not the
operational InfinityAtlas database and provides no write API.
