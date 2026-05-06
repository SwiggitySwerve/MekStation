# Notepad — Learnings

Cumulative conventions and patterns discovered during implementation.

## [2026-05-06] Task: P0 — SeededD6Roller adapter + roller threading

**Convention discovered**: The roller-threading pattern is `optional 4th parameter`. `checkCriticalHitTrigger(structureDamage, roller?)` and `resolveDamage(state, location, damage, roller?)` both accept an optional `roller?: D6Roller` defaulting to `defaultD6Roller`. P3/P4 tasks that thread the roller deeper into `resolveCriticalHits`, `weaponAttack.ts`, `runHeatPhase`, and ammo-explosion handlers MUST follow the same pattern: optional, defaulted, last positional.

**Why it matters**: Existing production callsites pass positional `(state, location, damage)` — making `roller` optional/last keeps every callsite green without a sweep. Tests opt in with an explicit `SeededD6Roller(seed).asD6Roller()` argument.

**Reference**: `src/simulation/core/SeededD6Roller.ts:46`, `src/utils/gameplay/damage/critical.ts:21`, `src/utils/gameplay/damage/resolve.ts:40`.

## [2026-05-06] Task: P0 — Determinism audit allowlist

**Convention discovered**: The CI grep guard for `Math.random()` in `src/utils/gameplay/` and `src/simulation/` needs an allowlist for legitimate non-dice entropy. Four paths are pre-allowlisted in `.github/workflows/pr-checks.yml` (`determinism-audit` job): `diceTypes.ts` (the seam itself), `aerospace/criticalHits.ts` (dead path, comment notes "unused; resolver overrides"), `terrainGenerator.ts` (procgen seed fallback), `QuickResolveService.ts` (crypto.getRandomValues fallback when no Web Crypto API).

**Why it matters**: Future PRs that add `Math.random()` to those scopes must either (a) thread a `D6Roller`, or (b) extend the allowlist with rationale. Comment lines mentioning `Math.random()` (block-comment `*` or line-comment `//`) are stripped before the audit so doc-comments don't false-positive.

**Reference**: `.github/workflows/pr-checks.yml` `determinism-audit` job.

## [2026-05-06] Task: P0.5 — Closed-set hygiene (UnitDestroyed.cause + pilot/match terminal states)

**Convention discovered — the closed-set audit pattern (reusable for any future enum reconciliation)**:

When you reconcile a single closed-set enum across multiple type files, run this checklist verbatim. P0.5 surfaced 5 separate edits across 4 files that the original task list under-named (the spec mentioned 3 type files; the actual fix touched 4 because the same union appeared as a function-parameter type in `src/utils/gameplay/gameEvents/status.ts:121`).

1. Define the canonical N-value literal union in the spec delta. Pick one casing (snake_case won here per design D8 — live code was already overwhelmingly snake_case across 15+ files).
2. Identify EVERY type file declaring the field. Grep `cause:` / `destructionCause:` across `src/`. Don't trust the spec delta to enumerate all sites.
3. Update the union in EACH file to the IDENTICAL set, IDENTICAL order, IDENTICAL members. Cross-file symmetry is the contract — any reader of any one file must see the same set.
4. Grep for stale literal forms (kebab-case here) anywhere in `src/`. Use multiple variants — `'foo-bar'`, `"foo-bar"`, backtick-`foo-bar` — to catch tests that compare strings instead of importing the type.
5. Disambiguate "sibling" taxonomies that LOOK like the target enum but are actually independent. P0.5 found three sibling kebab taxonomies that should NOT be touched:
   - `KeyMomentType` at `src/types/simulation-viewer/IKeyMoment.ts:37` — replay-UI key-moment classifier (`'first-blood'`, `'ammo-explosion'`, etc.). Independent.
   - `damageFeedback.IFormattedHeadOrPilotEntry.emphasis` at `src/components/gameplay/damageFeedback.ts:150` — UI emphasis bucket (`'head-hit' | 'pilot-killed' | 'pilot-unconscious'`). Independent UI styling enum.
   - `IKeyMoment.type` at `src/components/simulation-viewer/pages/encounter-history/types.ts:79` — encounter-history UI. Independent.
   The kebab string `'ammo-explosion'` appears in all three — but only inside their own closed sets, never as a `UnitDestroyed.cause` value. Field-name (`type:` / `effect:` / `emphasis:` vs `cause:` / `destructionCause:`) is the disambiguator.
6. Run typecheck after the symmetric edit. Widening a union is backward-compatible; narrowing is not. P0.5 only widened.

**Why it matters**: Without rule (2) the work would have shipped asymmetric (4-value union in `gameEvents/status.ts` + 7-value union elsewhere — bypass the symmetry contract). Without rule (5) the PR would have ballooned with unrelated UI-taxonomy edits and broken `KeyMomentDetector` / encounter-history. The cross-taxonomy-disambiguation step is where most kebab-purge PRs lose discipline.

**Reference**: `src/types/gameplay/GameSessionInterfaces.ts:762`, `src/types/gameplay/CombatInterfaces.ts:339`, `src/utils/gameplay/damage/types.ts:20`, `src/utils/gameplay/damage/types.ts:45`, `src/utils/gameplay/gameEvents/status.ts:115`.

## [2026-05-06] Task: P0.5 — oxfmt PostToolUse hook quirk

**Convention discovered**: The PostToolUse Edit hook runs `oxfmt` with the binary's default config (DOUBLE quotes, different line-wrap) — but the project's `.oxfmtrc.json` declares `singleQuote: true`. After every Edit/Write, the hook reformats freshly-edited files with the wrong quote style, which `format:check` then flags as drift.

**Workflow**: After every Edit/Write, run `npx oxfmt --write <file>` to reformat with the project config. The git diff will collapse from ~150 lines of quote churn down to the actual surgical change. No project-config change needed — strictly a workflow concern.

**Reference**: `.oxfmtrc.json` (`singleQuote: true`), `package.json` `lint-staged` (uses the same `oxfmt --write` invocation that picks up the project config).

## [2026-05-06] Task: P0.5 — Forbidden-files coordination with parallel worktree

**Convention discovered**: When the boss agent lists files as off-limits because a parallel worktree is editing them, **importing already-exported symbols from those files is safe** — only EDITS are forbidden. P0.5 imports `isUnitOperable` from `SimulationRunnerState.ts` (forbidden for edits) into `SimulationRunner.ts` (NOT forbidden) to compute survivor counts for the new `determineMatchTerminalState` call. This kept the new classifier consistent with the existing `determineWinner` predicate without duplicating the logic.

**Why it matters**: A naive reading of "do NOT touch" would have led to writing a parallel `isUnitOperableLocal` predicate that drifts from the canonical one. The right rule is: read-only imports are coordination-safe, edits aren't.

**Reference**: `src/simulation/runner/SimulationRunner.ts:36` imports `isUnitOperable` (existing export); `src/simulation/runner/matchTerminalState.ts` is the new file the parallel P1 won't touch.

## [2026-05-06] Task: P0.5 — Conservation invariant tests synthesize their fixtures

**Convention discovered**: The `after-combat-report` spec asserts pilot-side conservation (`count('kia') === count(UnitDestroyed events with cause 'pilot_death' or 'head_destroyed')`). At P0.5 the runner doesn't emit `UnitDestroyed { cause: 'head_destroyed' }` yet (that wires in P3). So the conservation test in `src/simulation/runner/__tests__/matchTerminalState.test.ts` asserts the invariant on **synthetic** event-payload + summary fixtures — small enough (2-3 pilots per side) that the per-side AND global rollups are obvious by reading the test.

**Why it matters**: Future P3 (event wiring) and P5 (MetricsCollector hydration) tasks can extend the same test to consume real event logs from a seeded match. The structural invariant doesn't change; only the source of the events does. Keep the synthetic fixtures around as the "schema" assertion even after real-event tests land.

**Reference**: `src/simulation/runner/__tests__/matchTerminalState.test.ts` — see the `Pilot match summary — conservation invariants` describe block.

## [2026-05-06] Task: P1 — Catalog-to-runner hydration plumbing pattern

**Convention discovered**: Catalog hydration flows into the `SimulationRunner` via an optional **6th constructor parameter** (`hydration?: UnitHydrationMap`), keyed by runner unit id (`player-1`, `opponent-2`, …). The constructor pre-derives a `weaponsByUnit: ReadonlyMap<string, readonly IWeapon[]>` side table once; `runMovementPhase` and `runAttackPhase` consume it via an optional `weaponsByUnit` field on their options object and pass `weaponsByUnit?.get(unitId)` to `toAIUnitState` per call. The runner stays sync because hydration is pre-resolved (CLI does `await NodeCanonicalUnitService.getById(...)` BEFORE `new SimulationRunner(...)`).

**Why it matters**: P2 / P3 / P4 / P5 will all need to consume the same per-unit weapon snapshot for event emission, crit wiring, ammo state seeding, and metrics. Reusing the `weaponsByUnit` side table (rather than a 4th positional argument per phase) keeps the phase signatures backward-compatible — every existing phase callsite keeps working without the field. The pattern is: optional, last named field on the options object, defaulted to `undefined`.

**Decision lever**: `toAIUnitState(unit, hydratedWeapons?)` checks `hydratedWeapons && hydratedWeapons.length > 0` — empty arrays fall through to the synthetic single-medium-laser fallback. Keeps the test fixtures that build hand-rolled `IUnitGameState`s with no weapons green without explicit opt-in.

**Reference**: `src/simulation/runner/UnitHydration.ts`, `src/simulation/runner/SimulationRunner.ts:113-122` (constructor wiring), `src/simulation/runner/phases/{movement,weaponAttack}.ts` (phase consumers).

## [2026-05-06] Task: P1 — Sync weapon catalog access in Node tests

**Convention discovered**: `EquipmentLoaderService.loadOfficialEquipment()` is async + fetch-based; the Node-side `EquipmentFileReader.readJsonFile` falls back to `fs.promises.readFile` but is still async. For sync construction (Jest tests, CLI swarm runner), reuse the existing **synchronous JSON imports** at `src/utils/construction/equipmentBVCatalogData.ts` (`WEAPON_CATALOG_FILES`) and feed them into `buildWeaponLookupFromCatalogFiles(files): WeaponLookup` to get a `(id) => ICatalogWeaponStats | null` lookup with no IO.

**Why it matters**: The simulation runner's constructor + phase loop is fully sync. Wiring an async equipment loader would force `SimulationRunner.run` to become async, sweeping every callsite. The sync-import pattern was already in place for the BV calculator (P0 era); reusing it for weapon hydration keeps the runner sync end-to-end.

**Missile damage parsing**: Catalog stores LRM/SRM/MRM as `damage: "N/missile"` strings. `resolveCatalogDamage(damage, weaponId)` parses the per-missile count and multiplies by the missile count from the weapon id's trailing number (`lrm-20` → 20, `srm-6` → 6, `mrm-30` → 30). Returns 0 for unparseable shapes (defensive fallback for cluster-table weapons that arrive in follow-on changes).

**Reference**: `src/simulation/runner/UnitHydration.ts:resolveCatalogDamage`, `src/simulation/runner/UnitHydration.ts:buildWeaponLookupFromCatalogFiles`, `src/utils/construction/equipmentBVCatalogData.ts`.

## [2026-05-06] Task: P1 — Atlas armor canonical reference (304 across 11 locations)

**Convention discovered**: When `IFullUnit.armor.allocation` carries the per-location armor map, the catalog uses SCREAMING_SNAKE keys (`HEAD`, `CENTER_TORSO`, `LEFT_TORSO`, …). Torsos store `{ front, rear }`; everything else stores a scalar. The runner's `IUnitGameState.armor` uses lower_snake (`head`, `center_torso`, `left_torso`, `left_torso_rear`, …) — `hydrateArmorFromFullUnit` does the case+key translation AND splits torso `{ front, rear }` into two distinct keys (`center_torso` + `center_torso_rear`).

The Atlas AS7-D carries 11 distinct armor slots when split this way: HD + (CT+CT_rear) + (LT+LT_rear) + (RT+RT_rear) + LA + RA + LL + RL = 11. Sum = 304. The Locust LCT-1V hits the same 11-slot count (each torso has rear armor 2 even on a light) for 64 total.

**Why it matters**: The "11 locations" figure in the spec scenario (`spec.md` "Atlas AS7-D hydrates with its real loadout") refers to this rear-split count, NOT the 8-physical-location count. P2 (LocationDestroyed events) and P3 (rear hits routing through the existing `_rear` armor keys) both rely on the rear-split being preserved end-to-end.

**Quad mech note**: The catalog uses `FRONT_LEFT_LEG` / `REAR_LEFT_LEG` for quads. `CATALOG_TO_RUNNER_LOC` maps these to the standard `left_arm` / `right_arm` / `left_leg` / `right_leg` runner slots so the existing damage pipeline doesn't need a quad-specific branch in P1. This is OK for the Atlas/Locust anchor (both biped); follow-on `add-combat-fidelity-catalog-matrix` may want to revisit.

**Reference**: `src/simulation/runner/UnitHydration.ts:hydrateArmorFromFullUnit`, `src/simulation/runner/UnitHydration.ts:CATALOG_TO_RUNNER_LOC`.

## [2026-05-06] Task: P1 — Internal structure table reuse (zero new code)

**Convention discovered**: `STANDARD_STRUCTURE_TABLE` at `src/utils/gameplay/damage/constants.ts` already covers tonnages 20–100 in 5-ton brackets with HD / CT / sideTorso / arm / leg point counts. `hydrateStructureFromFullUnit` rounds the unit's tonnage to the nearest 5 and reads the row. No new BattleTech rules are encoded here — Phase 1's hydration is purely a wiring fix to surface what the existing utility already knew.

**Why it matters**: Endo Steel / Composite / Reinforced / Endo-Composite all share the SAME per-location point counts; only the construction-layer weight multiplier differs. So this single table covers every structure-type variant in the catalog without P1 needing to know about structure-type discrimination.

**Reference**: `src/utils/gameplay/damage/constants.ts`, `src/simulation/runner/UnitHydration.ts:hydrateStructureFromFullUnit`.

