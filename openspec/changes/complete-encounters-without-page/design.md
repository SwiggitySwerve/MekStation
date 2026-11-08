## Ownership
`EncounterLifecycle.ts` (S1a) stays the only transition owner. The fast-forward runner is a transport caller: it reaches the real `/api/encounters/:id/session` handler through the in-process router, the same boundary a browser uses. No persistence import is added to engine or simulation code.

## Ordering
Run to completion, derive the outcome, pass the damage tripwire, link the session, complete it, then publish. A tripwire failure leaves the encounter unlinked, and a refused link or completion throws before the outcome reaches the bus, so no campaign consequence exists for an encounter that is not Completed. The materialized encounter is always a fresh row (`scenarioIds: []`), so the link carries no restart intent.

## Same-host guard
The session route keeps its same-host guard. In-process requests are same-host by construction, so the router sets `host: localhost` on every mocked request. No other routed handler applies the guard.

## Guarded close
Completion requires a terminal history (`GameEnded` last), and the page submits it only for a Completed session. Teardown without a terminal outcome therefore cannot complete an encounter. This change adds regression tests, not a new API.

## Deferred: multiplayer completion
Server match sessions are built with empty linkage, so match histories never name an encounter. The co-op mission match is created with the placeholder id `enc-<missionId>`, while the repository encounter is created later with a fresh id and linked to an unplayed placeholder session. No client joins the mission match. The follow-up design is recorded in tasks.md.
