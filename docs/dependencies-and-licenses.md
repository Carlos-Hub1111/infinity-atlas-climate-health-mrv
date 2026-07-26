# Dependencies and licenses

Date: 2026-07-26

## Repository license

The Sprint 0 local source uses MIT License. When integrating into the existing public GitHub repository, do not replace an existing MIT `LICENSE`; preserve the repository license file and history.

## Backend direct dependencies

| Package | Version | License metadata |
| --- | --- | --- |
| alembic | 1.16.4 | Not declared in local metadata; verify upstream license before production release. |
| fastapi | 0.140.0 | Not declared in local metadata; verify upstream license before production release. |
| starlette | 1.3.1 | BSD |
| pg8000 | 1.31.5 | BSD 3-Clause |
| pydantic | 2.11.7 | MIT |
| pydantic-settings | 2.10.1 | MIT |
| SQLAlchemy | 2.0.41 | MIT |
| uvicorn | 0.51.0 | Not declared in local metadata; verify upstream license before production release. |

## Backend notable transitive dependencies

| Package | Version | License metadata |
| --- | --- | --- |
| asn1crypto | 1.5.1 | MIT |
| annotated-doc | 0.0.4 | Not declared in local metadata; verify upstream license before production release. |
| python-dateutil | 2.9.0.post0 | Dual License |
| scramp | 1.4.15 | MIT No Attribution |
| six | 1.17.0 | MIT |

## Frontend dependencies

The frontend license scan reported MIT, BSD-3-Clause, Apache-2.0, ISC and MPL-2.0 packages. No GPL/AGPL dependency was reported by `pnpm licenses list`.

Direct frontend dependencies:

| Package | License |
| --- | --- |
| @vitejs/plugin-react | MIT |
| vite | MIT |
| typescript | Apache-2.0 |
| react | MIT |
| react-dom | MIT |
| lucide-react | ISC |
| @types/react | MIT |
| @types/react-dom | MIT |

## Security checks run

- `pip check`: no broken Python requirements found.
- `pip-audit -r requirements.txt`: no known vulnerabilities found after upgrading FastAPI/Uvicorn.
- `pnpm audit --prod`: no known production vulnerabilities found.
- Secret pattern scan: no real credential was found in publishable source files.

## License risk notes

- `psycopg` was replaced with `pg8000` during checkpoint review to avoid publishing a direct LGPLv3 dependency in the Sprint 0 baseline.
- Docker remains pending validation because Docker is not available in the current local environment.
