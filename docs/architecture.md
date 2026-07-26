# Sprint 1A architecture

The prototype remains a modular monolith:

- one React/Vite frontend;
- one FastAPI backend;
- one relational database;
- one isolated external climate adapter;
- no microservices and no future modules.

## Runtime flow

```mermaid
flowchart LR
    User["Territorial user"] --> Frontend["React / Vite UI"]
    Frontend --> API["FastAPI backend"]
    API --> DB["SQLite local or PostgreSQL/PostGIS"]
    API --> Adapter["Open-Meteo adapter"]
    Adapter --> Provider["Open-Meteo Weather Forecast API"]
    API --> OpenAPI["OpenAPI documentation"]
```

## Climate request behavior

```mermaid
flowchart TD
    Request["GET current climate"] --> Cache{"Fresh public record under 15 minutes?"}
    Cache -->|Yes| Stored["Return stored record · current"]
    Cache -->|No| Provider["Call Open-Meteo with timeout"]
    Provider -->|Valid response| Save["Transform, attribute and store"]
    Save --> Current["Return public_real · current"]
    Provider -->|Failure| Fallback{"Last public record exists?"}
    Fallback -->|Yes| Stale["Return stored record · is_stale=true"]
    Fallback -->|No| Unavailable["Return 503; observation form remains usable"]
```

## Data boundaries

The frontend never connects directly to the database or Open-Meteo. The backend owns:

- provider timeout and response validation;
- climate data transformation and source attribution;
- cache and stale fallback behavior;
- observation status and provenance rules;
- evidence URL validation and persistence.

Evidence uses external URL references in Sprint 1A. Files, photographs and documents are not uploaded
to the repository or local application storage. This keeps personal, clinical and confidential material
outside the prototype until a reviewed private storage design exists.

## Internationalization

English remains the default for the UNICEF demonstration. Spanish is selectable. Visible interface text
is stored under `frontend/src/i18n/`; code, endpoints and technical documentation remain in English.

## Security guard

`POST /api/v1/admin/seed` is hidden and returns 404 outside local/development/test environments.
Automatic startup seeding is also limited to those environments and remains disabled by default.

## Reference and demo data operations

Alembic migrations contain schema transformations only. Reference data are created or updated
manually with the idempotent `python -m app.bootstrap` command.

The clean demonstration operation requires both `--clean-demo` and `--confirm-clean-demo`, is blocked
outside local/development/test, and is never part of normal application or Docker startup. It
preserves the reference prototype and San Cristobal while replacing observations with one explicit
`controlled_test` record.
