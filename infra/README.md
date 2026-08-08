# Infrastructure notes

Sprint 0 supports two paths:

## Local no-Docker validation

SQLite database file:

```text
backend/local.db
```

This path was used for Sprint 0 validation because Docker was not available in the local environment.

## Docker path

`docker-compose.yml` defines:

- PostgreSQL/PostGIS database;
- FastAPI backend;
- React/Vite frontend.

This should be tested later on a machine with Docker installed.
