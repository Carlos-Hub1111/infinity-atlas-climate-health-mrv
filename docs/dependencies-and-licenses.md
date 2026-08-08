# Dependencies and licenses

Updated: 2026-08-08

## Repository license

The Sprint 0 local source uses MIT License. When integrating into the existing public GitHub repository, do not replace an existing MIT `LICENSE`; preserve the repository license file and history.

## Backend direct dependencies

| Package | Version | License metadata |
| --- | --- | --- |
| alembic | 1.16.4 | MIT |
| fastapi | 0.140.0 | MIT |
| httpx | 0.28.1 | BSD-3-Clause |
| PyJWT | 2.13.0 | MIT |
| pwdlib | 0.3.0 | MIT |
| starlette | 1.3.1 | BSD-3-Clause |
| pg8000 | 1.31.5 | BSD 3-Clause |
| pydantic | 2.11.7 | MIT |
| pydantic-settings | 2.10.1 | MIT |
| reportlab | 5.0.0 | BSD-3-Clause |
| SQLAlchemy | 2.0.41 | MIT |
| tzdata | 2026.3 | Apache-2.0 |
| uvicorn | 0.51.0 | BSD-3-Clause |

## Backend notable transitive dependencies

| Package | Version | License metadata |
| --- | --- | --- |
| asn1crypto | 1.5.1 | MIT |
| annotated-doc | 0.0.4 | Not declared in local metadata; verify upstream license before production release. |
| argon2-cffi | 25.1.0 | MIT |
| cffi | 2.1.0 | MIT |
| python-dateutil | 2.9.0.post0 | Dual License |
| scramp | 1.4.15 | MIT No Attribution |
| six | 1.17.0 | MIT |
| Pillow | 12.3.0 | MIT-CMU |

## Frontend dependencies

The full frontend license scan reported Apache-2.0, BlueOak-1.0.0, BSD-2-Clause,
BSD-3-Clause, CC0-1.0, ISC, MIT, MIT-0 and MPL-2.0 packages. No GPL/AGPL dependency was
reported by `pnpm licenses list`.

Direct frontend dependencies:

| Package | License |
| --- | --- |
| @vitejs/plugin-react | MIT |
| vite | MIT |
| typescript | Apache-2.0 |
| react | MIT |
| react-dom | MIT |
| lucide-react | ISC |
| recharts 3.10.1 | MIT |
| leaflet 1.9.4 | BSD-2-Clause |
| @types/leaflet 1.9.21 | MIT |
| @types/react | MIT |
| @types/react-dom | MIT |
| @testing-library/jest-dom | MIT |
| @testing-library/react | MIT |
| jsdom | MIT |
| vitest | MIT |

## Public demonstration dependencies

The `public-demo/` deployment uses the Sites vinext Cloudflare runtime. Direct runtime dependencies:

| Package | Version | License |
| --- | --- | --- |
| drizzle-orm | 0.45.2 | Apache-2.0 |
| leaflet | 1.9.4 | BSD-2-Clause |
| lucide-react | 0.545.0 | ISC |
| next | 16.2.12 | MIT |
| pdf-lib | 1.17.1 | MIT |
| react | 19.2.8 | MIT |
| react-dom | 19.2.8 | MIT |

Cloudflare/Vite/Wrangler packages are development and deployment tooling. The public map retains
OpenStreetMap attribution, and PDF/CSV outputs retain source and methodology notices.

Next.js declares optional image tooling. The lockfile overrides transitive `sharp` to patched version
0.35.0, `postcss` to 8.5.23 and `nanoid` to 3.3.17. The frontend lockfile also constrains
`nanoid` to 3.3.17. These minimum compatible patches resolve the production advisories present during
the 8 August 2026 closure audit. The Windows sharp binary reports
`Apache-2.0 AND LGPL-3.0-or-later`; InfinityAtlas does not use `next/image`, does not modify that
library and the Cloudflare Worker deployment output contains no sharp, libvips or native `.node`
binary. This remains a funded-stage license-review item if image optimization is introduced.

## External data source

Open-Meteo Weather Forecast API data are offered under CC BY 4.0 and require visible attribution with
a link to Open-Meteo where data are displayed. Sprint 1A uses the free endpoint only for evaluation
and prototyping. Its current terms limit it to non-commercial use and document request limits. No API
key is used or stored.

Before a funded or production stage, select one of:

- an appropriate Open-Meteo commercial plan;
- a reviewed self-hosted Open-Meteo deployment;
- a replacement public or contracted climate source.

The climate integration is behind a provider adapter, so replacing the source does not require
rewriting the observation workflow.

- Licence: https://open-meteo.com/en/license
- Terms: https://open-meteo.com/en/terms
- Weather API documentation: https://open-meteo.com/en/docs

## Cartographic provider

The prototype uses Leaflet with OpenStreetMap tiles. OpenStreetMap attribution remains visible on the
map and in the safe map API response. Production traffic must comply with the OpenStreetMap tile usage
policy or use an approved hosted/self-hosted tile provider. `react-leaflet` was evaluated and removed
because the installed release declared `Hippocratic-2.1`; the implementation uses Leaflet directly
under BSD-2-Clause.

## Security checks run

- `pip check`: no broken Python requirements found.
- `pip-audit -r requirements.txt`: no known vulnerabilities found after upgrading FastAPI/Uvicorn.
- `pnpm audit --prod`: no known production vulnerabilities found.
- Secret pattern scan: no real credential was found in publishable source files.

## License risk notes

- `psycopg` was replaced with `pg8000` during checkpoint review to avoid publishing a direct LGPLv3 dependency in the Sprint 0 baseline.
- Docker remains pending validation because Docker is not available in the current local environment.
