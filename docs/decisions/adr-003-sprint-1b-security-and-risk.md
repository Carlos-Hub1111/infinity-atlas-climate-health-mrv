# ADR-003: Sprint 1B access, validation and risk architecture

Date: 2026-07-26

## Status

Accepted for the Sprint 1B prototype.

## Context

Sprint 1B requires functional identity, backend permissions, revocable logout, methodological review,
transparent risk calculation and traceability while preserving the modular monolith and avoiding
production claims.

## Decision

- Hash passwords with Argon2 using `pwdlib`.
- Sign short-lived JWTs with a local environment key and pair each token with a revocable database
  session identified by `jti`.
- Enforce roles and observation ownership in FastAPI dependencies and endpoint rules.
- Store every validation decision and risk calculation as a new row.
- Store audit events as append-only through normal APIs.
- Keep risk methodology in a separate backend service with version
  `climate-health-risk-v0.1`.
- Store UTC and use the territory IANA timezone for interpretation and display.
- Keep the unauthenticated public endpoint aggregate-only.

## Consequences

Logout and account deactivation invalidate access before normal token expiry. The prototype gains a
clear review and risk history without microservices. Database-level privileged changes remain possible,
and browser token storage is not the final production architecture. Production identity, HttpOnly
cookies, rate limiting, account recovery, audit tamper evidence and private evidence storage remain
funded-phase security work.
