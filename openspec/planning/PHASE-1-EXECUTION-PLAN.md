# Phase 1 Execution Plan — Interactive Combat MVP

**Lane 2 integration branch (future):** `feat/phase-1-interactive-combat`
**Roadmap reference:** [docs/plans/2026-04-17-combat-and-multiplayer-roadmap.md §Phase 1](../../docs/plans/2026-04-17-combat-and-multiplayer-roadmap.md)
**Upstream handoff:** [.sisyphus/drafts/phase-7-handoff-to-phase-1-combat.md](../../.sisyphus/drafts/phase-7-handoff-to-phase-1-combat.md)
**Phase 0 (per-type BV + combat) status:** ✅ COMPLETE — PR #337 merged at `074b6ca0`

---

## Context

Phase 7 (per-type BV + combat behavior, Lane 1) shipped via PR #337: per-type BV dispatcher in `battleValueCalculations.ts`, per-type combat modules under `src/utils/gameplay/{aerospace,vehicle,battlearmor,infantry,protomech}/`, 743 suites / 21,476 tests green, 99.8% BV parity. **All engine primitives Phase 1 needs exist; what's missing is the glue + the UI.**

Phase 1's goal per the roadmap: hot-seat / vs-AI 4-mech skirmish, full BattleTech phase loop, open hex map, decisive outcome + auto-saved match log. The roadmap suggests 10 atomic PRs over 4–6 weeks solo.

**Audit reality (2026-04-19):** 28 Phase-1-relevant OpenSpec changes already exist, with mixed task states (100% / 86% / 72% / 54% / 22% / 14% / 0%). The handoff list enumerated ~23; five additional changes were found missing from it:

- `add-skirmish-setup-ui` — required by core-ui to launch a session at all
- `add-movement-phase-ui` — PR #2 of the roadmap's 10 atomic PRs
- `add-bot-retreat-behavior` — companion to `improve-bot-basic-combat-competence`
- `add-mech-silhouette-sprite-set` — asset precursor for facing-arrow tokens
- `add-terrain-rendering` — hex-terrain paint precursor for LOS/overlays

The single live bug from the combat-rule-accuracy audit was the duplicate heat table in `src/types/validation/HeatManagement.ts`; that's fixed and archived via PR #338. Seven other "originally suspected bugs" were already-correct code, so the archived change primarily ships regression tests + the heat-table consolidation.

---

## Full change inventory (28 changes + 1 archived)

Columns: **%** = completed `[x]` / total tasks. **State**: DONE (≥95%), PARTIAL (30–94%), FRESH (0–29%).

### Engine foundation (Wave 1 — unblocks every combat surface)

| # | Change                          | %    | State   | Notes                                                                   |
| - | ------------------------------- | ---- | ------- | ----------------------------------------------------------------------- |
| 1 | `fix-combat-rule-accuracy`      | 100  | ✅ ARCHIVED (PR #338) | 5 deltas merged; 6 regression suites; bug #3 heat-table consolidation  |
| 2 | `wire-real-weapon-data`         | 85   | PARTIAL | Prereq: `fix-combat-rule-accuracy`. Open: 2.3 canonicalize IS/Clan, 3.3 warn-on-missing, smoke-tests |
| 3 | `wire-firing-arc-resolution`    | 66   | PARTIAL | Open: boundary determinism, bot integration, UI hooks                   |
| 4 | `wire-ammo-consumption`         | 68   | PARTIAL | **Hard prereq**: `wire-real-weapon-data` must merge first (AttackResolved shape) |

### Engine damage + heat + PSR (Wave 2 — unblocks physical attack phase)

| # | Change                               | %    | State   | Notes                                                  |
| - | ------------------------------------ | ---- | ------- | ------------------------------------------------------ |
| 5 | `integrate-damage-pipeline`          | 86   | PARTIAL | Also absorbs Lane 1 follow-on #1 (per-type GameEngine wiring) |
| 6 | `wire-heat-generation-and-effects`   | 72   | PARTIAL | Uses canonical thresholds landed by #1                  |
| 7 | `wire-piloting-skill-rolls`          | 78   | PARTIAL | Triggers: damage PSR, gyro/hip crit, skid, terrain      |

### Physical attack + bot (Wave 3 — closes the combat loop)

| # | Change                               | %    | State   | Notes                                                  |
| - | ------------------------------------ | ---- | ------- | ------------------------------------------------------ |
| 8 | `implement-physical-attack-phase`    | 49   | PARTIAL | Prereqs: #5, #7, #3                                    |
| 9 | `improve-bot-basic-combat-competence`| 21   | FRESH   | Lane 1 follow-on #2 (BotPlayer per-type hookup) lands here |
| 10| `add-bot-retreat-behavior`           | 40   | PARTIAL | Parallel to #9                                         |

### UI foundation (Wave 4 — first playable surface)

| #  | Change                             | %  | State   | Notes                                                             |
| -- | ---------------------------------- | -- | ------- | ----------------------------------------------------------------- |
| 11 | `add-skirmish-setup-ui`            | 22 | FRESH   | **Precursor**: missing from handoff, required for launch          |
| 12 | `add-interactive-combat-core-ui`   | 54 | PARTIAL | Selection/action-panel/phase-banner/event-log frame               |
| 13 | `add-movement-phase-ui`            | 14 | FRESH   | Reachable-hex overlay, path preview, facing picker                |
| 14 | `add-attack-phase-ui`              |  7 | FRESH   | To-hit modal, confirm, resolve, log                               |
| 15 | `add-physical-attack-phase-ui`     | 36 | PARTIAL | Punch/kick/charge/DFA surfaces                                    |
| 16 | `add-damage-feedback-ui`           | 87 | PARTIAL | Armor pip decrement, crit badge, pilot wound animation            |

### UI polish + overlays (Wave 5 — parallel after Wave 4)

| #  | Change                                 | %  | State | Notes                                              |
| -- | -------------------------------------- | -- | ----- | -------------------------------------------------- |
| 17 | `add-heat-and-shutdown-visual-indicators` | 0 | FRESH | Reactive heat bar animation, shutdown flash       |
| 18 | `add-damage-feedback-effects`          | 0  | FRESH | Spark/smoke particle FX on damage                  |
| 19 | `add-attack-visual-effects`            | 0  | FRESH | Laser/PPC/missile projectile FX                    |
| 20 | `add-los-and-firing-arc-overlays`      | 0  | FRESH | LOS cone + arc wedge overlays                      |
| 21 | `add-movement-interpolation-animations`| 0  | FRESH | Tween along committed path                         |
| 22 | `add-minimap-and-camera-controls`      | 0  | FRESH | Minimap + camera pan/zoom                          |
| 23 | `add-what-if-to-hit-preview`           | 97 | DONE-ish | Almost ready — one box left                     |
| 24 | `add-mech-silhouette-sprite-set`       | 0  | FRESH | Asset precursor for #17 token art                  |
| 25 | `add-terrain-rendering`                | 0  | FRESH | Hex-terrain paint precursor for #20                |

### Battle resolution (Wave 6)

| #  | Change                               | %  | State   | Notes                                                  |
| -- | ------------------------------------ | -- | ------- | ------------------------------------------------------ |
| 26 | `add-victory-and-post-battle-summary`| 43 | PARTIAL | Decisive outcome + summary screen                     |
| 27 | `add-post-battle-review-ui`          | 62 | PARTIAL | Event-log scrubber + replay                           |

### Deferred (Phase 2+/3+ territory — tracked, NOT in this plan)

| Change                              | Notes                                                       |
| ----------------------------------- | ----------------------------------------------------------- |
| `add-fog-of-war-event-filtering`    | 0% — multiplayer infra, Phase 4                             |
| `add-combat-outcome-model`          | Campaign integration, Phase 3                               |
| `add-post-battle-processor`         | Campaign integration, Phase 3                               |
| `add-repair-queue-integration`      | Campaign integration, Phase 3                               |
| `add-salvage-rules-engine`          | Campaign integration, Phase 3                               |
| `add-game-session-invite-and-lobby-1v1` | Multiplayer, Phase 4                                    |
| `add-game-session-persistence-for-reconnect` | Multiplayer, Phase 4                               |
| `add-p2p-game-session-sync`         | Multiplayer, Phase 4                                        |
| `add-pre-battle-force-comparison`   | Optional UX polish, Phase 1+                                |
| `add-quick-resolve-monte-carlo`     | Analysis mode, Phase 2+                                     |
| `add-quick-sim-result-display`      | Analysis mode, Phase 2+                                     |
| `wire-encounter-to-campaign-round-trip` | Campaign integration, Phase 3                           |

**Not counted here (Phase 6 Lane 1 scope — already shipped):** the 20 Phase 6 changes listed in PHASE-6-EXECUTION-PLAN.md.

---

## Dependency graph

```
┌────────────────────────────────────────────────────────────────────────┐
│ Wave 1: Engine foundation (blocks every combat surface)                │
│   ✅ fix-combat-rule-accuracy (PR #338)                                │
│    └─► wire-real-weapon-data ─┬─► wire-ammo-consumption                │
│                               └─► wire-firing-arc-resolution           │
└────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Wave 2: Damage / heat / PSR (depends on Wave 1)                        │
│   integrate-damage-pipeline (absorbs per-type GameEngine wiring)       │
│   wire-heat-generation-and-effects                                     │
│   wire-piloting-skill-rolls                                            │
└────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Wave 3: Combat completion (depends on Wave 2)                          │
│   implement-physical-attack-phase                                      │
│   improve-bot-basic-combat-competence (absorbs BotPlayer per-type hook)│
│   add-bot-retreat-behavior                                             │
└────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Wave 4: UI foundation (depends on Wave 3 for meaningful behavior;      │
│         core-ui CAN parallelize with Wave 2/3 because UI is decoupled  │
│         from engine internals via session events)                      │
│   add-skirmish-setup-ui  (precursor — unblocks session launch)         │
│   add-interactive-combat-core-ui                                       │
│   add-movement-phase-ui    ─┬─► add-attack-phase-ui                    │
│                              └─► add-physical-attack-phase-ui          │
│   add-damage-feedback-ui                                               │
└────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Wave 5: UI polish (parallel after Wave 4; asset precursors first)      │
│   add-mech-silhouette-sprite-set ──► add-heat-and-shutdown-indicators  │
│   add-terrain-rendering ──► add-los-and-firing-arc-overlays            │
│   add-damage-feedback-effects, add-attack-visual-effects               │
│   add-movement-interpolation-animations, add-minimap-and-camera        │
│   add-what-if-to-hit-preview (already 97% — quick close-out)           │
└────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Wave 6: Battle resolution (final close-out)                            │
│   add-victory-and-post-battle-summary                                  │
│   add-post-battle-review-ui                                            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Wave → branch strategy

Phase 6 used a single long-lived integration branch; Phase 1 is bigger and more parallel. **Recommendation: per-wave integration branches, merged back to `main` each wave.** No umbrella branch — each change lands via PR → main, and later waves build on merged-main.

| Wave | Sub-branch prefix | Changes ready to dispatch | Parallelism                                                                                       |
| ---- | ----------------- | ------------------------ | ------------------------------------------------------------------------------------------------- |
| 1    | `feat/phase-1-w1-*` | wire-real-weapon-data → wire-firing-arc-resolution, wire-ammo-consumption | 2 parallel after wire-real-weapon-data PRs; ammo is sequential gate                             |
| 2    | `feat/phase-1-w2-*` | integrate-damage-pipeline, wire-heat-generation-and-effects, wire-piloting-skill-rolls | 3 parallel (orthogonal touch sets — damage pipeline, heat sim, PSR queue)                      |
| 3    | `feat/phase-1-w3-*` | implement-physical-attack-phase, improve-bot-basic-combat-competence, add-bot-retreat-behavior | Physical-attack sequential (needs heat+PSR); 2 bot changes parallel                            |
| 4    | `feat/phase-1-w4-*` | skirmish-setup, core-ui, movement-phase, attack-phase, physical-attack-ui, damage-feedback-ui | skirmish-setup → core-ui sequential; then 3 phase UIs parallel; damage-feedback last            |
| 5    | `feat/phase-1-w5-*` | All UI polish + asset precursors | High parallelism — most are orthogonal rendering layers                                          |
| 6    | `feat/phase-1-w6-*` | victory-summary, post-battle-review-ui | 2 parallel                                                                                       |

**Per-change pipeline** (mirrors Phase 7):
1. `omo-momus` — structural + executability review
2. `omo-atlas` — executes `tasks.md` in isolated git worktree (`.claude/worktrees/agent-<id>`)
3. `omo-spec-verifier` — per-requirement SHALL/MUST coverage check before merge
4. Branch → `gh pr create` → merge to `main` (NEVER direct push to `main`)
5. `openspec archive <change-name>` on the next branch to roll deltas into canonical specs

**Risk: worktree atlas dispatch timeout.** The first Wave-1 parallel dispatch (2026-04-19) hit a 300s cap on both agents and produced partial uncommitted work. Continuation dispatch is the mitigation; for subsequent waves, scope each atlas to no more than 6–8 open boxes so it finishes inside one budget window. Larger changes should be split.

---

## Done definition

- [ ] All 27 non-deferred changes' `tasks.md` fully `[x]` or explicitly deferred with reason in the PR body
- [ ] All 27 non-deferred changes archived into `openspec/changes/archive/`
- [ ] Roadmap §Phase 1 section checked off
- [ ] E2E smoke: `/gameplay/encounters/[id]/pre-battle` launches a 4-mech skirmish, movement + attack + heat + PSR + physical phases play, one side wins, post-battle summary renders, match log auto-saves
- [ ] `npm run build` + `npm run lint` + `npm test` clean (21,476+ tests still green)
- [ ] `npx openspec validate --all --strict` clean
- [ ] Lane 1 follow-ons absorbed: per-type GameEngine wiring (Wave 2 #5), BotPlayer per-type hookup (Wave 3 #9). MUL BV cache seeding for non-mech units remains a separate change — not Phase 1.

---

## In-flight as of 2026-04-19

- **PR #338** (`chore/archive-fix-combat-rule-accuracy`) — archive merge, awaiting review
- **Worktree `agent-a66fa0a5`** (`feat/wire-real-weapon-data`) — continuation atlas running
- **Worktree `agent-ad84c63f`** (`feat/interactive-combat-core-ui`) — continuation atlas running

Future sessions: check this section first. If worktrees are pruned but change %'s haven't moved, dispatch was lost and needs redispatch.
