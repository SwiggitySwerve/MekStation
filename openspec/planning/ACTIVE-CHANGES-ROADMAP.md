# Active OpenSpec Roadmap

**Status date:** 2026-05-01
**Scope:** The 5 currently active OpenSpec changes under `openspec/changes/`.
**Validation baseline:** `npx openspec validate --all --strict` passes with
184 items, 0 failures.

This document is an implementation-order reference for the active queue. It is
not a replacement for each change's `proposal.md`, `design.md`, `tasks.md`, or
delta specs. Use it to decide what to start next, what can run in parallel, and
where merge conflicts are likely.

## Current Active Queue

The active queue currently has five in-progress changes. Three
phase 7 tactical visual changes archived 2026-05-01 in two
implementation slices + one archive slice:
- `add-movement-interpolation-animations` (45/45) archived as
  `archive/2026-05-01-add-movement-interpolation-animations`. New
  requirements: 1 ADDED to `movement-system` (Movement Animation
  Replay Backfill, with the legacy-event-snap fallback) and 4
  ADDED to `tactical-map-interface` (Movement Path Interpolation,
  Jump Arc Animation, Phase Advancement Gate On Active Animations,
  Reduced Motion Accessibility).
- `add-damage-feedback-effects` (56/56) archived as
  `archive/2026-05-01-add-damage-feedback-effects`. New
  requirements: 2 ADDED to `damage-system` (Destruction Events
  Carry UI Metadata, Persistent Effect State Derivable From
  Snapshot) and 7 ADDED to `tactical-map-interface` (Screen Shake,
  Hit Location Flash, Smoke From Destroyed Locations, Engine Fire,
  Debris Cloud And Wreck Sprite, Persistent Effects Survive
  Replay, Persistent Effect Layer Ordering).
- `add-attack-visual-effects` (48/48) archived as
  `archive/2026-05-01-add-attack-visual-effects`. New
  requirements: 6 ADDED to a brand-new `attack-effects-system`
  spec, 1 ADDED to `tactical-map-interface` (Attack Effects
  Layer), 1 ADDED to `weapon-resolution-system` (Attack Events
  Declare Visual Category).

The Phase 7 archive slice converted 4 mislabeled `MODIFIED`
headers in the deltas to `ADDED` (3 cases) or to a renamed
`ADDED` header (1 case — `Movement Animation Replay Backfill`,
the only delta scenario that was genuinely additive).

| Change | Tasks | Lane |
| --- | ---: | --- |
| `wire-encounter-to-campaign-round-trip` | 15/42 | Campaign closure |
| `add-multi-type-record-sheet-export` | 46/54 | Phase 6 export |
| `add-p2p-game-session-sync` | 12/33 | Phase 4 multiplayer |
| `add-game-session-invite-and-lobby-1v1` | 29/39 | Phase 4 multiplayer |
| `add-los-and-firing-arc-overlays` | 43/56 | Phase 7 tactical visuals |

## Lane Model

```text
Lane A: Campaign closure
  wire-encounter-to-campaign-round-trip

Lane B: Phase 6 construction/export
  add-infantry-construction -> add-multi-type-record-sheet-export

Lane C: Phase 7 tactical visuals
  tactical foundation -> movement -> LOS/arcs -> attack FX -> damage FX / heat FX

Lane D: Phase 4 multiplayer
  P2P sync -> lobby (reconnect + fog archived 2026-04-30)
```

## Recommended Implementation Waves

### Wave 0: Reconcile Active Changes

Before coding a lane, perform a fast evidence audit:

- Compare `tasks.md` against current source.
- Mark tasks complete only when code and tests already prove them.
- Capture remaining gaps in that change's `tasks.md` or a short handoff note.
- Run `npx openspec validate <change-id> --strict` after task/spec edits.

This matters because campaign, infantry, and record-sheet export already have
partial or substantial implementation in source while OpenSpec still shows
`0/N`.

## Per-Change OpenSpec Lifecycle

Use this lifecycle for every change in the roadmap. The implementation order
below says what to start; this section says how each change moves from active
to complete.

1. Prepare
   - Read that change's `proposal.md`, `design.md`, `tasks.md`, and delta
     specs before editing source.
   - Reconcile already-shipped code against `tasks.md`; mark only proven tasks
     complete.
   - Run `npx openspec validate <change-id> --strict` before source work if
     task or spec files changed.

2. Apply
   - Implement from the change artifacts, not from memory of the roadmap.
   - Keep each branch scoped to one OpenSpec change or one explicitly named
     shared foundation PR.
   - Update `tasks.md` as tasks become code-and-test complete.
   - Run the targeted gates listed in that change plus any surface-specific
     repo gates from this roadmap.

3. Verify
   - Verify the implementation against `proposal.md`, `design.md`, `tasks.md`,
     and delta specs before opening or merging the final PR for the change.
   - Rerun `npx openspec validate <change-id> --strict` and any relevant unit,
     a11y, story, build, BV, or schema gates.
   - Capture any intentional deferrals in `tasks.md` with a reason.

4. Merge
   - Merge implementation through PRs only; never push directly to `main`.
   - Rebase or refresh sequential PRs when branch protection or strict checks
     require it.
   - Do not archive a change until the implementation PR has landed on `main`.

5. Archive
   - Archive completed changes after their implementation has merged and
     `main` is current locally.
   - Sync accepted delta specs into canonical specs as part of archive work.
   - Run `npx openspec validate --all --strict` after archive edits.
   - Archive branches can be grouped only when their spec areas do not conflict;
     otherwise archive sequentially in the same dependency order as the lanes.

### Wave 1: Parallel Foundations

These four branches can start at the same time with low cross-lane conflict:

1. `wire-encounter-to-campaign-round-trip`
   - Stabilizes campaign battle state, outcome queues, day advancement, review
     handoff, and scenario linkage.
   - Independent of infantry, record sheets, tactical visuals, and P2P.

2. `add-infantry-construction`
   - Stabilizes infantry data shape before record-sheet export consumes it.
   - Split into types/tables, validation helpers, store actions, UI, tests.

3. Tactical presentation foundation
   - A small shared foundation before the five visual changes diverge.
   - Defines map effect layer ordering, reduced-motion helper, visual event
     subscription helpers, and animation queue shape.
   - This may be implemented as the first PR inside
     `add-movement-interpolation-animations`.

4. `add-p2p-game-session-sync`
   - Multiplayer root: peer channel, host/guest roles, host-authoritative RNG,
     guest mirror session, intents, side ownership.
   - Lobby/reconnect/fog should not wire final behavior until this contract is
     stable.

### Wave 2: Branch From Foundations

After Wave 1 contracts land:

1. `add-movement-interpolation-animations`
   - First tactical visual spec.
   - Creates `useAnimationQueue`, movement path payloads, and phase-advance
     gating needed by later effect timing.

2. `add-game-session-invite-and-lobby-1v1`
   - Depends on P2P role/channel semantics.
   - Lobby contracts and UI shell may start earlier; launch integration waits
     for P2P session creation and side ownership.

3. `add-multi-type-record-sheet-export`
   - Start non-infantry renderers/extractors in parallel: vehicle, aerospace,
     battle armor, ProtoMech.
   - Do the infantry renderer/extractor after `add-infantry-construction`
     stabilizes platoon, motive, field gun, secondary weapon, and specialization
     fields.

### Wave 3: Tactical Visual Stack

1. `add-los-and-firing-arc-overlays`
   - Utility classifiers can start early.
   - Final map integration follows movement so overlays suppress during active
     movement animations.

2. `add-attack-visual-effects`
   - Depends on attack event metadata and the animation queue.
   - Impact flash timing becomes the sync point for damage feedback.

3. `add-damage-feedback-effects`
   - Primitive components can be developed in parallel.
   - Final timing should follow attack effects so damage feedback synchronizes
     to impact flash instead of firing immediately from `DamageApplied`.

4. `add-heat-and-shutdown-visual-indicators` — ARCHIVED 2026-04-30 as
   `archive/2026-04-30-add-heat-and-shutdown-visual-indicators`. New
   requirements landed in `heat-overflow-effects` (Heat Threshold Events
   For UI) and `tactical-map-interface` (shutdown overlay, heat glow
   tier, animation queue layer order, reduced-motion fallback, low-FPS
   auto-disable). Coordinate token layer order in the remaining tactical
   visual specs against the canonical
   `tactical-map-interface` spec rather than this delta.

### Wave 4: Multiplayer Hardening — ARCHIVED 2026-04-30

Both Wave 4 changes archived on 2026-04-30. Their delta specs synced into
source-of-truth and the change directories now live under
`openspec/changes/archive/2026-04-30-*`. Source-of-truth specs touched:
`fog-of-war` (created), `multiplayer-server`, `multiplayer-sync`,
`spatial-combat-system`, `auto-save-persistence`, and
`game-session-management`.

- `add-fog-of-war-event-filtering` shipped: visibility tags/classification,
  standalone filtering/redaction, per-recipient broadcast integration,
  filtered reconnect replay, fog token projection, hidden designation
  redaction, last-known/sensor rendering, integration tests for LOS loss/
  re-entry + ambush redaction, fog-disabled no-op coverage, and LOS
  performance guards.
- `add-game-session-persistence-for-reconnect` shipped: IndexedDB match
  logs with append-side persistence and disk/memory mismatch toast,
  session hydration, 60s replay/grace constants, server-side grace
  pause/resume/abort, host `getEventsFromSeq` + 64-event replay chunks,
  the `useP2PReconnectSession` hook driving URL/late-join activation and
  10s host-absent fallback to `hostPending`, `reconnect-reject "Match
  in progress"` for foreign peers, match-log completion/purge/debug
  cleanup, and the two mock-sync catch-up integration tests.

Remaining Phase 4 multiplayer work in the active queue:

1. `add-p2p-game-session-sync` (12/33) — P2P session foundation that
   the rest of the multiplayer stack already consumed; close out the
   remaining contract / ownership / RNG tasks.
2. `add-game-session-invite-and-lobby-1v1` (29/39) — lobby UI shell
   exists; finish launch integration against the now-stable session
   identity contract used by the archived reconnect work.

## Parallel Work Board

```text
Start now:
  A1 campaign-round-trip audit + remaining integration
  B1 infantry construction audit + types/tables/validation
  C1 tactical foundation + movement queue contract
  D1 P2P game session channel + contracts

After first merges:
  B2 record-sheet non-infantry renderers/extractors
  C2 movement integration + LOS utility classifiers
  D2 lobby contracts/UI shell

Later:
  C3 attack primitives + damage primitives + heat primitives
  (D3 reconnect persistence + D4 fog filtering archived 2026-04-30)
```

## First Branches To Open

Use these branch names when starting implementation work:

- `codex/openspec-campaign-round-trip`
- `codex/openspec-infantry-construction`
- `codex/openspec-tactical-foundation-movement`
- `codex/openspec-p2p-game-session-sync`

Avoid opening all 10 implementation branches at once. Four lanes gives useful
parallelism without making shared files unmergeable.

## Known Blockers And Decisions

- `add-multi-type-record-sheet-export` is blocked by
  `add-infantry-construction` for the infantry record sheet.
- `add-game-session-invite-and-lobby-1v1` is blocked by P2P channel, role, and
  side ownership contracts for launch integration.
- Reconnect grace policy decision: settled at 60s pending/grace per
  the archived `add-game-session-persistence-for-reconnect` change.
  `add-p2p-game-session-sync` should adopt the 60s constant rather
  than the legacy 120s value when finishing its remaining tasks.
- Tactical visual specs need one shared layer-order decision before individual
  effects are integrated.

## Merge Conflict Hotspots

Assign one owner per wave for these files or areas.

### Campaign

- `src/types/gameplay/GameSessionInterfaces.ts`
- `src/services/encounter/EncounterService.ts`
- `src/services/encounter/encounterToGameSession.ts`
- `src/engine/InteractiveSession.ts`
- `src/stores/campaign/useCampaignStore.ts`
- `src/lib/campaign/dayAdvancement.ts`
- campaign processors and review pages

### Infantry And Record Sheets

- `src/types/unit/InfantryInterfaces.ts`
- `src/stores/infantryState.ts`
- `src/stores/useInfantryStore.ts`
- `src/components/customizer/infantry/*`
- `src/types/printing/RecordSheetTypes.ts`
- `src/services/printing/RecordSheetService.ts`
- `src/services/printing/recordsheet/*`
- `src/services/printing/svgRecordSheetRenderer/*`

### Tactical Visuals

- `src/components/gameplay/HexMapDisplay/HexMapDisplay.tsx`
- `src/components/gameplay/HexMapDisplay/Overlays.tsx`
- `src/components/gameplay/HexMapDisplay/useMapInteraction.ts`
- `src/components/gameplay/GameplayLayout.tsx`
- `src/hooks/useGameplayHotkeys.ts`
- `src/components/gameplay/UnitToken/*`
- `src/components/gameplay/sprites/*`
- `src/types/gameplay/GameSessionInterfaces.ts`
- `src/utils/gameplay/gameEvents/*`
- `src/stores/useGameplayStore.*`

### Multiplayer

- `src/types/gameplay/GameSessionInterfaces.ts`
- `src/engine/InteractiveSession.ts`
- `src/lib/p2p/*`
- `src/types/multiplayer/Protocol.ts`
- `src/types/multiplayer/Lobby.ts`
- `src/components/multiplayer/*`
- `src/lib/multiplayer/server/*`

## Done Definition For The Active Queue

- Each active change has tasks checked off or explicitly deferred with a reason.
- Each active change passes `npx openspec validate <change-id> --strict`.
- Each completed change has gone through apply, verify, merge, and archive.
- Repo-wide `npx openspec validate --all --strict` remains green.
- Relevant unit/a11y/story/build/BV gates are run per touched surface.
- Changes are merged through PRs, not pushed directly to `main`.
