# InfinityAtlas Climate & Health MRV Toolkit

InfinityAtlas is a functioning, independently deployable open-source prototype for climate and
health measurement, reporting and verification (MRV). It connects public climate context,
territorial observations, transparent non-clinical risk scoring, methodological review,
geoprivacy-aware mapping, reporting and append-only traceability.

- **Owner and operator:** INFINITYGAIA S.A.S. B.I.C.
- **Status:** functioning controlled prototype under structured UAT
- **Reference territory:** San Cristóbal, Galápagos, Ecuador
- **License:** MIT for software; see [BRAND.md](BRAND.md) for trademark and logo terms
- **Public demonstration:** https://infinityatlas-public-demo.infinitygaia.workers.dev

This repository does not claim UNICEF selection, funding, endorsement or partnership. The prototype
is not a validated territorial pilot, a clinical system, or evidence of health efficacy.

## What works today

### Central Access Portal

The bilingual Portal provides one entry point for:

- the unauthenticated, read-only Public Dashboard; and
- the authenticated institutional workspace.

The Portal checks frontend health, backend `/health` and public API availability. English is ready
for external evaluation and Spanish is available throughout the implemented workflow.

### Public Dashboard

The public surface provides only authorized, controlled data:

- aggregate indicators and reproducible global filters;
- current Open-Meteo climate context with source and timestamps;
- status, risk, category, provenance and time visualizations;
- a Leaflet/OpenStreetMap map with exact, approximate, aggregate and hidden location modes;
- safe filtered record summaries;
- bilingual PDF reports;
- technical UTF-8 CSV and an Excel-friendly CSV;
- a public data dictionary.

It contains no institutional users, sessions, actors, private comments, audit history, restricted
evidence, credentials or write endpoint. Its Cloudflare D1 dataset is separate from the
institutional database and remains read-only from the deployed public application.

### Monitor / Technician

An authenticated Monitor can:

- view climate context;
- create a territorial observation with an evidence URL reference;
- assign provenance and a public geolocation mode;
- view their permitted observations and backend-calculated risk scores; and
- edit a permitted record title while the workflow state allows it.

A Monitor cannot validate, reject, administer users, edit audit history or delete observations.

### Administrator

An authenticated Administrator can:

- review observations and authorized evidence references;
- apply the existing `pending`, `observed`, `validated` and `rejected` workflow;
- inspect per-record and global audit history;
- manage local demonstration account status;
- view the explicit internal/public release boundary; and
- soft-delete an institutional observation with a required reason.

Soft deletion removes a record from ordinary institutional queries, dashboards, maps, queues,
filters, reports and exports while preserving evidence, validation decisions, risk scores and the
append-only deletion event. It does not automatically withdraw a record from the separate public D1
demonstration. A future authorized release workflow must implement explicit sanitization,
publication, withdrawal and audit controls.

The optional Validator architecture and permission tests remain preserved, but `demo-validator` is
inactive and hidden in the primary two-role demonstration.

## Risk methodology

The backend calculates:

```text
Risk Score = Hazard + Exposure + Vulnerability
```

Each component uses a 1–4 scale. Version `climate-health-risk-v0.1` classifies totals as:

| Score | Level |
| ---: | --- |
| 3–5 | Low |
| 6–8 | Moderate |
| 9–10 | High |
| 11–12 | Critical |

This score supports methodological prioritization only. It is not a medical diagnosis and does not
independently verify that a territorial event occurred.

## Climate source

The initial provider adapter uses the Open-Meteo Weather Forecast API. The application stores source,
source URL, provider observation time and InfinityAtlas retrieval time. If the provider is
temporarily unavailable, the backend may return the last stored public observation marked as stale.
Open-Meteo data are model-based conditions, not local station measurements. See the
[Open-Meteo license](https://open-meteo.com/en/license) and
[terms](https://open-meteo.com/en/terms) before operational deployment.

## Security and data boundaries

- Passwords are hashed with Argon2.
- Institutional access uses expiring JWTs plus revocable server-side sessions.
- RBAC is enforced by the API, not only by hidden controls.
- Functional credentials, JWT signing secrets, `.env` files and Cloudflare secrets are not
  published.
- Public access is unauthenticated and read-only.
- Institutional and public databases are not automatically synchronized.
- Child-identifying, clinical, personal and confidential information is prohibited.

Temporary evaluation credentials can be supplied separately for a scheduled demonstration. Local
demo users and local-only passwords are created with the documented setup command; they are never
embedded in this README, source code, HTML or public deployment.

## Local installation

### Prerequisites

- Python 3.12+
- Node.js 22+
- pnpm
- PowerShell on Windows for the convenience scripts

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python -m alembic upgrade head
python -m app.bootstrap
python -m app.demo_users
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Replace all marker values in the local `.env` before starting. Demo passwords must be distinct,
temporary and stored only in local environment values. `app.demo_users` is blocked outside local,
development and test environments.

### Frontend

```powershell
cd frontend
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1 --port 5173
```

### Public demo locally

```powershell
cd public-demo
pnpm install --frozen-lockfile
pnpm dev
```

The repository also provides safe convenience scripts after one-time setup:

```powershell
.\start-local.ps1
.\stop-local.ps1
```

Open:

- Central Portal: http://127.0.0.1:5173/
- Public Dashboard: http://127.0.0.1:5173/#public
- Institutional access: http://127.0.0.1:5173/#institutional
- API health: http://127.0.0.1:8000/health
- OpenAPI: http://127.0.0.1:8000/docs

## Tests

```powershell
cd backend
.\.venv\Scripts\python.exe -m compileall app
.\.venv\Scripts\python.exe -m unittest discover -s tests -p "test_*.py" -v

cd ..\frontend
pnpm test
pnpm build

cd ..\public-demo
pnpm lint
pnpm test
pnpm build
pnpm audit --prod
pnpm run deploy:dry-run
```

The development seed endpoint is hidden and disabled outside explicitly allowed local environments.
Normal startup never seeds or resets a database automatically.

## Documentation

- [Architecture](docs/architecture.md)
- [Data dictionary](docs/data-dictionary.md)
- [Open-source boundary](docs/open-source-boundary.md)
- [Dependencies and licenses](docs/dependencies-and-licenses.md)
- [Public demo package](docs/demo/README.md)
- [Spanish manuals](docs/manuals/es/README.md)
- [English manuals](docs/manuals/en/README.md)

## Open-source commitment and brand ownership

The open-source commitment for the proposed workplan is:

> The UNICEF-funded InfinityAtlas Climate & Health MRV Toolkit is a complete and independently
> deployable open-source solution.

This statement defines the licensing commitment if the proposed workplan is funded; it is not a
claim of current selection, funding, endorsement or partnership. All software code, deployment
scripts, data schemas, APIs, technical documentation and user documentation developed through that
workplan are intended to remain openly available under the applicable open licenses.

INFINITYGAIA S.A.S. B.I.C. retains the InfinityGaia and InfinityAtlas trademarks, trade names,
logos, corporate brand assets and general business know-how. Future products or modules developed
independently outside the proposed funded workplan may use separate ownership or licensing terms,
provided they are not required for the funded open-source solution to function as a complete,
independent whole.

## Contact

**INFINITYGAIA S.A.S. B.I.C.**<br>
https://www.infinitygaia.org<br>
carlos.cifuentes@infinitygaia.org
