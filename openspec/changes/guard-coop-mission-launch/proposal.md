# Guard co-op mission launch

## Why

A double click can create two local encounters for one co-op mission. The shared match is already idempotent, but the browser drops local encounter ids on failure and never checkpoints the mission linkage. Guests currently run the same creation path despite owning a read-only campaign mirror.

## What Changes

- Only the host launches and checkpoints; guests retain participation choices and join the recorded encounter.
- A synchronous guard is scoped to the campaign store, campaign, session and mission, before any asynchronous work.
- Retry retains the prepared request, shared match receipt and local encounter id, and resumes the failed stage.
- The host awaits a single authenticated journal checkpoint and navigation. Conflicts require resync without relaunch.
- New launch is refused during a day advance; K6 remains the readiness authority.

## Impact

Affected capability: `coop-campaign-sync`. No event, replay, database or serialized campaign schema changes. Existing `scenarioIds` stores the encounter linkage. S1a owns encounter-to-session transitions and both pre-battle hooks. The in-memory attempt cannot survive a crash before the checkpoint, and old orphan encounters are not migrated or deleted.
