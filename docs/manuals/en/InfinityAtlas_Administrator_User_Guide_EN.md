# InfinityAtlas Administrator User Guide

## Review, validation, audit and institutional control

**Product:** InfinityAtlas Climate & Health MRV Toolkit<br>
**Owner and operator:** INFINITYGAIA S.A.S. B.I.C.<br>
**Document version:** 1.0 — Submission closure<br>
**Date:** 8 August 2026

> Prototype / controlled test — Not a validated field pilot. Methodological validation is not a
> medical diagnosis and does not independently verify the territorial event.

## Contents

1. [Administrator role](#1-administrator-role)
2. [Start and sign in](#2-start-and-sign-in)
3. [Administrator navigation](#3-administrator-navigation)
4. [Review workflow](#4-review-workflow)
5. [Soft-delete an observation](#5-soft-delete-an-observation)
6. [Audit and traceability](#6-audit-and-traceability)
7. [Public-release boundary](#7-public-release-boundary)
8. [Privacy](#8-privacy)
9. [Guided exercise](#9-guided-exercise)
10. [Troubleshooting](#10-troubleshooting)
11. [Seven-minute live demonstration](#11-seven-minute-live-demonstration)

# 1. Administrator role

The Administrator supervises the institutional workflow. The current primary demonstration uses
Monitor and Administrator. The optional Validator model and permissions remain in the code, but the
`demo-validator` account is inactive and hidden.

The Administrator can review, observe, validate, reject, inspect audit history, manage local demo
account status and soft-delete an institutional observation. The Administrator cannot edit or erase
append-only audit events and cannot automatically publish or withdraw records from Cloudflare D1.

# 2. Start and sign in

Start local services:

```powershell
cd "C:\Users\carlo\OneDrive\Documentos\InfinityAtlas_GitHub_Publication"
.\start-local.ps1
```

1. Open http://127.0.0.1:5173/.
2. Select **Institutional Access**.
3. Enter the separately supplied local Administrator username and temporary password.
4. Select **Sign in**.
5. Confirm that the header shows **Administrator**.

Never place the password in GitHub, a screenshot, manual or chat.

# 3. Administrator navigation

| Tab | Purpose | Private information |
| --- | --- | --- |
| Dashboard | Role-scoped indicators and authorized exports | May include institutional totals |
| Review queue | Select and methodologically review active observations | Evidence references, decisions and history |
| Observations | View active institutional records and permitted title editing | Exact internal coordinates and source details |
| Demo users | View and enable/disable allowed local demo accounts | Account metadata; never passwords |
| Audit | Search append-only institutional events | Actors, roles, timestamps and comments |

The banner **Public release status** explains that records remain internal. No publish control or D1
write path exists in this prototype.

# 4. Review workflow

## 4.1 Review states

| State | Meaning |
| --- | --- |
| Pending | Created but not yet methodologically reviewed |
| Observed | Needs clarification, correction or additional evidence |
| Validated | Complete under the prototype method; not proof the event occurred |
| Rejected | Does not meet minimum methodological or evidence requirements |

Allowed transitions are `pending → validated/observed/rejected` and
`observed → validated/rejected`. A comment is required for Observed and Rejected. Prior decisions are
preserved.

## 4.2 Record review checklist

1. Open **Review queue**.
2. Select the record by ID and title.
3. Read the category, provenance and factual description.
4. Open only an authorized evidence URL.
5. Review Hazard, Exposure and Vulnerability.
6. Confirm the backend score and methodology version.
7. Confirm that the public location mode protects sensitive coordinates.
8. Choose Validate, Observe or Reject.
9. Write a clear comment when required.
10. Confirm the success message.
11. Read the record timeline.

Useful comments:

- **Observed:** “The evidence reference needs a clearer description before validation.”
- **Validated:** “Record completeness and methodological consistency were reviewed.”
- **Rejected:** “The record does not contain sufficient authorized evidence to continue.”

# 5. Soft-delete an observation

Soft deletion is a final institutional control available only to Administrator. It does not physically
delete evidence, validation decisions, risk scores or audit events.

## 5.1 When to use it

Use it only when an active institutional record must be removed from ordinary operational views, for
example a confirmed duplicate controlled record. Do not use it to hide an inconvenient review
decision or alter audit history.

## 5.2 Steps

1. Open **Review queue**.
2. Select the record.
3. Verify the record ID and title carefully.
4. Find **Delete institutional record**.
5. Enter a short factual **Deletion reason**.
6. Select **Delete record**.
7. Read the confirmation containing the record ID and title.
8. Confirm only if the correct record is shown.
9. Confirm the success message.
10. Verify that the record disappears from active lists, queue, dashboard, map, filters, PDF and CSV.
11. Open **Audit** and verify the `Observation soft-deleted` event.

| Element | Requirement |
| --- | --- |
| Deletion reason | Required, 3–500 characters |
| Actor | Authenticated Administrator, stored by the backend |
| Timestamp | Stored in UTC |
| Repeated deletion | Returns a safe conflict response |
| Monitor/Public access | Forbidden by backend RBAC |
| Evidence and history | Preserved |

## 5.3 Public dataset warning

Institutional soft deletion does **not** mutate the separate, read-only Cloudflare D1 demonstration
dataset. If a future authorized publication workflow releases a record, it must provide an explicit,
audited withdrawal/unpublish process. Do not claim automatic synchronization.

# 6. Audit and traceability

Audit events include the actor, role, UTC time, event type, entity, previous state, new state,
comment and methodology version when relevant.

Implemented event examples include observation creation, update, title change, risk calculation,
validation decision, status change, login success/failure, logout, user status change and soft
deletion.

The normal API and interface do not provide an audit edit or delete operation.

## 6.1 Search audit

Use record number/title, category, state, event, actor, UTC date and sort order. Select a record to
show its timeline, then use **Back to global activity** to return.

# 7. Public-release boundary

**Internal use — Not authorized for public release** means:

- methodological validation does not publish a record;
- institutional data remains in the institutional database;
- the current public D1 database is separate and controlled;
- no automatic synchronization or D1 write endpoint exists; and
- a future funded phase must add authorization, sanitization, audit, publication and safe withdrawal.

# 8. Privacy

Never release users, internal actors, review comments, complete audit history, restricted evidence,
protected exact coordinates, passwords, tokens, personal information, clinical information or data
identifying children.

# 9. Guided exercise

1. Sign in as Administrator.
2. Select a controlled Pending record.
3. Confirm the risk inputs and evidence reference.
4. Change Pending to Observed with a clarification comment.
5. Change Observed to Validated with a final methodological comment.
6. Open Audit and confirm both decisions and state changes.
7. Confirm the Monitor has no validation or deletion controls.
8. For a separate duplicate test record only, exercise soft deletion and confirm the preserved audit event.
9. Confirm the Public Dashboard did not change automatically.

# 10. Troubleshooting

| Problem | Likely cause | Resolution |
| --- | --- | --- |
| Record does not appear | It is outside role scope, filtered or soft-deleted | Clear filters and check Audit |
| State does not change | Transition is not allowed | Follow the permitted transition table |
| Comment error | Observed/Rejected comment is blank | Enter a factual methodological comment |
| Delete control missing | Account is not Administrator | Confirm role; do not bypass RBAC |
| Delete request is rejected | Record already deleted or session expired | Check Audit or sign in again |
| Audit looks out of order | Sort order/date filter differs | Select UTC date and desired order |
| Validator cannot sign in | Correct primary-demo configuration | Use Administrator for the approved flow |
| Public Dashboard does not update | Publication is intentionally separate | Do not attempt unauthorized D1 synchronization |
| API unavailable | Backend stopped | Check http://127.0.0.1:8000/health |

# 11. Seven-minute live demonstration

- **0–1:** Explain one Portal and separated public/institutional data.
- **1–2:** Show the read-only Public Dashboard.
- **2–4:** Use Monitor to create a controlled observation.
- **4–6:** Use Administrator to review, validate and show append-only audit history.
- **6–7:** Explain the explicit publication boundary and privacy controls. Mention soft deletion only as an audited administrative safeguard, not as public withdrawal.

Stop local services with `\.\stop-local.ps1` from the repository root.

[Back to the English guides index](README.md)
