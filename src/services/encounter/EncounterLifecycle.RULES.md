# Encounter lifecycle

`EncounterLifecycle.ts` owns encounter status rules. Repositories own writes;
services orchestrate operations; browser callers transport requests and mirror
server results. Presentation code must not calculate or persist status.

Configuration recalculation preserves its existing force/victory-condition
checks. Completed history stays completed. A launched encounter stays launched
unless force deletion clears both force slots. Readiness changes belong to K6.

The single transition table allows Draft <-> Ready, Draft/Ready -> Launched,
and Launched -> Completed. Completed has no outgoing transition. The guarded
Launched -> Draft cascade clears linkage atomically. Same-session retries are
acknowledged without changing timestamps. A session cannot be reassigned, and
stale linkage blocks a new launch. The raw status setter cannot launch/complete.

Link/completion service calls validate GameCreated encounter linkage, every
event's game ID and strictly increasing sequences. Completion also requires a
terminal GameEnded event. Replay persistence validates before writing and
completes on both first-persist and dedup paths. Errors remain visible.

Persisted formats are unchanged. Reads do not repair inconsistent legacy rows;
see the change-local legacy audit guide. Configuration updates and cascades
roll back when a guarded status write fails.
S1b will cover campaign fast-forward and authoritative multiplayer consumers.
