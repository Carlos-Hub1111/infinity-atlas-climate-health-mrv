# Sprint 1B Product Owner UAT findings

Date: 2026-07-28

Status: implemented locally and pending final review before Sprint 1B is frozen.

## UAT-1: Public review-status explanations

Finding: the aggregate public view showed the workflow counts but did not explain the methodological
meaning of `pending`, `validated`, `observed` and `rejected`.

Resolution:

- added a contextual information control beside every review status;
- provided concise English and Spanish explanations;
- supported pointer hover, keyboard focus, `Escape`, click and touch;
- exposed each explanation as an accessible tooltip without changing counts or stored states.

## UAT-2: Climate refresh feedback

Finding: the refresh icon did not provide sufficiently clear visual feedback while a climate request
was running.

Resolution:

- continuously rotates the refresh icon during the request;
- changes the action label to `Updating climate...` / `Actualizando clima...`;
- disables the button to prevent duplicate requests;
- announces progress and completion through `aria-busy` and `aria-live`;
- restores the action after success or failure;
- displays the last query time and an explicit stored-data fallback message when the provider fails.

## UAT-3: Navigable audit

Finding: the global audit stream was complete but difficult to use when reviewing one observation.

Resolution:

- added search by observation number;
- added category, status, event, actor and UTC date filters;
- added ascending and descending chronological order;
- added a filtered observation list;
- added an observation-only timeline and a return-to-global-activity action.

The Product Owner acceptance exercise used controlled observation `#6`, with score `7 / moderate`
and the traceable transition `pending -> observed -> validated`. It does not represent a verified
territorial event.

## UAT-4: Short record identity

Finding: numeric identifiers were reliable but difficult to recognize across observation and audit
lists.

Resolution:

- added the required `record_title` field with an 80-character limit;
- added an editable bilingual suggestion derived from category and territory;
- displayed records as `#id — title — territory`;
- added search by number or title in Observations and Audit;
- allowed an owning monitor to rename only `pending` or `observed` records;
- allowed an administrator to rename in any state and prevented validators from renaming;
- recorded every actual change as append-only `record_title_changed` traceability;
- added explicit guidance against personal, clinical or identifiable information.

## UAT-5: Public provenance and risk guidance

Finding: the public aggregate counts identified provenance and risk bands but did not explain their
meaning or the non-clinical formula.

Resolution:

- added accessible English/Spanish information controls to every provenance category;
- added accessible English/Spanish information controls to low, moderate, high and critical risk;
- explained `Risk Score = Hazard + Exposure + Vulnerability` beside the risk heading;
- stated that every risk result is methodological rather than clinical;
- preserved aggregate counts and excluded evidence, actors and internal data;
- verified keyboard, pointer, click, touch and narrow mobile behavior without overlap.

## Verification

Frontend tests cover:

- bilingual accessible status tooltips;
- refresh text, animation, temporary button lock and restoration after success or failure;
- observation-number search;
- observation-title search and editable suggestion;
- monitor/admin title permissions and `record_title_changed` events;
- audit filtering;
- observation-only timeline;
- return to global activity.
- bilingual provenance and risk guidance;
- responsive mobile tooltip placement.

No Sprint 1C feature, final dashboard, complete map or reporting module was introduced.
