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

## Verification

Frontend tests cover:

- bilingual accessible status tooltips;
- refresh text, animation, temporary button lock and restoration after success or failure;
- observation-number search;
- audit filtering;
- observation-only timeline;
- return to global activity.

No Sprint 1C feature, final dashboard, complete map or reporting module was introduced.
