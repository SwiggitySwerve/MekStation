# Notepad — sync-encounter-and-replay-source-of-truth

## Purpose

Cross-delegation wisdom for the operator (and any subagent) authoring this
spec-only change. NO TypeScript code changes — every artifact in this notepad
is observation, not instruction.

## Source-of-truth audit (state on main as of 2026-05-09)

### Existing source-of-truth specs (`openspec/specs/<domain>/spec.md`)

| Domain | Encounter coverage today |
|---|---|
| `replay-library` | 4-source `ReplaySource` enum (Swarm/Quick/PvP/Campaign), 4-member discriminated union, 4-partition layout, page filter referenced abstractly. **No Encounter variant.** |
| `game-session-management` | Has `Encounter Launch Status Transition`, `Encounter CRUD via API Routes`, `Encounter Selection and Retrieval`, `Force Assignment`, `Template Application`, `Encounter Validation`, `Encounter Launch`, `Encounter Cloning`, `Filtering and Search` — all from earlier waves (already merged). **No** broken-ref repair, **no** force cascade, **no** seed-samples, **no** encounter persist hook, **no** `IEncounterMeta` on `IGameCreatedPayload`. |
| `encounter-system` | **DOES NOT EXIST.** Original `2026-01-18-add-encounter-system` shipped its delta but archived with `--skip-specs`. |
| `quick-session` | Owns the quick-game replay loop (already absorbed). No encounter coverage; out of scope here. |

### Archived encounter/replay changes (5 reviewed)

| Archive folder | What it shipped | Where it should land |
|---|---|---|
| `archive/2026-01-18-add-encounter-system/` | Original encounter entity model, lifecycle, force config, map config, victory conditions, scenario templates, launch flow. | New `encounter-system` source-of-truth spec (this change). |
| `archive/2026-05-01-wire-encounter-to-campaign-round-trip/` | Already merged into `game-session-management`, `contract-types`, `scenario-generation`. **OUT OF SCOPE** for this change — confirmed via grep on main specs. |
| `archive/2026-05-07-add-replay-library/` | Already merged into `replay-library` (4-source baseline). |
| `archive/2026-05-09-repair-broken-encounter-drafts/` | Cascade + repair UI + seed-samples + cleanup script. Delta archived with `--skip-specs`. |
| `archive/2026-05-09-link-encounters-to-replays/` | 5th `ReplaySource.Encounter` + manifest variant + persist pipeline + browser hook. Delta archived with `--skip-specs`. |

## Domain layout for this change

```
openspec/changes/sync-encounter-and-replay-source-of-truth/
├── proposal.md                         # NEW
├── design.md                           # NEW
├── tasks.md                            # NEW
└── specs/
    ├── encounter-system/spec.md        # NEW source-of-truth (full ADDED suite)
    ├── replay-library/spec.md          # Delta — 5th variant + scan + page
    └── game-session-management/spec.md # Delta — repair + cascade + seed + persist
```

## Scope rules (re-stated for any subagent)

1. **NO TypeScript / TSX / test code** — markdown only.
2. **No `--skip-specs` mindset** — these deltas WILL merge to source-of-truth on archive.
3. **Snapshot what shipped, not what was discussed** — every requirement
   must correspond to behavior verifiable on main today.
4. **Cite real file paths** — verified existing files only:
   - `src/types/encounter/EncounterInterfaces.ts` (lines 15-70 for enums, 141-198 for IEncounter)
   - `src/types/gameplay/GameSessionInterfaces.ts:298-304` (ReplaySource), `:423-429` (IEncounterMeta), `:434-449` (IGameCreatedPayload)
   - `src/replay-library/types.ts` (5-member union)
   - `src/replay-library/backfill-scan.ts` (encounter partition handling)
   - `src/services/encounter/EncounterService.ts` (launchEncounter line 382 stamps meta)
   - `src/services/encounter/EncounterRepository.ts` (`IEncounterWithRawForceIds`, `clearForceReference`, `getEncounterWithRawIds`)
   - `src/services/encounter/encounterBrokenRefs.ts` (pure helper)
   - `src/services/forces/ForceRepository.cascade.ts` (callback registry — `setEncounterCascadeHook`, `invokeEncounterCascadeHook`)
   - `src/components/encounter/persistEncounterGame.ts` (Node-side pipeline)
   - `src/components/encounter/persistEncounterFromSession.ts` (browser-side helper)
   - `src/components/gameplay/encounters/EncounterCard.tsx` (broken pills)
   - `src/components/gameplay/pages/EncounterDetailPage.repairBanner.tsx` (banner)
   - `src/components/replay-library/ReplayLibraryPage.tsx` (6-button strip + Encounter row branch)
   - `src/pages/api/replay-library/encounter.ts` (POST route)
   - `src/pages/api/encounters/seed-samples.ts` (sample seeding)
   - `src/pages/gameplay/games/[id].tsx` (browser persist hook, `useRef`+`useEffect` double-fire guard)
   - `scripts/cleanup-broken-encounters.ts` (393 lines; CLI flags `--manifest-only`, `--cwd`)

## Confirmed inherited wisdom (per task brief)

- `ScenarioTemplateType` enum has 4 values: `Duel='duel'`, `Skirmish='skirmish'`, `Battle='battle'`, `Custom='custom'` (verified at `src/types/encounter/EncounterInterfaces.ts:61-69`).
- `SCENARIO_TEMPLATES` constant (line 261) has 4 entries matching the enum 1:1.
- `IEncounterMeta` lives on `IGameCreatedPayload` as an optional field (snapshot-at-launch).
- `playerForceSummary` shape: `"<forceName> (<bv> BV, <units> units)"` for explicit forces, `"<forceId> (missing force)"` for orphans.
- `recalculateStatus` short-circuits Launched/Completed; only Launched + both forces null → Draft (Completed never demotes).
- `setPlayerForce` DELETE endpoint already does null-clear (no server widening was needed).
- API route tests live at `src/__tests__/api/replay-library/` (NOT under `src/pages/api/...`).

## Validation target

```
npx openspec validate sync-encounter-and-replay-source-of-truth --strict
```

Iterate until clean. The change archives with full spec sync (NO `--skip-specs`).

## Out of scope (do not author)

- IndexedDB browser-side persistence (deferred; never shipped).
- Encounter-replay deletion / archival (deferred).
- Encounter-row → encounter-source-page cross-link (deferred per `link-encounters-to-replays` design.md open question).
- Replay metadata for salvage / outcome (would require campaign linkage).
- Localization of summary strings (deferred).
- Wire-encounter-to-campaign-round-trip — already in source-of-truth.
