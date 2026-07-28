# InfinityAtlas Climate & Health MRV Toolkit

**Open-source climate-health MRV toolkit for municipalities and vulnerable communities.**

InfinityAtlas Climate & Health MRV Toolkit is an open-source solution designed to help local governments, communities, schools and implementing partners collect, structure, visualize and report climate-related environmental risks affecting children’s health.

## Brand identity

- Platform: **InfinityAtlas**
- UNICEF solution: **InfinityAtlas Climate & Health MRV Toolkit**
- Reference project: **InfinityAtlas Climate & Health MRV Prototype**
- Owner: **INFINITYGAIA S.A.S. B.I.C.**

The toolkit focuses on strategic planning and local decision-making by connecting environmental exposure data with child-centered climate resilience. It supports risk mapping, vulnerability scoring, MRV indicators, community reporting and basic dashboard structures.

## Problem

Many vulnerable territories face climate-related environmental risks such as waste pollution, water contamination, heat exposure, air quality concerns, hazardous waste exposure and ecosystem degradation. These risks can directly or indirectly affect children’s health, but local actors often lack accessible, interoperable and decision-ready tools to monitor and respond to them.

## Solution

This toolkit provides a practical open-source foundation for climate-health MRV, including:

- climate-health risk taxonomy;
- data collection templates;
- MRV indicator framework;
- community and municipal reporting templates;
- dashboard wireframes;
- implementation guidance;
- roadmap for MVP development.

## Intended Users

- Municipal governments
- Community organizations
- Schools
- Health and environmental authorities
- NGOs and implementing partners
- Climate and public health practitioners

## Initial Use Case

The initial use case is connected to INFINITYGAIA S.A.S. B.I.C.’s work in Ecuador, including San Cristóbal, Galápagos, where circular waste management, environmental risk reduction, public health protection and marine pollution prevention are connected to climate resilience and community wellbeing.

## Open-Source Boundary

This repository represents the public-good open-source module of the broader InfinityAtlas vision.

Open-source components may include data templates, basic indicators, documentation, dashboard wireframes and community MRV tools.

INFINITYGAIA S.A.S. B.I.C. retains ownership of its brands, advanced architecture, commercial configurations, implementation services, know-how, client-specific deployments and MRV-as-a-Service model.

## License

Software components are intended to be released under the MIT License.

Documentation and content may be released under a Creative Commons Attribution license where applicable.

## Status

This project is currently in prototype design and pilot-readiness stage. The next phase is MVP software development, pilot testing, documentation and validation with local users.

## Sprint 0 Foundation

Sprint 0 adds an executable technical foundation for the Climate & Health MRV Toolkit:

- React/Vite frontend with English default and Spanish selectable;
- FastAPI backend/API;
- SQLAlchemy data model and Alembic migration;
- synthetic demo seed data marked with `is_synthetic=true`;
- local SQLite execution path;
- Docker Compose configuration for PostgreSQL/PostGIS, pending validation;
- documentation for architecture, backlog, risks, decisions, data model, dependencies and checkpoint publication.

The development seed endpoint `POST /api/v1/admin/seed` is available only in local/development/test environments. It is hidden and disabled outside those environments.

Sprint 0 technical documents:

- `docs/sprint-0-delivery.md`
- `docs/checkpoint-publication-report.md`
- `docs/dependencies-and-licenses.md`

## Sprint 1A Climate and Observation Flow

Sprint 1A adds the first persistent functional workflow:

- San Cristobal, Galapagos as a public reference territory;
- current public weather conditions from the Open-Meteo Weather Forecast API;
- a 15-minute database-backed climate cache;
- fallback to the last stored public record with a visible stale status;
- bilingual territorial observation form;
- server-side provenance rules for `public_real`, `controlled_test` and `synthetic_demo`;
- external URL evidence references without uploading files to this repository;
- persistent observation list with initial status `pending`;
- manual, idempotent bootstrap for the reference prototype and San Cristobal;
- mocked backend provider tests and frontend component tests.

Open-Meteo data are model-based weather conditions, not a local station measurement. API data are
licensed under [CC BY 4.0](https://open-meteo.com/en/license). The free endpoint is used only for
evaluation and prototyping and is currently restricted to non-commercial use with documented request
limits. A funded deployment must use an appropriate commercial plan, self-host Open-Meteo, or select
another reviewed source. The provider adapter is isolated under `backend/app/services/climate/` so it
can be replaced without rewriting the observation workflow. Review the
[Open-Meteo Terms](https://open-meteo.com/en/terms) before deployment.

### Run locally

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m alembic upgrade head
python -m app.bootstrap
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

`python -m app.bootstrap` is manual and idempotent. It creates or updates:

- project: `InfinityAtlas Climate & Health MRV Prototype`;
- status: `prototype_reference`;
- territory: San Cristobal, Galapagos;
- prototype notice: this is a controlled test, not a validated field pilot.

Frontend, in a second terminal:

```powershell
cd frontend
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1 --port 5173
```

Open:

- application: `http://127.0.0.1:5173`
- API documentation: `http://127.0.0.1:8000/docs`

Run checks:

```powershell
cd backend
.\.venv\Scripts\python.exe -m unittest discover -s tests -p "test_*.py" -v

cd ..\frontend
pnpm test
pnpm build
```

The synthetic seed remains optional and local-development only:

```powershell
cd backend
.\.venv\Scripts\python.exe -m app.seed
```

It is never executed by the normal Docker startup command.

### Prepare a clean local demonstration database

Back up `backend/local.db` first. The following explicit command preserves the reference project and
San Cristobal, removes legacy/demo observations, and creates one `controlled_test` record with
`pending` status:

```powershell
cd backend
.\.venv\Scripts\python.exe -m app.bootstrap --clean-demo --confirm-clean-demo
```

This command is blocked outside local/development/test environments. It is never executed by normal
application or Docker startup. Do not run it against a database containing acceptance or field records
that must be retained.

## Sprint 1B Access, Validation, Risk and Traceability

Sprint 1B adds the protected methodological workflow without introducing microservices or future
modules:

- Argon2 password hashing and time-limited JWT access tokens;
- revocable server-side sessions and functional logout;
- server-enforced `admin`, `monitor`, `validator` and `public` roles;
- owner-scoped monitor records and aggregate-only public access;
- required 80-character record titles with category/territory suggestions and number/title search;
- role-protected record-title correction with append-only change history;
- append-only validation decisions and audit events;
- backend risk calculation using hazard + exposure + vulnerability;
- methodology version `climate-health-risk-v0.1`;
- territory-configured `Pacific/Galapagos` display time with UTC database storage;
- English default and Spanish selectable across all role views.
- accessible bilingual public guidance for review states, data provenance and risk levels.

Validation confirms record completeness and methodological review. It is not a medical diagnosis and
does not independently verify a territorial event. The risk score is also non-clinical and records its
inputs, formula version, actor and calculation time.

### Configure local authentication

Create `backend/.env` from `.env.example` and replace the JWT marker with a locally generated value of
at least 32 characters. Do not commit `.env`.

Then run the schema and manual bootstraps:

```powershell
cd backend
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.bootstrap
.\.venv\Scripts\python.exe -m app.demo_users
```

`app.demo_users` is blocked outside local/development/test. It creates the usernames `demo-admin`,
`demo-monitor` and `demo-validator`. Passwords come from local `DEMO_*_PASSWORD` environment values or
are generated securely and displayed once in the local console. No functional password is published.
To replace existing local demo passwords explicitly:

```powershell
.\.venv\Scripts\python.exe -m app.demo_users --reset-passwords
```

The unauthenticated public view exposes aggregate counts only. Demo user creation is never performed by
a migration, Docker startup or production startup.

Sprint 1B technical documents:

- `docs/sprint-1b-delivery.md`
- `docs/architecture.md`
- `docs/data-dictionary.md`
- `docs/decisions/adr-003-sprint-1b-security-and-risk.md`

## 12-Month Roadmap

1. Finalize climate-health risk taxonomy and indicator framework.
2. Develop data collection templates for municipal and community use.
3. Build a basic open-source dashboard prototype.
4. Test the toolkit with local users in Ecuador.
5. Improve documentation and data workflows.
6. Publish an updated open-source release.
7. Prepare replication guidance for other municipalities and vulnerable communities.

## Contact

INFINITYGAIA S.A.S. B.I.C.

Website: https://www.infinitygaia.org  
Project Lead: Carlos Cifuentes  
Email: carlos.cifuentes@infinitygaia.org
