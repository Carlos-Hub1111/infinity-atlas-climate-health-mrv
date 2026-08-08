# Sprint 1D-C - Publication boundary and service-status accessibility

## Scope

This local micro-hardening preserves the approved Sprint 1D-B behavior. It adds no public release
action, public write endpoint, credential, synchronization process or remote D1 operation.

## Pre-start checkpoint

- Branch: `feature/sprint-1d-b-unified-demo-flow`
- HEAD: `75393904b4994b75ce1ddd0ced97a2e2a10ff0f0`
- Base state: approved Sprint 1D-B working tree, intentionally uncommitted
- External checkpoint identifier:
  `Sprint1D-C/PreStart-20260730-133313-7539390`
- ZIP SHA-256:
  `fc48fb8e260cb3269b0b74f5089db061e9186b20cc7ac4285c064773f8f1a8b3`
- `backend/local.db` source and backup: `PRAGMA integrity_check = ok`
- Local public D1 source and backup: `PRAGMA integrity_check = ok`
- Changed-source secret scan before editing: zero findings

## Service-status tooltip

The bilingual service-status help is rendered through a React portal directly under
`document.body`. Its fixed position is calculated from the trigger and viewport dimensions, with
horizontal clamping and automatic placement above or below the trigger. It recalculates on scroll
and resize, and is therefore not clipped by card, header or section overflow.

It opens through pointer hover, focus, click or touch. A second activation, pointer activation
outside the tooltip, blur or Escape closes it.

## Administrator publication status

Administrators see a bilingual information band stating that:

- the record remains in the institutional environment;
- methodological validation does not publish automatically;
- external publication is disabled in the controlled prototype;
- a funded phase will add authorization, sanitization, audit, publication and safe withdrawal.

The band contains no release button and performs no network or database operation.

## Institutional data verification

Read-only verification of `backend/local.db` found:

- six observations in total;
- maximum observation identifier: `6`;
- observation `#4`: `Observation #4`, category `water`, provenance `controlled_test`, status
  `validated`;
- one evidence reference associated with observation `#4`;
- no new observation created during the previous UAT.

The backend runtime log contains no `POST /api/v1/observations` from that UAT. The browser prevented
submission because the evidence URL input remains a required `type="url"` field. No database record
was modified to produce these findings.

## Validation results

- Backend: 38 tests passed; Python compilation, dependency consistency and production audit passed.
- Frontend: 19 tests passed; production build and complete dependency audit passed.
- Public demo: 9 tests passed; lint, build, production audit and Cloudflare dry run passed.
- Local RBAC: Monitor and Administrator login, role recognition, logout and session revocation passed.
- Optional demo Validator: role preserved and account inactive.
- Remote D1: six observations, one climate snapshot, zero pending migrations, zero rows written and
  no internal table.
- Desktop and 390 px mobile UAT: tooltip positioning, bilingual content, click/touch toggle and
  Escape close passed.

## Proposed commit

`Finalize Sprint 1D publication-boundary UX and service-status accessibility`
