# Sprint 1A data dictionary

## Provenance values

| Value | Meaning | Display rule |
| --- | --- | --- |
| `public_real` | Public source or field record with an attributable origin | Climate provider data may be shown as public real; pending observations remain visibly unverified |
| `controlled_test` | Controlled functional test that is not field evidence | Must be shown as controlled test |
| `synthetic_demo` | Invented demonstration data | Must be visibly marked synthetic |

The server derives `is_synthetic=true` only from `synthetic_demo`. A client cannot mark synthetic data as real.
User-submitted `public_real` observations remain `pending` and are displayed as awaiting verification until
the Sprint 1B validation workflow exists.

## Project

Groups territories and observations. Sprint 1A inserts the non-synthetic reference project
`Infinity Atlas Climate & Health MRV Pilot` through migration `0002_sprint_1a`.

## Territory

Stores name, country, province and coordinates. The initial public reference is:

- San Cristobal, Galapagos, Ecuador;
- latitude `-0.9002`;
- longitude `-89.6127`.

## ClimateData

Stores:

- territory;
- provider name and complete request URL;
- provider observation timestamp;
- application retrieval timestamp;
- temperature;
- relative humidity;
- apparent temperature;
- precipitation;
- WMO weather code;
- provenance and synthetic flag;
- raw provider payload for traceability.

Only non-synthetic `public_real` records are eligible for the climate fallback.

## Observation

Stores:

- project and territory;
- category: `water`, `waste`, `heat` or `environmental_pollution`;
- description;
- hazard, exposure and vulnerability inputs from 1 to 4;
- coordinates;
- observation and creation timestamps;
- source name;
- responsible role or team;
- provenance;
- synthetic confirmation;
- initial status `pending`.

Sprint 1A does not calculate a final risk score.

## Evidence

Stores an external URL reference linked to an observation:

- evidence type;
- URL;
- description;
- source name;
- evidence timestamp;
- provenance and synthetic flag.

No file contents are stored in Git or the application data directory.

## Validation and RiskScore

The existing entities remain in the schema for continuity. Full validation and final risk scoring are
reserved for Sprint 1B. Sprint 1A observation creation does not write either entity.
