# ADR-0002 - Climate adapter and evidence boundary

Date: 2026-07-26

## Status

Accepted for Sprint 1A.

## Context

Sprint 1A needs public climate conditions and related evidence without creating a dependency on a
provider inside the main API logic or storing potentially sensitive files.

## Decision

- Isolate Open-Meteo under `backend/app/services/climate/`.
- Apply an 8-second provider timeout.
- Validate and transform only the required fields.
- Use stored `ClimateData` records as a 15-minute cache.
- Return the latest stored public record as stale when the provider fails.
- Store provider name, full request URL, observation time and retrieval time.
- Use external evidence URLs with type, description, source and date.
- Do not upload photographs or documents in Sprint 1A.

## Consequences

Positive:

- provider failures do not block territorial observation entry;
- climate records remain attributable and auditable;
- external API tests run with mocks;
- no sensitive file is written to Git or local application storage.

Tradeoffs:

- evidence links can expire or change;
- the free API is non-commercial and rate-limited;
- weather values are model outputs, not local station measurements;
- a production evidence store and provider agreement remain future work.
