# Encounter lifecycle

`EncounterLifecycle.ts` owns encounter status rules. Repositories own writes;
services orchestrate operations; browser callers transport requests and mirror
server results. Presentation code must not calculate or persist status.

Configuration recalculation preserves its existing force/victory-condition
checks. Completed history stays completed. A launched encounter stays launched
unless force deletion clears both force slots. Readiness changes belong to K6.

S1a adds guarded session linking and completion in a separate behavior commit.
S1b will cover campaign fast-forward and authoritative multiplayer consumers.
