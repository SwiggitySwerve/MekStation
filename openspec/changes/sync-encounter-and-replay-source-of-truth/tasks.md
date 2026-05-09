# Tasks: sync-encounter-and-replay-source-of-truth

This is a **spec-only** change. No TypeScript, TSX, or test files are
touched in any wave. Every task either authors / edits a markdown
file under `openspec/changes/sync-encounter-and-replay-source-of-truth/`
or runs the OpenSpec validator. The final wave runs the archive **with
full spec sync — NO `--skip-specs`**.

## 1. Source-Audit Wave (read-only)

- [ ] 1.1 Read `openspec/specs/encounter-system/spec.md` — confirm it
  does not exist on `main`. If it does exist, this change is
  redundant; abort and re-evaluate scope.
- [ ] 1.2 Read `openspec/specs/replay-library/spec.md` end-to-end.
  Confirm it pins exactly four `ReplaySource` values, four
  manifest-union members, and a four-partition layout (i.e. drift
  exists vs the shipped 5-source code).
- [ ] 1.3 Read `openspec/specs/game-session-management/spec.md`
  encounter-related sections (`Encounter Launch Status Transition`,
  `Encounter CRUD via API Routes`, `Force Assignment`,
  `Encounter Validation`, `Encounter Launch`, `Encounter Cloning`).
  Confirm the existing seven encounter store / API requirements stay
  untouched by this change.
- [ ] 1.4 Read each of the five archived encounter/replay changes in
  `openspec/changes/archive/` — confirm what they shipped matches
  what's covered by the three deltas being authored here.
  - [ ] 1.4.1 `archive/2026-01-18-add-encounter-system/`
  - [ ] 1.4.2 `archive/2026-05-01-wire-encounter-to-campaign-round-trip/`
    (verify out-of-scope — already merged into source-of-truth)
  - [ ] 1.4.3 `archive/2026-05-07-add-replay-library/` (verify the
    4-source baseline matches `openspec/specs/replay-library/`)
  - [ ] 1.4.4 `archive/2026-05-09-repair-broken-encounter-drafts/`
  - [ ] 1.4.5 `archive/2026-05-09-link-encounters-to-replays/`
- [ ] 1.5 Spot-verify cited code paths exist on `main`:
  - [ ] 1.5.1 `src/types/encounter/EncounterInterfaces.ts` — read
    enum + interface definitions to confirm shape.
  - [ ] 1.5.2 `src/types/gameplay/GameSessionInterfaces.ts` — verify
    `ReplaySource` enum has 5 values; `IEncounterMeta` interface
    exists; `IGameCreatedPayload.encounterMeta` is optional.
  - [ ] 1.5.3 `src/replay-library/types.ts` — verify
    `IReplayManifestEntry` union has 5 members.
  - [ ] 1.5.4 `src/services/encounter/encounterBrokenRefs.ts` — verify
    pure helper signature.
  - [ ] 1.5.5 `src/services/forces/ForceRepository.cascade.ts` — verify
    callback registry exports.
  - [ ] 1.5.6 `src/components/encounter/persistEncounterGame.ts`,
    `persistEncounterFromSession.ts`,
    `src/pages/api/replay-library/encounter.ts`,
    `src/pages/api/encounters/seed-samples.ts`,
    `scripts/cleanup-broken-encounters.ts` — verify each file exists.

## 2. Author Wave

- [ ] 2.1 Author `proposal.md` — drift summary, scope (in/out),
  capabilities (new + modified), impact.
- [ ] 2.2 Author `design.md` — domain split rationale (new
  `encounter-system` vs absorb-into-`game-session-management`),
  per-spec organisation table, file change list, risk +
  mitigation, open questions.
- [ ] 2.3 Author `specs/encounter-system/spec.md` — full ADDED suite
  for the new source-of-truth domain. Required requirements (each
  with at least one Scenario):
  - [ ] 2.3.1 Encounter Entity Model
  - [ ] 2.3.2 Encounter Status Lifecycle
  - [ ] 2.3.3 Force-Reference Slot Semantics
  - [ ] 2.3.4 Force Configuration
  - [ ] 2.3.5 Map Configuration
  - [ ] 2.3.6 Victory Conditions
  - [ ] 2.3.7 Scenario Templates
  - [ ] 2.3.8 Encounter Launch Snapshot Metadata
  - [ ] 2.3.9 Broken-Reference Detection Helper
  - [ ] 2.3.10 Encounter List Broken-Pill Render
  - [ ] 2.3.11 Encounter Detail Repair Banner
  - [ ] 2.3.12 Sample Encounter Seeding
  - [ ] 2.3.13 One-Time Cleanup Script for Broken Drafts
- [ ] 2.4 Author `specs/replay-library/spec.md` — MODIFIED delta. Each
  requirement carries the FULL replacement text plus all preserved
  scenarios:
  - [ ] 2.4.1 ReplaySource Enum (4 → 5 values)
  - [ ] 2.4.2 IReplayManifestEntry Discriminated Union (4 → 5 members,
    with the encounter variant absorbed into the union requirement)
  - [ ] 2.4.3 Filesystem Partition Layout (adds
    `simulation-reports/encounter/` partition + scenario)
  - [ ] 2.4.4 Backfill Scan (adds encounter-metadata recovery
    scenario)
  - [ ] 2.4.5 Replay Library Page (6-button strip + Encounter row
    metadata strip)
- [ ] 2.5 Author `specs/game-session-management/spec.md` — ADDED
  delta. Required requirements (each with at least one Scenario):
  - [ ] 2.5.1 Force-Deletion Cascade to Encounter References
  - [ ] 2.5.2 Hydration-Boundary Orphaned Reference Replacement
  - [ ] 2.5.3 Encounter Game Event Log Persistence
  - [ ] 2.5.4 Encounter Metadata in GameCreated Event Payload
  - [ ] 2.5.5 Browser-Side Encounter Persist Hook
- [ ] 2.6 Author `notepad/README.md` — cross-delegation wisdom.
  Capture: domain layout, source-of-truth audit, rule reminders,
  out-of-scope list.

## 3. Self-Review Wave

- [ ] 3.1 Re-read `proposal.md`. Confirm:
  - [ ] 3.1.1 Every change item maps to a requirement in one of the
    three spec files.
  - [ ] 3.1.2 The "spec-only" framing is repeated explicitly so the
    operator does not accidentally execute code changes.
  - [ ] 3.1.3 The OUT OF SCOPE list matches the design.md scope
    decisions.
- [ ] 3.2 Re-read `design.md`. Confirm:
  - [ ] 3.2.1 Every architecture decision has a rationale + listed
    alternatives.
  - [ ] 3.2.2 The spec organisation table reflects what was actually
    authored.
- [ ] 3.3 Re-read each spec file. Confirm:
  - [ ] 3.3.1 Every Requirement uses RFC 2119 keywords (SHALL / MUST /
    MAY) consistently.
  - [ ] 3.3.2 Every Requirement carries at least one Scenario block
    with `GIVEN` / `WHEN` / `THEN` bullets.
  - [ ] 3.3.3 No Requirement cites a code path that wasn't verified
    in 1.5.x.
  - [ ] 3.3.4 No Requirement describes deferred / out-of-scope
    behaviour (e.g. IndexedDB persistence).
- [ ] 3.4 Cross-spec consistency check:
  - [ ] 3.4.1 The `IEncounterMeta` shape pinned in
    `encounter-system/spec.md` (Encounter Launch Snapshot Metadata)
    matches the shape pinned in
    `game-session-management/spec.md` (Encounter Metadata in
    GameCreated Event Payload).
  - [ ] 3.4.2 The `playerForceSummary` derivation rules are stated
    once in `encounter-system/spec.md` and referenced (not
    duplicated) in the replay-library and game-session deltas.
  - [ ] 3.4.3 The three-state force slot semantics (`undefined` /
    `null` / resolved object) are defined once in
    `encounter-system/spec.md` (Force-Reference Slot Semantics).
  - [ ] 3.4.4 Cleanup-script taxonomy strings (`'abandoned-empty'`,
    `'orphaned-force-reference'`, `'still-valid'`) are spelled
    identically wherever they appear.

## 4. Validation Wave

- [ ] 4.1 Run `npx openspec validate sync-encounter-and-replay-source-of-truth --strict`
  from the repo root.
- [ ] 4.2 If strict-mode reports errors, fix the markdown (do NOT
  invent code, do NOT loosen requirements). Re-run until clean.
- [ ] 4.3 If strict-mode reports warnings the operator deems
  acceptable, document them in the final report.
- [ ] 4.4 Capture the validator's output for the archive PR
  description.

## 5. Archive Wave (full spec sync — NO `--skip-specs`)

- [ ] 5.1 Open a PR with the change folder as the only file change
  set. The PR description SHALL include the validator output from
  4.4 and call out that this is a spec-only change.
- [ ] 5.2 Merge the PR (after CI green).
- [ ] 5.3 Run `openspec archive sync-encounter-and-replay-source-of-truth`
  from the repo root. **MUST NOT pass `--skip-specs`** — the entire
  point of this change is to merge the deltas into source-of-truth.
- [ ] 5.4 Verify the archive step:
  - [ ] 5.4.1 `openspec/specs/encounter-system/spec.md` now exists at
    the source-of-truth tree (created by the archive sync from the
    full ADDED suite). If the archive command did not auto-create
    the directory, create it manually with the correct contents and
    re-run the archive — DO NOT fall back to `--skip-specs`.
  - [ ] 5.4.2 `openspec/specs/replay-library/spec.md` reflects the
    five-source enum, five-member union, five-partition layout,
    encounter backfill recovery, and 6-button page filter strip.
  - [ ] 5.4.3 `openspec/specs/game-session-management/spec.md`
    contains the five new requirements (cascade, hydration repair,
    encounter persist, encounter-meta on GameCreated, browser persist
    hook).
  - [ ] 5.4.4 The pre-existing seven encounter store / API
    requirements (Encounter Launch Status Transition, Encounter CRUD,
    Encounter Selection and Retrieval, Force Assignment, Template
    Application, Encounter Validation, Encounter Launch, Encounter
    Cloning, Filtering and Search) are preserved unchanged.
- [ ] 5.5 The archive command moves the change folder to
  `openspec/changes/archive/YYYY-MM-DD-sync-encounter-and-replay-source-of-truth/`.
  Confirm the move and that the source-of-truth specs reflect the
  new state.
- [ ] 5.6 Update memory anchor at
  `~/.claude/projects/E--Projects-MekStation/memory/MEMORY.md`
  noting that the encounter / replay specs are now fully in
  source-of-truth and the `--skip-specs` legacy is closed.
