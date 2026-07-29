# Proposal: Harden GM + Two-Player Live Campaign Sessions

## Why

MekStation has working multiplayer, co-op campaign, GM intervention, replay, and persistence seams, but they do not yet form one durable authority boundary that can prove immediate persistence, ordered multi-client delivery, player-safe visibility, reconnect continuity, and auditable rewind across a long-running campaign. The next campaign playtest needs those guarantees before a game master and two independent player clients can safely run many scenarios over time.

## What Changes

- Add one authoritative campaign-session journal and transactional outbox contract: an accepted command is persisted once before any client receives its committed result, while rejected commands create no gameplay/campaign mutation or publication. Rejections are retained only as append-once, access-controlled audit records keyed by command identity.
- Add durable participation records for one non-playing GM authority connection and two tactical player seats, with authenticated ownership, readiness, acknowledgement cursors, idempotency keys, and reconnect/resume behavior.
- Project every live, replayed, exported, and resynchronized event per viewer before serialization so players receive exactly the public and owned information they may see and never GM-only or opposing-player secrets.
- Add append-only correction and rewind branches for combat and campaign time. Prior history remains immutable; superseded branches, reasons, actors, causality, and player-visible consequences remain auditable.
- Add a durable combat-outcome outbox and idempotent campaign inbox so scenario conclusions reach campaign state exactly once across retries, reconnects, and process restarts.
- Add a three-browser sandbox acceptance contract covering a non-playing GM host and two player clients through campaign join, force ownership, scenario launch, combat choices, GM interventions, correction/rewind, retroactive campaign updates, disconnect/reconnect, replay, export, and long-running continuation.
- Add responsiveness and backpressure gates: healthy clients are not blocked by a slow client; accepted-command-to-render latency is measured per viewer; large catch-up and projection rebuilds expose progress and remain authority-gated.
- Preserve existing reducers, fog-of-war projections, GM preview/implementer seams, campaign reconciliation paths, and server-authoritative transport. A separate broker or service is deferred until measurements justify it.

## Non-goals

- Replacing the existing combat or campaign reducers, WebSocket protocol, SQLite persistence stack, or Zustand UI architecture.
- Shipping a general-purpose event-streaming platform, cross-region replication, or a separate message broker without measured need.
- Allowing players to commit rewinds, inspect GM-only history, edit another player's force, or bypass normal mechanical validation.
- Making speculative GM previews visible to players before the GM finalizes a change.
- Bundling unrelated gameplay audit defects such as SUPERHEAVY gyro serialization, zero-BV campaign materialization, Quick Game recovery bootstrap, or customizer validation into this change; those remain separate regression PRs.
- Changing BattleTech construction rules, tech-base compatibility, temporal equipment availability, or canonical unit data.

## Capabilities

### New Capabilities

None. The change strengthens the existing capability boundaries rather than creating a duplicative umbrella specification.

### Modified Capabilities

- `event-store`: Add atomic command batches, immutable authority sequencing, branch/supersession lineage, effective-head activation, and cache-only checkpoint/compaction rules.
- `multiplayer-server`: Add authenticated membership-before-attachment, per-session command serialization, append-before-publish outbox behavior, durable active bindings, and slow-client isolation.
- `multiplayer-sync`: Add stable intent identity, at-least-once delivery with exactly-once client application, gapless per-viewer delivery sequences, heartbeat liveness, acknowledgement cursors, and replay/live overlap recovery.
- `coop-campaign-sync`: Add one non-playing GM plus two tactical player memberships, per-player force ownership and readiness, process-restart recovery, explicit GM-loss pause, and scenario progression convergence gates.
- `campaign-management`: Add an awaited authoritative campaign creation/adoption checkpoint and canonical customized-unit handoff into owned forces.
- `campaign-persistence`: Add the durable server journal/projection authority, additive migration and cutover, campaign-scoped activity projections, idempotency retention, and semantic stale-command conflict behavior.
- `campaign-combat-loop`: Add a durable combat-outcome outbox, idempotent campaign inbox/receipt, the pre-receipt combat-rewind boundary, coordinated post-receipt correction, and scenario-N+1 gating.
- `gm-authority-redaction`: Add pre-serialization viewer projection, private-audit separation, sealed-choice finalization, and live/replay/snapshot/export visibility parity.
- `gm-combat-interventions`: Add finalized immutable correction commits, GM-only combat rewind, player rewind requests, stale-branch rejection, and deterministic replacement-branch activation.
- `audit-timeline`: Add immutable branch/supersession provenance, actor and reason attribution, cross-journal causality, and authorization-filtered history and export views.
- `e2e-testing`: Add the strict three-context sandbox, persistence-backed authority assertions, privacy matrices, fault injection, recovery, performance methodology, evidence bundles, and post-merge exact-main regression gates.

## Impact

- **Server authority and storage:** `src/lib/multiplayer/server/`, campaign host/store registries, event stores, socket lifecycle and protocol envelopes, SQLite schemas/adapters, startup recovery, and outcome reconciliation.
- **Client synchronization:** multiplayer and co-op clients, reconnect hooks, active route bootstrap, replay/live reducers, projection decoding, campaign mirrors, readiness/ownership surfaces, and progress/error states.
- **GM and campaign flows:** combat intervention preview/commit, campaign ledger, time cascade, audit timeline, post-combat reconciliation, and correction/rewind UI.
- **Verification:** focused unit/contract suites, deterministic failure injection, three isolated browser contexts, persistence-backed assertions, visibility matrices, latency evidence, replay/export parity, and post-merge regression audits.
- **Dependencies:** no new runtime dependency is required by default. Existing WebSocket, SQLite, reducer, and Playwright/Jest infrastructure remains the implementation base. Native SQLite compatibility is a required preflight before implementation or durable test claims.
- **Related planning:** the execution order, small-PR boundaries, proof gates, and rollback points are maintained in `implementation-plan.md`; acceptance scenarios remain linked from the change design and tasks.
