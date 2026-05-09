# Sync Encounter and Replay Source-of-Truth

## Why

Five archived OpenSpec changes shipped working encounter and replay code,
but the source-of-truth specs never absorbed the deltas. Each archive ran
with `--skip-specs` because the original `2026-01-18-add-encounter-system`
change was archived before its `encounter-system` spec was promoted to
`openspec/specs/`, and every downstream change inherited that gap and
worked around it. The current state on `main`:

- `openspec/specs/encounter-system/` **does not exist**, even though
  `src/types/encounter/EncounterInterfaces.ts`, `EncounterService`,
  `EncounterRepository`, the `/gameplay/encounters/*` page tree, and
  `/api/encounters/*` routes have been live since 2026-01-18.
- `openspec/specs/replay-library/spec.md` describes a 4-source enum
  (`Swarm`, `Quick`, `PvP`, `Campaign`), 4-member `IReplayManifestEntry`
  union, 4-partition filesystem layout, and a page filter button strip
  with no count constraint. The shipped code on `main` has a 5th
  `Encounter` variant, a 5th union member, a 5th partition, and an
  explicit 6-button strip (`All` + 5 sources).
- `openspec/specs/game-session-management/spec.md` covers the encounter
  store CRUD + launch from earlier waves, but does not cover the
  force-deletion cascade, broken-reference helper, broken-pill UI, repair
  banner, sample seeding, cleanup script, encounter-game replay
  persistence, encounter-meta on `IGameCreatedPayload`, or the browser
  persist hook on `/gameplay/games/[id].tsx`.

The drift is silent today because the code typechecks and the tests
pass — but the next planner reading the source-of-truth specs gets a
materially false picture of the system. This change closes the gap by
authoring three artefacts (one new spec, two delta specs) that snapshot
what is already on `main`.

This is a **spec-only** change. Zero TypeScript files are touched.
Every requirement reflects behaviour observable on `main` as of
commit `2b996146` (archive of `link-encounters-to-replays`).

## What Changes

- **NEW** source-of-truth spec at `openspec/specs/encounter-system/`.
  The change folder authors it as a full ADDED-requirements suite under
  `openspec/changes/sync-encounter-and-replay-source-of-truth/specs/encounter-system/spec.md`.
  The archive sync will create the new directory in `openspec/specs/`.
  Contents: encounter entity model, lifecycle status enum, force
  configuration semantics (including the `null`-vs-`undefined`
  distinction introduced by `repair-broken-encounter-drafts`), opForConfig
  shape, scenario template enum + built-in templates, map configuration,
  victory conditions, validation rules, broken-reference helper,
  list/detail UI surfaces (broken pills + repair banner),
  cleanup-script semantics, sample-seeding API, and the launch metadata
  snapshot stamped onto `IGameCreatedPayload.encounterMeta`.

- **MODIFIED** `replay-library` spec — delta widens the existing
  4-source coverage to 5 sources:
  - `ReplaySource Enum` updated from "exactly four values" to "exactly
    five values".
  - `IReplayManifestEntry Discriminated Union` updated to include the
    fifth `IEncounterReplayManifestEntry` member with its source-specific
    fields (`encounterId`, `encounterName`, `templateType`,
    `playerForceSummary`, `opponentSummary`).
  - `Filesystem Partition Layout` extended with the
    `simulation-reports/encounter/` partition.
  - `Backfill Scan` extended with encounter-metadata recovery from the
    first `GameCreated` event.
  - `Replay Library Page` updated to require the 6-button filter strip
    (`All`, `Swarm`, `Quick`, `PvP`, `Campaign`, `Encounter`) and the
    encounter row metadata strip.

- **MODIFIED** `game-session-management` spec — delta adds the
  encounter-replay loop and the broken-encounter repair surfaces:
  - Force-deletion cascade on `ForceRepository.deleteForce` — clears
    dangling `playerForce` / `opponentForce` references on every
    affected encounter inside the same SQLite transaction, then triggers
    `recalculateStatus`.
  - Hydration-boundary orphan replacement — `EncounterService.hydrateEncounter`
    sets unresolvable refs to `null` and emits a deduped warn log.
  - Broken-reference detection helper at `src/services/encounter/encounterBrokenRefs.ts`.
  - Encounter list broken-pill render + repair-banner detail-page render
    + `setPlayerForce(id, null)` / `clearOpponentForce(id)` clear actions.
  - Sample-encounter seeding API (`POST /api/encounters/seed-samples`)
    + empty-state seed button.
  - One-time cleanup script at `scripts/cleanup-broken-encounters.ts`
    with `--manifest-only` / `--cwd` flags and the three-class
    classification taxonomy.
  - Encounter game-event-log persistence pipeline + `POST /api/replay-library/encounter`
    route + browser persist hook on `/gameplay/games/[id].tsx`
    (`useRef`+`useEffect` double-fire guard, encounter-meta-presence
    discriminator).
  - `IEncounterMeta` snapshot stamped onto `IGameCreatedPayload.encounterMeta`
    by `EncounterService.launchEncounter`.

**OUT OF SCOPE** — IndexedDB browser-side persistence (deferred follow-on
named in `link-encounters-to-replays`); replay deletion / archival;
encounter-row → source-encounter cross-link in the Replay Library page;
encounter-specific replay metrics (salvage / outcome — would require
campaign linkage); localization of snapshot summary strings;
the `wire-encounter-to-campaign-round-trip` linkage (already absorbed
into source-of-truth in an earlier wave). No code is changed by this
change.

## Capabilities

### New Capabilities

- `encounter-system` — promoted to source-of-truth from the
  `2026-01-18-add-encounter-system` archive plus everything
  `repair-broken-encounter-drafts` and `link-encounters-to-replays`
  added on top of it.

### Modified Capabilities

- `replay-library` — five-source widening across enum, manifest union,
  partition layout, backfill scan, and library page.
- `game-session-management` — encounter cascade + hydration repair +
  broken-pill UI + repair banner + seed-samples + cleanup script +
  encounter game-event-log persistence + `IEncounterMeta` on
  `IGameCreatedPayload` + browser persist hook.

## Impact

- **Code**: zero changes. This is a spec-authoring change. Every
  requirement is verifiable against existing files on `main`.
- **Specs**: one new source-of-truth spec (`encounter-system/spec.md`)
  and two modified deltas (`replay-library/spec.md`,
  `game-session-management/spec.md`). All three sync to source-of-truth
  on archive — **NO `--skip-specs`**.
- **Tests**: zero new tests. Behaviour is already covered by
  `EncounterRepository.cascade.test.ts`,
  `EncounterService.hydration.test.ts`,
  `cleanup-broken-encounters.test.ts`,
  `EncountersListPage.test.tsx`,
  `[id].test.tsx`,
  `persistEncounterGame.test.ts`,
  `src/__tests__/api/replay-library/encounter.test.ts`,
  `backfill-scan.test.ts`,
  `src/__tests__/pages/replay-library.test.tsx`,
  and `EncounterService.persist.test.ts`.
- **Filesystem**: no runtime artefacts. The change folder is
  documentation-only.
- **Existing data**: no migration. The change is observation, not action.
- **Risk**: low. The drift between specs and code already exists; this
  change closes it without changing behaviour. The archive-sync step
  carries the only material risk (delta merge into existing
  source-of-truth) — addressed by the validation discipline in
  `tasks.md` (validate strict before archive, no `--skip-specs`
  fallback).
