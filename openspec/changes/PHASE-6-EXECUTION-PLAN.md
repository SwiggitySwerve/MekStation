# Phase 6 Execution Plan — Non-Mech Unit Types (Combined Arms)

**Branch (future):** `feat/phase-6-combined-arms`
**Roadmap reference:** [docs/plans/2026-04-17-combat-and-multiplayer-roadmap.md](../../docs/plans/2026-04-17-combat-and-multiplayer-roadmap.md) §Phase 6 (lines 224-246)
**Phase 1-5 status:** ✅ COMPLETE (PRs #301-#324)

---

## Context

Phase 6 brings vehicles, aerospace, BattleArmor, infantry, and ProtoMechs to full parity with the existing mech pipeline. The roadmap specifies: "Each is effectively a mini-phase mirroring the mech work: construction specs → validation → BV → combat behavior → display."

**The pre-authored 15 proposals cover**: construction (5) + BV (5) + combat behavior (5).

**This plan adds 5 gap-filler proposals** to close the UI / rendering / data-import surface the roadmap explicitly called for with "→ display" and that construction proposals explicitly deferred with "Record-sheet PDF layout for vehicles — follow-up work":

| Gap-filler (authored 2026-04-18)     | Covers                                               |
| ------------------------------------ | ---------------------------------------------------- |
| `add-per-type-customizer-tabs`       | Canonical tab set per type + dispatcher              |
| `add-per-type-armor-diagrams`        | Per-type armor diagram components + shared primitive |
| `add-multi-type-record-sheet-export` | Per-type SVG record sheet rendering + extractors     |
| `add-per-type-hex-tokens`            | Per-type combat-map tokens (shape/facing/stacking)   |
| `add-blk-import-per-type`            | BLK → per-type JSON catalog generation               |

**Total Phase 6 scope: 20 OpenSpec changes. Rough size: 25 PRs, 4–6 months sequential (can be parallelized per unit type after foundation lands).**

---

## Full change inventory (20 changes)

### Foundation (horizontal, apply to all types)

1. `add-per-type-customizer-tabs` — tab architecture
2. `add-per-type-armor-diagrams` — armor diagram per type
3. `add-multi-type-record-sheet-export` — PDF/SVG export per type
4. `add-per-type-hex-tokens` — combat map tokens per type
5. `add-blk-import-per-type` — catalog generation per type

### Vertical per unit type (5 types × 3 changes = 15)

6. `add-vehicle-construction` + `add-vehicle-battle-value` + `add-vehicle-combat-behavior`
7. `add-aerospace-construction` + `add-aerospace-battle-value` + `add-aerospace-combat-behavior`
8. `add-battlearmor-construction` + `add-battlearmor-battle-value` + `add-battlearmor-combat-behavior`
9. `add-infantry-construction` + `add-infantry-battle-value` + `add-infantry-combat-behavior`
10. `add-protomech-construction` + `add-protomech-battle-value` + `add-protomech-combat-behavior`

---

## Dependency graph

```
┌──────────────────────────────────────────────────────────────────┐
│ Wave 0: Foundation (blocks per-type work)                        │
│   - add-per-type-customizer-tabs        (locks tab set)          │
│   - add-per-type-armor-diagrams         (blocks armor tabs)      │
│   - add-per-type-hex-tokens             (blocks combat UI)       │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
    ┌───────────────────────────┬───────────────────────────┐
    │                           │                           │
Wave 1-5 (sequential OR parallel per type):
    │  Each type = 3-change ladder:                         │
    │    construction → battle-value → combat-behavior      │
    │                                                       │
    │  Then consume foundation:                             │
    │    record-sheet-export (per-type renderer)            │
    │    blk-import (per-type converter)                    │
    │                                                       │
    ▼                                                       │
  vehicle ──► aerospace ──► battlearmor ──► infantry ──► protomech
  (priority order per roadmap: most common secondary unit first)
```

**Recommended sequencing**: Foundation first, then vehicles ship end-to-end (construction → BV → combat → record sheet → BLK import → hex token). Then aerospace the same way. Then BA, infantry, protos. Each type's full stack is one PR or a small PR train.

**Parallelism**: After Foundation, different types can proceed on different agents in parallel IF scoped carefully (the only shared files are the foundation files, which are locked by Wave 0).

---

## Sub-branch execution plan (recommended)

| Wave | Sub-branch                  | Changes merged                                                                                                                                                               | Notes                                |
| ---- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 0    | `feat/phase-6--foundation`  | `add-per-type-customizer-tabs`, `add-per-type-armor-diagrams`, `add-per-type-hex-tokens`                                                                                     | Blocks all per-type work             |
| 1    | `feat/phase-6--vehicles`    | `add-vehicle-construction`, `add-vehicle-battle-value`, `add-vehicle-combat-behavior`, vehicle record sheet + vehicle BLK import (per-type deltas of the multi-type changes) | Most common secondary unit           |
| 2    | `feat/phase-6--aerospace`   | `add-aerospace-construction`, `add-aerospace-battle-value`, `add-aerospace-combat-behavior`, aerospace record sheet + aerospace BLK import                                   | Air-to-ground campaigns              |
| 3    | `feat/phase-6--battlearmor` | `add-battlearmor-*` stack + BA record sheet + BA BLK import                                                                                                                  | Common hostile infantry in contracts |
| 4    | `feat/phase-6--infantry`    | `add-infantry-*` stack + infantry record sheet + infantry BLK import                                                                                                         | Occupy-ground role                   |
| 5    | `feat/phase-6--protomech`   | `add-protomech-*` stack + proto record sheet + proto BLK import                                                                                                              | Niche, Clan-only                     |

Each wave merges to `feat/phase-6-combined-arms` before the next spawns. Waves 1–5 can partially overlap after Foundation provided agents scope file edits tightly.

---

## Done definition

- [ ] All 20 OpenSpec changes' tasks.md fully checked or explicitly deferred
- [ ] One squashed PR `feat/phase-6-combined-arms` → `main` merged (OR 5 PRs per type)
- [ ] All 20 changes archived
- [ ] Roadmap §Phase 6 section marked complete
- [ ] E2E smoke: build a vehicle, aerospace, BA point, infantry platoon, and ProtoMech point in the customizer; print record sheets; place them all on the combat map and resolve a mixed-forces battle
- [ ] BLK import populates `public/data/units/{vehicles,aerospace,battlearmor,infantry,protomechs}/` with ≥100 canonical units per type
- [ ] No regression in existing jest tests
