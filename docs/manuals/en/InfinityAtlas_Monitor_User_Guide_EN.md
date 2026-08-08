# InfinityAtlas Monitor User Guide

## Territorial observation entry

**Product:** InfinityAtlas Climate & Health MRV Toolkit<br>
**Owner and operator:** INFINITYGAIA S.A.S. B.I.C.<br>
**Prepared by:** INFINITYGAIA S.A.S. B.I.C. — Product & Technical Team<br>
**Approved by:** INFINITYGAIA S.A.S. B.I.C.<br>
**Document version:** 1.0 — Submission closure<br>
**Date:** 8 August 2026<br>
**System status:** Functioning controlled prototype under structured UAT

> Prototype / controlled test — Not a validated field pilot. InfinityAtlas does not provide a
> medical diagnosis and does not independently verify that a territorial event occurred.

## Contents

1. [What InfinityAtlas does](#1-what-infinityatlas-does)
2. [Monitor responsibilities](#2-monitor-responsibilities)
3. [Start and enter the system](#3-start-and-enter-the-system)
4. [Monitor workspace](#4-monitor-workspace)
5. [Observation form field guide](#5-observation-form-field-guide)
6. [Risk score](#6-risk-score)
7. [Guided controlled exercise](#7-guided-controlled-exercise)
8. [Privacy and prohibited information](#8-privacy-and-prohibited-information)
9. [Sign out and stop the system](#9-sign-out-and-stop-the-system)
10. [Common problems](#10-common-problems)
11. [Seven-minute live demonstration](#11-seven-minute-live-demonstration)

# 1. What InfinityAtlas does

InfinityAtlas organizes climate and territorial information so authorized teams can measure,
report and verify a consistent record. This is often shortened to **MRV**:

- **Measure:** collect a structured observation and its source.
- **Report:** present the information in lists, dashboards and downloadable files.
- **Verify:** review whether the record is complete and follows the agreed method.

The prototype connects public climate context, water, waste, heat and environmental pollution
observations, evidence references, geoprivacy and a transparent risk score.

# 2. Monitor responsibilities

The Monitor observes, records, documents and submits territorial information for review. A Monitor
can see only the records allowed by the API.

The Monitor **cannot** validate, observe methodologically, reject, delete, edit audit events, manage
users or publish directly to the Public Dashboard. These limits are enforced by the backend.

# 3. Start and enter the system

## 3.1 Start locally

1. Open PowerShell in the repository root.
2. Start InfinityAtlas:

   ```powershell
   .\start-local.ps1
   ```

3. Wait until the local service addresses appear.
4. Open http://127.0.0.1:5173/ in Chrome.

## 3.2 Sign in

1. Select **Institutional Access**.
2. Enter the locally supplied Monitor username or email.
3. Enter the temporary local password.
4. Select **Sign in**.
5. Confirm that the header shows **Monitor / Technician**.

Do not photograph, paste into a document or share the password. The browser may store it only by the
authorized operator's decision.

# 4. Monitor workspace

| Element | Purpose | Expected behavior |
| --- | --- | --- |
| InfinityAtlas logo | Identifies the platform | Returns no privilege and contains no secret |
| Language | Changes visible English/Spanish text | Keeps the active session and route |
| Service status | Checks Portal, backend health and public API | Shows available, partial or unavailable |
| User name | Shows the authenticated identity | Must match the authorized local account |
| Role | Shows the permission group | Must show Monitor / Technician |
| Dashboard | Opens the Monitor role summary | Shows only permitted role metrics |
| Observations | Opens climate, entry form and own records | Does not show validation or deletion controls |
| Log out | Revokes the server-side session | Returns to the Central Portal |

## 4.1 Climate panel

The panel shows temperature, relative humidity, apparent temperature, precipitation, WMO weather
code, provider observation time, InfinityAtlas retrieval time and Open-Meteo source.

**Refresh climate** disables while the request runs. A successful request shows the latest response.
If the provider fails, the last stored public value may appear as stale. Climate context does not
prove that an observation or risk occurred.

# 5. Observation form field guide

| Visible field | What it is for | What to enter | Example | Required | Public-release note |
| --- | --- | --- | --- | --- | --- |
| Project | Links the record to the reference project | Select the available prototype project | InfinityAtlas Climate & Health MRV Prototype | Yes | Project name may be included in an authorized release |
| Territory | Links the record to a place and timezone | Select San Cristóbal | San Cristóbal | Yes | Territory may be public |
| Record title | Gives the record a short recognizable name | Up to 80 characters; no personal data | Controlled heat observation | Yes | May be public after separate authorization |
| Category | Groups the environmental subject | Water, waste, heat or environmental pollution | Heat | Yes | May be public |
| Data provenance | Distinguishes real public, controlled or synthetic origin | Select the truthful origin | Controlled test | Yes | Always visible when published |
| Description | Explains what was observed | Clear factual description | Controlled heat exercise near a public facility | Yes | Must be sanitized before release |
| Hazard | Rates how serious the potential problem is | Integer 1–4 | 2 | Yes | Used in the non-clinical score |
| Exposure | Rates how much population, place or resource could be in contact | Integer 1–4 | 2 | Yes | Used in the non-clinical score |
| Vulnerability | Rates difficulty to protect or recover | Integer 1–4 | 2 | Yes | Used in the non-clinical score |
| Observation date and time | States when the observation was made | Local date and time for the territory | 2026-08-08 10:00 | Yes | Converted to UTC for storage |
| Latitude | Stores internal latitude | Number from -90 to 90 | -0.9002 | Yes | Exact value can remain restricted |
| Longitude | Stores internal longitude | Number from -180 to 180 | -89.6127 | Yes | Exact value can remain restricted |
| Public map location | Sets geoprivacy | Exact, approximate, aggregate or hidden | Approximate | Yes | Controls public coordinates |
| Use territory coordinates | Copies the configured territory point | Select only when appropriate | San Cristóbal reference point | Action | Does not authorize public exact display |
| Observation source | Identifies where the information came from | Organization, visit or public source | INFINITYGAIA S.A.S. B.I.C. controlled training | Yes | May be visible after authorization |
| Responsible role or team | Identifies responsibility without a personal name | Role or team only | Territorial monitoring team | Yes | Internal by default |
| Evidence type | Describes the reference format | Web, photo reference or document reference | Web reference | Yes | Does not upload a file |
| Evidence date and time | States when the evidence was produced | Relevant date and time | 2026-08-08 10:05 | Yes | Internal by default |
| Evidence URL | Points to an authorized external reference | Valid `https://` address | Public repository page | Yes | Restricted evidence is never public automatically |
| Evidence source | Identifies the evidence owner or origin | Organization or public source | INFINITYGAIA S.A.S. B.I.C. | Yes | Internal until authorized |
| Evidence description | Explains what the link supports | Short factual description | Controlled training reference | Yes | Must not contain personal data |
| Synthetic confirmation | Confirms a synthetic demo is not real | Select only for synthetic demo records | Checked | Conditional | Synthetic label must remain visible |
| Save observation | Sends the completed record to the API | Select once after review | Observation saved as Pending | Action | Does not publish the record |

If a required field is empty or invalid, the API does not create the observation. Correct the marked
field and submit once. An evidence URL is a reference only; the current prototype does not upload a
file from this form.

# 6. Risk score

The backend calculates:

```text
Risk Score = Hazard + Exposure + Vulnerability
```

| Total | Level |
| ---: | --- |
| 3–5 | Low |
| 6–8 | Moderate |
| 9–10 | High |
| 11–12 | Critical |

The score helps order records for review. It is transparent and non-clinical. It is not a diagnosis,
causal conclusion or emergency declaration.

# 7. Guided controlled exercise

1. Set the title to **Controlled heat test in San Cristóbal**.
2. Select **Heat**.
3. Select **Controlled test** provenance.
4. Write a factual, non-personal description.
5. Set Hazard, Exposure and Vulnerability to `2`.
6. Confirm the expected score is `6 / Moderate` after saving.
7. Use **Approximate** public location.
8. Enter the controlled training source and an authorized public URL.
9. Select **Save observation** once.
10. Confirm the success message and `Pending` status.
11. Refresh the page and confirm the record remains in **My observations**.
12. Confirm that no Validate, Reject or Delete control is visible.

# 8. Privacy and prohibited information

Never enter:

- a child's full name, image, identification number or personal address;
- medical diagnoses, clinical histories or patient records;
- personal phone numbers or private contact details;
- passwords, tokens, private keys or `.env` values;
- confidential contracts or UNICEF submission documents; or
- information that could expose a person, community or sensitive location to harm.

# 9. Sign out and stop the system

Use **Log out**. This revokes the session; closing the browser tab alone does not perform a server-side
logout.

From the repository root, run:

```powershell
.\stop-local.ps1
```

# 10. Common problems

| Problem | Likely cause | What to do |
| --- | --- | --- |
| Page does not open | Local services are stopped | Run `start-local.ps1`, then reload |
| API unavailable | Backend did not start or port 8000 is occupied | Check PowerShell output and http://127.0.0.1:8000/health |
| Invalid credentials | Old browser password or inactive account | Remove the saved password and use the separately supplied local credential |
| 401 response | Session expired or token was revoked | Sign in again |
| Required field error | A value is empty or invalid | Review every required field |
| Evidence URL error | URL is blank or malformed | Use a complete authorized `https://` URL |
| Record not visible | Save failed or role scope differs | Check the success message and refresh My observations |
| Climate does not refresh | Provider is temporarily unavailable | Read the stale/current label and try later |
| Monitor cannot validate/delete | Correct RBAC behavior | Ask an Administrator to review the record |

# 11. Seven-minute live demonstration

- **Minute 0–1:** “InfinityAtlas has one Central Portal and keeps public and institutional data separated.”
- **Minute 1–2:** Show the read-only Dashboard, climate, filters, map and reports.
- **Minute 2–4:** Sign in as Monitor and create one clearly labeled controlled observation.
- **Minute 4–6:** Sign out, sign in as Administrator, review the score, validate and show audit history.
- **Minute 6–7:** “The prototype improves territorial data structure, privacy and traceability. It does not diagnose health conditions or publish institutional records automatically.”

[Back to the English guides index](README.md)
