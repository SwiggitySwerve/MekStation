# Active OpenSpec Roadmap

**Status date:** 2026-04-29
**Scope:** The 12 currently active OpenSpec changes under `openspec/changes/`.
**Validation baseline:** `npx openspec validate --all --strict` passes with
189 items, 0 failures.

This document is an implementation-order reference for the active queue. It is
not a replacement for each change's `proposal.md`, `design.md`, `tasks.md`, or
delta specs. Use it to decide what to start next, what can run in parallel, and
where merge conflicts are likely.

## Current Active Queue

All active changes are currently `in-progress` with no task checkboxes marked
complete in OpenSpec. Some source code already partially implements parts of
several changes, so the first step for each lane is to audit and mark proven
tasks rather than reimplement blindly.

| Change | Tasks | Lane |
| --- | ---: | --- |
| `wire-encounter-to-campaign-round-trip` | 0/42 | Campaign closure |
| `add-infantry-construction` | 0/50 | Phase 6 construction |
| `add-multi-type-record-sheet-export` | 0/54 | Phase 6 export |
| `add-p2p-game-session-sync` | 0/33 | Phase 4 multiplayer |
| `add-game-session-invite-and-lobby-1v1` | 0/39 | Phase 4 multiplayer |
| `add-game-session-persistence-for-reconnect` | 0/39 | Phase 4 multiplayer |
| `add-fog-of-war-event-filtering` | 0/39 | Phase 4/4.5 multiplayer |
| `add-movement-interpolation-animations` | 0/45 | Phase 7 tactical visuals |
| `add-los-and-firing-arc-overlays` | 0/56 | Phase 7 tactical visuals |
| `add-attack-visual-effects` | 0/48 | Phase 7 tactical visuals |
| `add-damage-feedback-effects` | 0/56 | Phase 7 tactical visuals |
| `add-heat-and-shutdown-visual-indicators` | 0/51 | Phase 7 tactical visuals |

## Lane Model

```text
Lane A: Campaign closure
  wire-encounter-to-campaign-round-trip

Lane B: Phase 6 construction/export
  add-infantry-construction -> add-multi-type-record-sheet-export

Lane C: Phase 7 tactical visuals
  tactical foundation -> movement -> LOS/arcs -> attack FX -> damage FX / heat FX

Lane D: Phase 4 multiplayer
  P2P sync -> lobby -> reconnect persistence -> fog-of-war
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

4. `add-heat-and-shutdown-visual-indicators`
   - Mostly parallel with damage feedback after shared token layer conventions
     exist.
   - Coordinate token layer order for sprite, pip ring, selection ring, wreck,
     shutdown, heat glow, smoke, and fire.

### Wave 4: Multiplayer Hardening

1. `add-game-session-persistence-for-reconnect`
   - Storage and `InteractiveSession.fromMatchLog` can start early.
   - Reconnect protocol waits for P2P + lobby `matchId` contracts.
   - Resolve semantic conflict first: P2P currently describes quick host-loss
     abort, while reconnect persistence wants a pending/grace state.

2. `add-fog-of-war-event-filtering`
   - Last in the current active queue.
   - Requires stable event replay, LOS/spatial rules, and server broadcast
     semantics.
   - Filtered replay must use historical visibility, not current visibility.

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
  D3 reconnect storage + rehydration
  D4 fog visibility helpers, then server broadcast/replay integration
```

## First Branches To Open

Use these branch names when starting implementation work:

- `codex/openspec-campaign-round-trip`
- `codex/openspec-infantry-construction`
- `codex/openspec-tactical-foundation-movement`
- `codex/openspec-p2p-game-session-sync`

Avoid opening all 12 implementation branches at once. Four lanes gives useful
parallelism without making shared files unmergeable.

## Known Blockers And Decisions

- `add-multi-type-record-sheet-export` is blocked by
  `add-infantry-construction` for the infantry record sheet.
- `add-game-session-invite-and-lobby-1v1` is blocked by P2P channel, role, and
  side ownership contracts for launch integration.
- `add-game-session-persistence-for-reconnect` is blocked by P2P and lobby
  match identity semantics for reconnect behavior.
- Reconnect grace policy needs one decision: quick abort on host loss vs a
  pending/grace state. Also reconcile the desired 60s grace with the current
  multiplayer protocol constant if it remains 120s.
- `add-fog-of-war-event-filtering` should target stable server-side broadcast
  and replay paths, not the transitional P2P-only path.
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
