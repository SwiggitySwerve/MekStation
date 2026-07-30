## Context

`InteractiveSession` is the authoritative local combat object. Its constructor and explicit `appendAndPersistEvent` path mirror events to `matchLogStorage`, and launch recovery seeds and flushes the initial log. Most phase and command collaborators, however, create a replacement `IGameSession` containing new events and commit it through the runtime context's `setSession` callback. That callback currently updates memory only. The active browser journey therefore reaches Movement with seven events while IndexedDB retains only the two launch events; reload derives a valid but stale Initiative state.

The existing `auto-save-persistence` capability already requires a drivable IndexedDB recovery round-trip. This wave repairs the commit boundary without changing combat rules, event schemas, the Zustand gameplay store, or multiplayer authority.

## Goals / Non-Goals

**Goals:**

- Make every authoritative local `InteractiveSession` mutation durably mirror its newly appended event suffix.
- Preserve event order, match identity, batching, divergence reporting, and exactly-once enqueueing.
- Prove the behavior with a real IndexedDB-backed engine regression and a same-match cold-reload browser journey.

**Non-Goals:**

- Persisting arbitrary UI-only or event-free state replacements.
- Introducing snapshots as a second source of gameplay authority.
- Changing combat/campaign/multiplayer behavior, unrelated engine collaborators, or the match-log schema.

## Decisions

### Persist at the authoritative session-commit boundary

The browser runtime session replacement boundary SHALL verify that existing event ids and sequences remain a prefix, then enqueue only the appended suffix in `matchLogStorage`. A truncated or rewritten prefix marks divergence without writing; server-owned sessions keep their separate `IMatchStore` authority and do not use this browser mirror.

This boundary covers phase, movement, attack, AI, lifecycle, and future collaborators that commit event-sourced changes through the same context. Updating each command separately was rejected because it would duplicate persistence logic and remain vulnerable to new or overlooked mutation paths.

### Keep IndexedDB event logs as the recovery authority

The Zustand gameplay store continues to reference the live `InteractiveSession`; it does not become the persistence owner. Reload recovery continues to rebuild `currentState` from ordered `IGameEvent` records in IndexedDB. No snapshot or session-storage fallback is added.

### Consolidate existing explicit persistence through one path

Paths that currently update the session and then call the private match-log persistence helper SHALL be adjusted so each event is enqueued exactly once. The generic commit path remains responsible for persistence after the change.

### Preserve non-crashing degradation and divergence feedback

Storage failures SHALL continue to leave the interactive match playable in memory and mark match-log divergence through the existing error path. The commit boundary must not turn an IndexedDB rejection into a synchronous command failure.

### Verify authority at two levels

A focused engine regression SHALL drive a real phase or command mutation, flush a real `MatchLogStorage`, and compare stored sequence/type order with the live session. The browser journey SHALL inspect the raw IndexedDB tail, cold reload the same route, and assert the recovered phase/events/state rather than comparing two in-memory sessions.

## Risks / Trade-offs

- **[Risk] Multiple session replacements during one command enqueue overlapping suffixes** → Compute the suffix against the immediately previous committed session and assert exact stored sequences in regression coverage.
- **[Risk] Fire-and-forget writes are not flushed before an immediate reload** → Retain the storage batching/flush contract and make the browser journey wait for authoritative raw-store evidence before reloading.
- **[Risk] Browser storage is unavailable** → Preserve existing in-memory play and divergence/error behavior; the unload guard remains the safety net.
