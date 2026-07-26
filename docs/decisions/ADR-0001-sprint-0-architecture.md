# ADR-0001 - Sprint 0 architecture

Date: 2026-07-26

## Status

Accepted for Sprint 0.

## Context

InfinityGaia needs an executable but narrow UNICEF prototype before 2026-08-10. The user is nontechnical, Docker is not currently available in the local environment, and the system must avoid confidential data and overbuilt infrastructure.

## Decision

Use:

- React/Vite for the frontend;
- FastAPI for the backend;
- SQLAlchemy for the model layer;
- Alembic for migrations;
- SQLite for immediate local execution;
- Docker Compose with PostgreSQL/PostGIS for later local infrastructure;
- synthetic seed data marked with `is_synthetic=true`.

## Consequences

Positive:

- fast local execution;
- clear API-first structure;
- easy future migration to PostgreSQL/PostGIS;
- simple onboarding for Carlos and future TI review.

Tradeoffs:

- SQLite is not the final geospatial database;
- Sprint 0 validates structure, not production readiness;
- Docker must be tested later on a machine where Docker is installed.
