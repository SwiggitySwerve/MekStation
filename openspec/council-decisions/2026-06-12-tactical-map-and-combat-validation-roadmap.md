# OMO Council — Tactical Map Trust + Combat Validation Suite Roadmap

> Date: 2026-06-12 · Variant: Heavy (7 Phase-2 seats + Phase-3 cross-attack) · Judge: VERIFIED (1-pass)
> Brief origin: user goals "fully trustworthy rules-backed tactical map" + "catalog-driven BattleMech combat validation suite", to be validated against merged work and decomposed into OpenSpec changes via /opsx:ff.

**Headline:** Both goals are ~80% shipped already — the council killed the "build a shared projection layer" framing (the layer exists, and the 2026-06-09 audit's six projection-drift bugs B-1..B-6 were already fixed in merged PRs #801/#802) and replaced it with four bounded units: targeted trust repairs + agreement-test expansion, umbrella closure inside the already-active validation-suite change, and two UI-only legibility changes.

**Brief:** Determine how much of Goal A (rules-backed trustworthy tactical map + 2.5D isometric) and Goal B (catalog-driven combat validation suite) is already satisfied by merged MekStation work, and decompose the remainder into ordered OpenSpec changes with finish-line validations.

**Option space considered:** one mega-change per goal · fine-grained breakout (6+ changes incl. a new `add-combat-projection-contract` foundation) · validation-first vs map-first sequencing · hybrid around a new shared "rules projection API" · descope isometric · continue-vs-restructure the active validation-suite change.

## What is ALREADY satisfied by merged work (validation result)

Verified this session (paths read at worktree HEAD = main `cf6d0b639`):

- **Shared rules-backed projection data exists and is UI-consumed.** `src/utils/gameplay/tacticalMapProjection.ts` (`buildTacticalMapHexProjectionLookup` → `ITacticalMapHexProjection`) merges `IMovementRangeHex` (from `deriveReachableHexes` → engine `getValidDestinations`, `src/utils/gameplay/movement/validation.ts:316`) and `ICombatRangeHex` (from `src/utils/gameplay/combatProjection.ts` using the same `calculateToHit`/`classifyLOS`/`determineArc` primitives as the engine commit path). Per-hex annotations already carried: `mpCost, terrainCost, elevationDelta, elevationCost, heatGenerated, blockedReason, movementInvalidReason, rangeBracket, firingArc, losState, lineOfSightBlocker, targetCoverModifier, toHitNumber, expectedDamage`.
- **The audit's projection-drift bugs are fixed.** 2026-06-09 audit findings B-1..B-6 (`docs/audits/2026-06-09-full-codebase-review.md:54-59`) were remediated in PR #801 (`db1733614` — projection to-hit hydrated through shared `buildWeaponAttack*ToHitState` builders; attack gates + minimum-range aligned; movement-heat call sites unified; permissive commit fallback removed) and PR #802 (MegaMek rule alignments incl. C-13 sim-runner jump elevation gate, C-15 isometric rotate-before-shear). Tracker: `docs/audits/2026-06-09-remediation-tracker.md` (W0–W6 done; e2e triage T1–T4 done).
- **A preview↔commit agreement test exists** — `src/engine/InteractiveSession.attackProjectionAgreement.scenario.test.ts` (added in #801, ~40 cases) — but it covers attack/to-hit/LOS/range/arc ONLY; zero movement cases (verified by reading the suite this session).
- **Isometric is substantially shipped:** discrete rotation (`MapIsometricRotationStep` 0–5), depth sorting (`isometricDepthKey`, `buildIsometricSceneItems` in `src/components/gameplay/HexMapDisplay/HexMapDisplay.isometric.ts`), occlusion ghosting (occlusion sweep in `HexMapDisplay.state.tsx`) — all with tests; rotate-before-shear ordering fixed in W2.
- **Goal B substrate is complete:** `src/simulation/runner/CombatValidationCatalog.ts` (~20 support-map sections, levels integrated/partial/out-of-scope + evidence + sourceRefs), machine-readable gap export `getCombatValidationUnresolvedRows` (`src/simulation/runner/CombatValidationGapInventory.ts:43`), scope traps + fallback guards (`CombatValidationScopeSupport.ts` — synthetic-medium-laser-fallback-ban L285; WEAPON_DATABASE subset contract pinned in `battlemechCombatCatalog.contract.test.ts:917`), knownLimitations bypass enforced (`src/simulation/core/knownLimitations.ts:166` `KNOWN_LIMITATION_BYPASS_INVARIANTS`), runner `scripts/validate-combat-suite.mjs` (34 Jest files + gap-inventory print + openspec strict validate).
- **Named hazards re-checked by adversary seat:** ejection lifecycle = COVERED (`src/simulation/runner/__tests__/ejectionLifecycle.integration.test.ts` + intent wire tests); physical catalog vs runtime = COVERED (`physicalWeaponCatalogBoundary.behavior.test.ts:82-105` proves 0 unsupported ids; claws/talons classified modifier-only); WEAPON_DATABASE / synthetic medium laser = real but catalog-pinned (task 3.1.9 checked); MML string damage = contained to display layer; catalog scale = 34 official equipment JSONs (no CI risk).

## What is NOT yet satisfied (the remaining gap)

1. **W1.3 explicit deferral (live):** turning-MP/facing divergence — `validateMovement` charges `calculateGroundPathTurningMpCost`, the reachability projection models no facing; disagreement is surfaced via a `validatorDisagreement` diagnostic only (`movement/commitValidation.ts`), not unified, not CI-asserted.
2. **Jump-reachability fidelity:** `src/utils/gameplay/movement/reachable.ts` jump candidate gate is flat `hexDistance ≤ jumpMP` (lines ~100-103/149-153) ahead of per-hex legality — preview/commit jump agreement is untested.
3. **Second source of truth in UI:** `CombatPlanningPanel.tsx:209-217` computes `rangeToTarget` via raw `hexDistance`, bypassing the projection's `combat.distance`/`rangeBracket`.
4. **Agreement suite has no movement channel:** no reachability/jump/turning preview↔commit cases; vehicle/VTOL movement-mode agreement unverified.
5. **Top-down legibility:** no persistent per-hex elevation badge in flat view (`formatElevationLabel` exists, wired only to tooltips/isometric labels); non-color-only overlay encodings incomplete.
6. **Isometric remainder:** stacked elevation extrusion (per-hex skirts) not built; `openspec/specs/camera-controls/spec.md` has zero isometric-rotation requirements (shipped behavior unspecced); rotation animation polish optional.
7. **Goal B finish line:** active change `openspec/changes/add-battlemech-combat-validation-suite/` held from archive with 6 open umbrella tasks (2.32, 3.1–3.4, 4.3) that are open-ended "expand coverage" families with no convergence criterion.

## Decision — four bounded units of work

| # | Unit | Form | Deltas | Finish-line validation |
|---|------|------|--------|------------------------|
| 1 | `fix-tactical-projection-agreement-gaps` | NEW change | movement-system, tactical-map-interface | Agreement suite extended with parametrized movement/jump/turning cases across move modes + unit types (vehicle/VTOL covered or explicitly gap-tracked); `validatorDisagreement` promoted from diagnostic to CI-failing assertion; jump preview legality = engine legality; CombatPlanningPanel consumes projection; suite green. |
| 2 | Close + archive the ACTIVE change | EDIT active change (no new change; avoids combat-resolution delta conflict) | (existing combat-resolution delta) | Umbrellas 2.32/3.1–3.4/4.3 converted to bounded acceptance criteria enumerated against `getCombatValidationUnresolvedRows`; `validate-combat-suite.mjs` green; gap inventory contains only explicit out-of-scope/gap rows; `openspec validate --strict` green; change archived. |
| 3 | `add-topdown-tactical-legibility` | NEW change | tactical-map-interface | Persistent per-hex elevation badges in top-down; non-color-only state encodings; per-hex predicted to-hit/cover surfaced in overlay UI; visual smoke + spec scenarios pass. |
| 4 | `add-isometric-elevation-extrusion` | NEW change | camera-controls, tactical-map-interface | Stacked elevation extrusion skirts depth-sort correctly; shipped rotation/depth-sort/occlusion retro-specced into camera-controls; rotation cycle + reduced-motion tests pass. |

**Sequencing:** Units 1 and 2 are independent — run in parallel lanes. Units 3 and 4 are UI-only, independent of each other, can follow or interleave; nothing blocks on them. No unit authors a combat-resolution delta except the already-active change (Momus's serialization constraint honored).

**Why:** All three proposers withdrew the new-layer/façade architecture in Phase 3 after captain verification showed #801/#802 already delivered the shared-state unification; the structurally-sound half of Metis's kill (no new layer; targeted repairs; close umbrellas in place) became the winning shape. MegaMek prior art (Librarian) confirms the engine-computes/UI-renders pattern MekStation already follows and the golden-corpus catalog-contract pattern (`BulkUnitFileTest`) the suite already mirrors.

**Survival Score:** Killed and replaced (architecture) / Modified (roadmap) — the Phase-2 frontrunner (new engine-side projection façade + 6-change roadmap) died under cross-attack; Prometheus collapsed 6 changes to ~2; the surviving plan is adversary-shaped.

**Trade-offs accepted:** no new façade means UI keeps consuming multiple engine entry points (projection lookup + pure helpers) — agreement tests, not a single boundary, are the divergence guard; isometric rotation animation deferred; rubble-cover rules decision and T2-F1/F2/F3 residue tracked separately (not folded into these units).

**Second-order consequences (6-month):** the agreement suite becomes the standing contract for any future overlay work — new overlay channels must add agreement cases or fail review; archiving the active change restores a clean "no in-flight changes" baseline so future combat work authors fresh deltas without conflict.

**Open risks:** jump-gate severity contested (flat pre-gate may only over-filter rather than show false-reachable hexes — Unit 1 scope could shrink on investigation); umbrella closure may surface new unsupported rows that resist bounding (mitigation: rows may close as explicit out-of-scope, not only as integrated); isometric extrusion may interact with W5 occlusion-sweep performance fixes.

**Dissent on record:** Metis's kill cited audit bugs B-1..B-6 as live when W1 had already fixed them — the factual half failed, the structural half won. Prometheus preferred the W1.3 facing fix as a delta inside the active change; captain ruled it into Unit 1 (movement-system delta — the active change carries only a combat-resolution delta, and the conflict constraint applies only there).

---
*Appendix* — **Decision crux:** whether projection/engine divergence was structural (missing boundary) or residual (named sites) — #801/#802 evidence settled it as residual. **Context factors:** active change archivability; OpenSpec one-delta-per-capability serialization. **Token cost:** Heavy run, ~700K subagent tokens (7 Phase-2 + 3 Phase-3 + judge).
