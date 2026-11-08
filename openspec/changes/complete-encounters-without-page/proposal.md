## Why
S1a (`fix-encounter-status-lifecycle`) completes encounters through the mounted game page's replay persist and through pre-battle auto-resolve. Campaign fast-forward fights its battles headlessly: it materializes a fresh Ready encounter, runs `GameEngine.runToCompletion` with that encounter's id and publishes the outcome, but never links or completes the encounter, so every fast-forwarded encounter stays Ready. Bare teardown is already prevented from completing an encounter, but nothing pins that behavior.

## What Changes
- The fast-forward combat runner links the fought session, completes it, and only then publishes the combat outcome, mirroring pre-battle auto-resolve. A refused link or completion fails the battle before publication.
- The fast-forward in-process router routes `POST`/`PATCH /api/encounters/:id/session` to the real handler and sends a loopback `Host`, because the handlers run in-process.
- The encounter lifecycle client accepts an optional injected `fetch`; the browser default is unchanged.
- Regression tests pin that unmounting a Setup, Active or Abandoned game page never submits completion.
- Multiplayer completion after a durable terminal commit is deferred (see tasks.md): no client plays the server co-op mission match today.

## Impact
Affected code: `src/lib/campaign/fastForward`, `src/services/encounter/encounterLifecycleClient.ts`. Canonical contract: `openspec/specs/encounter-system/spec.md`. No schema, event payload, wire, replay-pack or persisted-format changes. QuickResolve, quick game, P2P and the simulation runner carry no encounter linkage and remain write-free.
