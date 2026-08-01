## Context

The journal foundation records `eventVersion`, but the live legacy surfaces do not share that envelope: combat persists 80 `GameEventType` variants through versionless NDJSON/IndexedDB records, and campaign sync exposes seven versionless event variants. Their payload types span several large TypeScript modules without comprehensive runtime schemas. Current replay paths can also silently ignore unknown events, and current checkpoints do not fully bind projector/source versions. This wave implements the `event-store` and `replay-library` deltas before any production authority cutover.

## Goals / Non-Goals

**Goals:**

- Deterministic upcasting and projection from immutable stored payloads.
- Exhaustive, concrete runtime baseline schemas for all supported legacy combat and campaign variants.
- Explicit legacy-format version attribution without changing stored source bytes.
- Explicit failure for unknown or unsupported history.
- Cache-only checkpoints proven equivalent to full replay.
- Per-session quarantine that does not disable healthy sessions.

**Non-Goals:**

- Changing domain rules, production write authority, branching, or side effects.
- Rewriting historical rows or performing network/time/random work during replay.
- Making the generic journal envelope domain-aware or adopting it as production combat/campaign authority.

## Decisions

### D1 — Keep the registry kernel separate from domain schema packs

The registry kernel owns registration identity, duplicate/conflict rejection, one-version transitions, and typed failures. It ships first with synthetic fixtures only and treats every unregistered domain event as unsupported. A following capped PR adds deterministic fingerprints over only the target-schema and transition identities required by a supplied history prefix. The generic journal's `payload: unknown` contract remains valid storage plumbing; a domain reader establishes support only after the selected domain registry validates the payload.

Campaign and combat baseline registrations land in later capped PRs. Combat schemas follow the existing lifecycle, movement, ranged/indirect attack, damage/heat/critical, physical/PSR/ground-object, vehicle/represented-system-state, terrain/mission/morale/withdrawal, and battle-armor family boundaries. A final composition PR proves the registered discriminants exactly equal the canonical 80 combat and seven campaign variants. No partial pack is wired to production replay.

### D2 — Concrete schemas, not placeholder validation, define support

Every `(eventType, schemaVersion)` registration uses a strict concrete payload schema. Reusable nested schemas and concrete key/value maps are allowed, but `unknown`, `any`, unconstrained records, passthrough/catch-all objects, structural type guards, and representative-only fixtures do not lock a baseline. Each variant receives at least one valid fixture and an invalid mutation matrix covering missing, extra, and ill-typed authoritative fields. A newly added canonical discriminant fails completeness until its schema and fixture join the registry.

`schema-pack-inventory.md` assigns every current campaign and combat discriminant to exactly one pack before implementation. Pack ownership is non-overlapping; a live-union change or reassignment requires a reviewed spec-only inventory update before the affected pack begins. Exhaustive composition still compares the live unions, inventory, registry, and fixtures so the inventory cannot become a second unchecked source of truth.

### D3 — Versionless legacy records require named source adapters

An explicit adapter identifies the legacy source format and format version before assigning baseline schema v1. Before normalization, an NDJSON adapter captures and hashes the exact raw line bytes, while an IndexedDB/object adapter captures an immutable snapshot using the journal's versioned canonical JSON encoding and hashes those canonical bytes. The adapter returns the normalized replay envelope plus source identity and that pre-normalization source evidence. It may not mutate or rewrite the source, hash a transformed payload, or provide a global `missing eventVersion => 1` fallback. Unknown format/version, a journal event missing its required `eventVersion`, or a legacy record that cannot be attributed to a registered adapter fails with typed unsupported-history evidence.

### D4 — Register schema transitions and projectors separately

```ts
interface IEventSchemaRegistry {
  upcast(eventType: string, fromVersion: number, payload: unknown): ICurrentEventPayload;
  fingerprintPipeline(
    historicalVersions: readonly IHistoricalEventVersion[],
  ): string;
}

interface IProjectorRegistration<TState> {
  projectorId: string;
  projectorVersion: number;
  initialState(): TState;
  apply(state: TState, event: ICurrentStoredEvent): TState;
}
```

Upcasters are pure single-step transitions composed by the registry. Every transition registration has an immutable ID and explicit version. After the registry/upcaster kernel is merged and verified on exact main, the fingerprint seam adds the canonical ordered transition identities and target schema versions actually required by a checkpoint prefix. Stored payloads never change. Event version, schema-pipeline fingerprint, projector version, and application release remain separate identities.

Every supported event type also has an explicit projector decision: apply through a registered handler or perform a named, tested no-state-change transition. An absent handler is never interpreted as an implicit no-op.

### D5 — Persist resolved nondeterminism

Accepted events retain RNG results and stable versioned references for catalogs/rules/external input. Replay code receives no clock, RNG, network, or effect dispatcher. Existing tech-base, temporal-availability, and construction validation remain command-time concerns; replay consumes the accepted result/reference.

### D6 — Checkpoints are disposable verified caches

A checkpoint is keyed by stream, branch, revision, schema-pipeline fingerprint, projector ID/version, source-tail digest, and state digest. Recovery uses it only after compatibility and digest checks, then proves the tail is contiguous. Any changed target schema or upcaster registration invalidates the prior checkpoint even when the projector version is unchanged. Full replay remains the reference implementation in contract tests.

### D7 — Unknown history quarantines one authority scope

Unsupported type/version, broken fixed-root continuity, or digest mismatch yields a typed blocked result and no partial baseline/publication. Before the later branching wave, recovery validates the deterministic root branch, contiguous revisions, and predecessor/event digests only. Full parent/base/supersession lineage validation begins when branch records exist. A session registry records the quarantine reason and recovery action. Zustand surfaces may render the typed blocked state but cannot bypass it.

## Risks / Trade-offs

- [Upcaster chains grow indefinitely] → Keep transitions pure, test every supported starting version, and permit explicit archival readers without rewriting authority.
- [Checkpoint bugs mask replay bugs] → Run full-replay equivalence fixtures and invalidate on any schema-pipeline, projector-version, or digest mismatch.
- [Quarantine harms availability] → Scope it to one stream/session and keep a healthy control session in every corruption test.

## Migration Plan

1. Merge this spec-only decomposition checkpoint.
2. Add the adapter-neutral registry/upcaster kernel, then the required-history pipeline fingerprint, then named legacy-source adapters.
3. Add campaign and combat baseline schema packs independently; keep integration disabled until exhaustive 87-variant composition passes.
4. Prove deterministic input provenance and explicit projector decisions before changing replay/recovery paths.
5. Add checkpoint compatibility and persistence behind a disabled optimization flag, then prove full-replay equality and invalidation.
6. Add per-scope quarantine, integrate one replay/recovery surface per PR, and finish with the accessible blocked-state UI.

Rollback disables checkpoint use and returns to full replay. Stored events and checkpoint rows remain untouched.

## Open Questions

None before implementation; every newly introduced event type must supply a current schema and replay fixture.
