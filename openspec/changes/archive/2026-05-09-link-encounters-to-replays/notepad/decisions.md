# Decisions — link-encounters-to-replays

Architectural decisions made during implementation. New entries appended at top.

## [2026-05-08] PR1 — encounterMeta carries summary strings (not force IDs)

**Decision**: `IEncounterReplayManifestEntry.playerForceSummary` and `opponentSummary` are pre-formatted strings, NOT force IDs that get re-rendered at read time.

**Rationale**: Forces can be renamed or deleted post-write. The Replay Library must show what the encounter looked like AT LAUNCH, not "Force 1234 (deleted)". Baking the display string at write time guarantees historical immutability — same pattern as a database `denormalized_label` column.

**Consequence**: PR2's `persistEncounterGame` must derive the summaries at launch time and stamp them into `GameCreated.payload.encounterMeta`. PR3's UI just renders the strings verbatim — no force-store lookup at read time.

## [2026-05-08] PR1 — stub the ReplayLibraryPage case rather than break PR1 typecheck

**Decision**: PR1 adds a minimal `case ReplaySource.Encounter` branch to `SourceMetadata` in `ReplayLibraryPage.tsx` that renders only `encounterId` (with a TODO pointing at PR3). The branch satisfies the `_exhaustive: never = entry` compile-guard.

**Rationale**: The exhaustiveness check in `SourceMetadata` would fail compile the moment the union grew to 5 members. Two alternatives were considered:
1. Hold the entire 5-variant union extension until PR3 — would have made PR1 unable to ship anything compilable.
2. Drop the `_exhaustive: never` guard temporarily — would have removed the regression-detector value of the guard and risked PR3 forgetting the case branch.

The stub approach keeps both the typecheck green AND the regression-detector intact. PR3 replaces the stub body with the proper metadata strip.

**Consequence**: A user running PR1 alone in isolation never sees an Encounter row anyway (no emitter writes them yet), so the stub UI is invisible in practice. PR3 must replace it.

## [2026-05-08] PR1 — `templateType: null` round-trip uses `=== undefined` not `??`

**Decision**: The backfill builder uses `meta?.templateType === undefined ? null : meta.templateType` instead of `meta?.templateType ?? null`.

**Rationale**: A free-form / custom encounter explicitly sets `templateType: null` at write time. Using `??` would (correctly, in this case) preserve the null because null IS nullish, but the explicit form documents the intent: "missing field falls back to null; explicit null preserved as-is". The regression test round-trips `null` to pin the behavior.

**Consequence**: A future emitter that writes `templateType: undefined` (instead of omitting it) gets coerced to null too — same as the omitted case. Acceptable semantics.
