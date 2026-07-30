## Context

The journal foundation records `eventVersion`, but current replay paths can silently ignore unknown events and current checkpoints do not fully bind projector/source versions. This wave implements the `event-store` and `replay-library` deltas before any production authority cutover.

## Goals / Non-Goals

**Goals:**

- Deterministic upcasting and projection from immutable stored payloads.
- Explicit failure for unknown or unsupported history.
- Cache-only checkpoints proven equivalent to full replay.
- Per-session quarantine that does not disable healthy sessions.

**Non-Goals:**

- Changing domain rules, production write authority, branching, or side effects.
- Rewriting historical rows or performing network/time/random work during replay.

## Decisions

### D1 — Register schema transitions and projectors separately

```ts
interface IEventSchemaRegistry {
  upcast(eventType: string, fromVersion: number, payload: unknown): ICurrentEventPayload;
}

interface IProjectorRegistration<TState> {
  projectorId: string;
  projectorVersion: number;
  initialState(): TState;
  apply(state: TState, event: ICurrentStoredEvent): TState;
}
```

Upcasters are pure single-step transitions composed by the registry. Stored payloads never change. Event version, projector version, and application release remain separate identities.

### D2 — Persist resolved nondeterminism

Accepted events retain RNG results and stable versioned references for catalogs/rules/external input. Replay code receives no clock, RNG, network, or effect dispatcher. Existing tech-base, temporal-availability, and construction validation remain command-time concerns; replay consumes the accepted result/reference.

### D3 — Checkpoints are disposable verified caches

A checkpoint is keyed by stream, branch, revision, projector ID/version, source-tail digest, and state digest. Recovery uses it only after compatibility and digest checks, then proves the tail is contiguous. Full replay remains the reference implementation in contract tests.

### D4 — Unknown history quarantines one authority scope

Unsupported type/version, broken fixed-root continuity, or digest mismatch yields a typed blocked result and no partial baseline/publication. Before the later branching wave, recovery validates the deterministic root branch, contiguous revisions, and predecessor/event digests only. Full parent/base/supersession lineage validation begins when branch records exist. A session registry records the quarantine reason and recovery action. Zustand surfaces may render the typed blocked state but cannot bypass it.

## Risks / Trade-offs

- [Upcaster chains grow indefinitely] → Keep transitions pure, test every supported starting version, and permit explicit archival readers without rewriting authority.
- [Checkpoint bugs mask replay bugs] → Run full-replay equivalence fixtures and invalidate on any version/digest mismatch.
- [Quarantine harms availability] → Scope it to one stream/session and keep a healthy control session in every corruption test.

## Migration Plan

1. Inventory existing event types and assign explicit baseline versions.
2. Add runtime schemas and registries with strict unknown-event failure.
3. Add deterministic replay tests before changing recovery paths.
4. Add checkpoints behind a disabled optimization flag and prove equality.
5. Enable compatible checkpoint recovery; retain full replay fallback.

Rollback disables checkpoint use and returns to full replay. Stored events and checkpoint rows remain untouched.

## Open Questions

None before implementation; every newly introduced event type must supply a current schema and replay fixture.
