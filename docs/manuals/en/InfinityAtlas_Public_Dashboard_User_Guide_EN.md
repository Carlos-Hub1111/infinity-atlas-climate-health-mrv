# InfinityAtlas Public Dashboard User Guide

## Safe consultation of territorial information

**Product:** InfinityAtlas Climate & Health MRV Toolkit<br>
**Owner and operator:** INFINITYGAIA S.A.S. B.I.C.<br>
**Document version:** 1.0 — Submission closure<br>
**Date:** 8 August 2026

> Public controlled demonstration. No sign-in is required. The data does not constitute a medical
> diagnosis, health efficacy evidence or independent verification of a territorial event.

## Contents

1. [Open the Dashboard](#1-open-the-dashboard)
2. [Public data boundary](#2-public-data-boundary)
3. [Header and indicators](#3-header-and-indicators)
4. [Filters and selected records](#4-filters-and-selected-records)
5. [Climate context](#5-climate-context)
6. [Charts and interpretation](#6-charts-and-interpretation)
7. [Territorial map](#7-territorial-map)
8. [PDF and CSV downloads](#8-pdf-and-csv-downloads)
9. [Common problems](#9-common-problems)
10. [Seven-minute live demonstration](#10-seven-minute-live-demonstration)

# 1. Open the Dashboard

Local Central Portal: http://127.0.0.1:5173/<br>
Local direct route: http://127.0.0.1:5173/#public<br>
Active Internet demo: https://infinityatlas-public-demo.infinitygaia.workers.dev

The local surface is used with local services. The Internet surface is the active controlled,
read-only Cloudflare deployment. A preview URL may point to a non-active candidate version and
should be used only when specifically supplied for UAT.

# 2. Public data boundary

The public surface can show authorized counts, climate, categories, non-clinical risk levels,
provenance, review states, public titles, dates, geoprivacy-safe locations and reports.

It cannot create, edit, validate, reject or delete observations. It does not expose passwords,
users, sessions, actors, internal comments, institutional audit, restricted evidence, protected exact
coordinates, clinical data or information identifying children.

# 3. Header and indicators

The header identifies InfinityAtlas, INFINITYGAIA S.A.S. B.I.C., territory, period, timezone, data
source, API status, update time, active language and the controlled-prototype notice.

| Indicator | What it counts | What it does not prove |
| --- | --- | --- |
| Total records | Records in the current public filter scope | Number of real emergencies |
| Pending | Not yet methodologically reviewed | Incorrect or unsafe event |
| Validated | Reviewed as methodologically complete | Independent event verification |
| Observed | Needs clarification or more evidence | Medical observation |
| Rejected | Did not meet the current method | Absence of territorial concern |
| Public real data | Identified public-source provenance | Local station measurement unless stated |
| Controlled test | Explicit prototype exercise | Real territorial event |
| Synthetic demo | Fictitious demonstration record | Real-world evidence |
| Low/Moderate/High/Critical | Latest transparent methodological score | Clinical severity or emergency declaration |

Use each accessible information icon for its bilingual definition. Color supports the text but is not
the only way the category is communicated.

# 4. Filters and selected records

## 4.1 Global filters

| Filter | Use |
| --- | --- |
| Territory | Select the available public territory |
| From / To date | Limit observation dates |
| Category | Water, waste, heat or environmental pollution |
| Review status | Pending, Validated, Observed or Rejected |
| Data provenance | Public real, controlled test or synthetic demo |
| Risk level | Low, Moderate, High or Critical |
| Record number or title | Search by public/technical number or short title |
| Apply filters | Updates indicators, records, charts, interpretation, map and downloads |
| Clear filters | Returns to the complete controlled public dataset |

Active-filter chips and “X of N records” show the current scope. Filter values are reflected in the
URL where implemented so the public view can be reproduced.

## 4.2 Filtered results

Each safe row shows public sequence number, technical ID, title, category, review state, risk,
provenance, date and public location mode. **View on map** focuses a permitted point or explains that
the location is hidden.

Use row checkboxes to select one or more records. If records are selected, downloads include only the
selection. If none is selected, downloads use the active filter scope.

# 5. Climate context

Open-Meteo provides model-based public weather context for the configured coordinates. The panel
separates:

- the time observed by the provider; and
- the time InfinityAtlas last queried the provider.

**Refresh climate** shows a spinner, disables duplicate clicks and announces success or failure. If a
new query returns the same provider interval, the query time changes while the provider observation
time correctly remains unchanged. A stored fallback must be labeled stale, never current.

Climate context does not prove that any observation, risk or health outcome occurred.

# 6. Charts and interpretation

| Visualization | Question it answers |
| --- | --- |
| Review status bars | How many records are in each review state? |
| Risk-level bars | How many records have each methodological risk level? |
| Category bars | How many records concern each environmental category? |
| Provenance bars | How many are public real, controlled or synthetic? |
| Complementary donut | What are the count and percentage shares for one selected dimension? |
| Records observed by date | How many records have each observation date? |
| Interpretive reading | What factual pattern appears in the current selection? |

Charts react to active filters. Tooltips work with pointer, keyboard focus and touch and close on
mouse leave, blur, Escape, second touch or outside touch. Text summaries remain available for screen
readers.

“Records observed by date” measures record volume. It does not show clinical evolution or automatic
risk intensity. One record per date is too small a sample to establish a trend.

# 7. Territorial map

The Leaflet map uses OpenStreetMap attribution. Users can pan, zoom, center on San Cristóbal, select a
marker and use the accessible record list.

| Location mode | Public behavior |
| --- | --- |
| Exact | Shows the authorized exact public point |
| Approximate | Rounds or displaces precision according to configuration |
| Aggregate | Shows a general territory point |
| Hidden | Counts the record but does not reveal a coordinate |

Filtered results keep the map mounted. One mappable result centers and opens it; multiple results fit
their bounds; zero results display a clear empty state. Hidden locations never reveal restricted
coordinates.

# 8. PDF and CSV downloads

## 8.1 Public PDF

The report applies the active filters or manual record selection. It includes a cover, contents,
prologue, executive summary, factual per-record sections, public territorial representation,
methodology, geoprivacy, licenses and limitations. High or Critical controlled records are not
presented as real emergencies.

## 8.2 CSV for Excel

This option uses UTF-8 with BOM, semicolon separators and readable Spanish-oriented headers so common
Excel installations can split columns correctly.

## 8.3 Technical interoperable CSV

This is the canonical machine-readable file. It uses comma separators, stable machine column names,
UTF-8 and ISO 8601 dates for Excel, Power BI, GIS, audit and data integration.

Typical public columns include observation ID, public number, record title, category, review status,
risk score and level, provenance, observed UTC date, geoprivacy-safe coordinates, location mode,
methodology version and prototype notice. The public data dictionary explains each field.

Neither CSV contains passwords, actors, private comments, restricted evidence or protected internal
coordinates.

# 9. Common problems

| Problem | Likely cause | Resolution |
| --- | --- | --- |
| Page does not open | Local services stopped or temporary Cloudflare issue | Start local services or retry the HTTPS URL once |
| Map does not load | Network or tile provider unavailable | Keep the list visible and retry later |
| Climate does not update | Open-Meteo unavailable | Read the stale label and last query time |
| No filtered records | Filters are too narrow | Select Clear filters |
| PDF does not download | Browser blocked download or service error | Allow the download and retry once |
| CSV opens in one column | Technical CSV opened with locale defaults | Use CSV for Excel or import with comma delimiter |
| Old screen remains | Browser cache | Hard refresh the page |
| Local and Internet values differ | Different controlled dataset/version | Confirm which environment is being demonstrated |
| Expected validated record is absent | No automatic institutional publication | Ask the data owner about the authorized release process |

# 10. Seven-minute live demonstration

- **0–1:** Present the Central Portal and data separation.
- **1–2:** Open the Public Dashboard without signing in.
- **2–3:** Explain indicators and live/stale climate provenance.
- **3–4:** Apply one category or risk filter and select records.
- **4–5:** Show charts, interpretive reading and geoprivacy-aware map.
- **5–6:** Download a filtered PDF and technical/Excel CSV.
- **6–7:** State: “InfinityAtlas improves territorial intelligence, traceability and privacy. This controlled prototype does not diagnose health conditions or claim that a demonstrated record is a verified emergency.”

[Back to the English guides index](README.md)
