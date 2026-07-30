# Sprint 0 safe checkpoint and publication report

Date: 2026-07-26

## Backup

Final checkpoint backup was created outside the repository on 2026-07-26.

The exact local backup path is intentionally not published in the public repository.

Backup contents:

- includes `backend/local.db`;
- includes migrations, code, configuration and documentation;
- excludes `.venv`, `node_modules`, `dist`, caches, logs and build metadata.

## GitHub publication status

Target repository:

`https://github.com/Carlos-Hub1111/infinity-atlas-climate-health-mrv`

Status: prepared on branch `feature/sprint-0-foundation`.

Required branch when repository access is available:

`feature/sprint-0-foundation`

Required commit message:

`Close Sprint 0 foundation checkpoint`

Publication rules:

- clone the existing remote repository into a clean folder;
- update from `origin/main`;
- create the branch from `main`;
- preserve existing history and documentation;
- do not replace an existing MIT `LICENSE`;
- do not merge into `main`;
- push only the feature branch.

## Publishable file list

```text
.env.example
.gitignore
LICENSE
README.md
backend/Dockerfile
backend/alembic.ini
backend/alembic/env.py
backend/alembic/script.py.mako
backend/alembic/versions/0001_initial_schema.py
backend/app/__init__.py
backend/app/core/__init__.py
backend/app/core/config.py
backend/app/core/database.py
backend/app/main.py
backend/app/models.py
backend/app/schemas.py
backend/app/seed.py
backend/app/services/__init__.py
backend/app/services/risk.py
backend/requirements.txt
data/demo/README.md
docker-compose.yml
docs/architecture.md
docs/backlog.md
docs/checkpoint-publication-report.md
docs/data-dictionary.md
docs/decisions/ADR-0001-sprint-0-architecture.md
docs/dependencies-and-licenses.md
docs/risks.md
docs/sprint-0-delivery.md
frontend/Dockerfile
frontend/index.html
frontend/package.json
frontend/pnpm-lock.yaml
frontend/src/i18n/en.ts
frontend/src/i18n/es.ts
frontend/src/i18n/index.ts
frontend/src/main.tsx
frontend/src/styles.css
frontend/src/vite-env.d.ts
frontend/tsconfig.json
frontend/vite.config.ts
infra/README.md
```

Excluded from publication:

- `.env` files;
- local SQLite database;
- virtual environments;
- `node_modules`;
- frontend build output;
- logs;
- internal INFINITYGAIA S.A.S. B.I.C. context files;
- internal PowerPoint;
- budget, contract, legal or confidential proposal documents.

## Startup instructions

Backend:

```powershell
cd <repository-root>\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m alembic upgrade head
python -m app.seed
python -m uvicorn app.main:app --reload --port 8000
```

Frontend:

```powershell
cd <repository-root>\frontend
pnpm install
pnpm dev --host 127.0.0.1 --port 5173
```

URLs:

- frontend: `http://127.0.0.1:5173`
- backend: `http://127.0.0.1:8000`
- API docs: `http://127.0.0.1:8000/docs`

## Test results

- `python -m compileall app`: passed.
- `python -m alembic upgrade head`: passed.
- `python -m app.seed`: passed and idempotent.
- `APP_ENV=production` OpenAPI check: seed endpoint hidden.
- `APP_ENV=production` POST `/api/v1/admin/seed`: 404.
- `APP_ENV=local` POST `/api/v1/admin/seed`: 200.
- `pnpm build`: passed.
- `pip check`: passed.
- `pip-audit -r requirements.txt`: no known vulnerabilities found.
- `pnpm audit --prod`: no known production vulnerabilities found.

## Dependency and license summary

Repository license: MIT.

Backend direct dependencies:

- Alembic 1.16.4
- FastAPI 0.140.0
- pg8000 1.31.5
- Pydantic 2.11.7
- Pydantic Settings 2.10.1
- SQLAlchemy 2.0.41
- Uvicorn 0.51.0

Frontend direct dependencies:

- React
- React DOM
- Vite
- TypeScript
- Lucide React
- Vite React plugin
- React type packages

No GPL or AGPL dependency was reported in the basic scan. Some Python packages do not declare license metadata locally and should be checked again before production release.

## Security and confidentiality confirmation

No real secret, credential, token, `.env` file, UNICEF confidential document, internal context file, budget, contract, internal PowerPoint, personal data or sensitive child-identifying data is included in the publishable file list.

`POST /api/v1/admin/seed` is a local/development/test utility only. It is hidden and disabled outside those environments until administrative permissions exist.

Docker is documented as pending validation because Docker is not available on this machine.

## Known risks

- GitHub publication is blocked until repository URL/access is provided.
- Docker/PostGIS remains unvalidated locally.
- No authentication system exists yet.
- The map is still a placeholder.
- Climate data is synthetic until Sprint 1A.
- License metadata for a few Python packages should be rechecked before production release.

## Pending

- Human review by Carlos/Nova before Sprint 1A.
- Docker/PostGIS validation on a machine with Docker.
- Open a pull request only after branch review is authorized.

## Sprint 1A plan

Focus: real climate source, territory, observation form, location and evidence.

Tasks:

- Add public climate source adapter.
- Add territory read/write API.
- Add observation creation form.
- Add location fields and basic coordinate validation.
- Add evidence URL placeholder.

Files or components:

- `backend/app/models.py`
- `backend/app/main.py`
- `backend/app/services/`
- `frontend/src/main.tsx`
- `frontend/src/i18n/`
- `docs/data-dictionary.md`

Tests:

- adapter returns public climate data or safe fallback;
- observation create API stores synthetic flag correctly;
- frontend form submits and refreshes observation list;
- no child-identifying field is introduced.

Acceptance:

- user can select territory, load climate context and submit one observation with evidence URL.

Risks:

- climate source availability;
- coordinate quality;
- accidental scope expansion.

Estimate: 1-2 work days.

## Sprint 1B plan

Focus: validation, risk score and traceability.

Tasks:

- Add validation endpoints.
- Add risk score recalculation service.
- Add audit trail fields.
- Add validator UI state.
- Store formula version and confidence.

Files or components:

- `backend/app/models.py`
- `backend/app/services/risk.py`
- `backend/alembic/versions/`
- `frontend/src/main.tsx`
- `docs/architecture.md`

Tests:

- validation status transitions work;
- risk score is reproducible;
- seed remains idempotent;
- production seed endpoint remains blocked.

Acceptance:

- observation can move from pending to validated/rejected and keeps risk traceability.

Risks:

- overcomplicated scoring;
- unclear validation permissions before auth exists.

Estimate: 1-2 work days.

## Sprint 1C plan

Focus: dashboard, real map, report and public view.

Tasks:

- Replace placeholder map with a real map library.
- Add dashboard cards and filters.
- Add public read-only view.
- Add CSV report export.
- Add demo script and screenshots.

Files or components:

- `frontend/src/`
- `backend/app/main.py`
- `backend/app/schemas.py`
- `docs/sprint-0-delivery.md`
- `README.md`

Tests:

- dashboard renders with API data;
- map renders territory and observation point;
- CSV export includes only non-sensitive fields;
- public view excludes admin actions.

Acceptance:

- reviewer can see climate context, observation, validation/risk, map and exportable report.

Risks:

- map package license;
- report accidentally exposing sensitive fields;
- mobile layout issues.

Estimate: 2-3 work days.
