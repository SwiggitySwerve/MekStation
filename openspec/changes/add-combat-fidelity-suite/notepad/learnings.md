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

## [2026-05-06] Task: P2 — Event-emission seam in `weaponAttack.ts` (reusable for P3 / P4)

**Convention discovered — the per-mount fire loop is the seam for all post-attack events**:

P2 reshaped `weaponAttack.ts` to drive a per-mount fire loop off `aiUnit.weapons` (the AI's selected weapon-id list from `IAttackEvent.payload.weapons`). For each weapon mount, the loop emits in causal order: `AttackDeclared` → roll → `AttackResolved` → (on hit) `DamageApplied` × N → `LocationDestroyed` (when destroyed) → `TransferDamage` (when residual flows). P3 (crit events) and P4 (heat / ammo events) plug into the same loop:

- **P3** wires `CriticalHit` / `CriticalHitResolved` / `ComponentDestroyed` AFTER each `LocationDestroyed` event but BEFORE the next `DamageApplied` in the chain. The crit-trigger return capture happens inside `resolveDamage` (so the `criticalHits[]` array on `IDamageResult` populates), and the runner emits the events from the populated array in the same per-`locationDamage[i]` step where `LocationDestroyed` already fires.
- **P4** wires `AmmoConsumed` (one per ammo-bin draw) immediately after `AttackResolved` on the AC/20 / LRM-20 / SRM-6 mounts, and `AmmoExplosion` cascades through the same `LocationDestroyed` step when a crit lands on a loaded bin.

**Why it matters**: P3/P4 should NOT introduce a parallel emission path. The existing per-`locationDamage[i]` loop already linearizes the entire damage chain in causal order; piggy-backing crit + ammo events on that loop preserves the global event-ordering invariant tested in `atlasMirrorEventChain.integration.test.ts` (causal-ordering test). A second emission path would require a parallel ordering invariant — duplicate test surface for no benefit.

**Reference**: `src/simulation/runner/phases/weaponAttack.ts:285-450` (the `for (let i = 0; i < locationDamages.length; i++)` block).

## [2026-05-06] Task: P2 — `IAttackDeclaredPayload` extended additively (range + firingArc)

**Convention discovered**: When a spec delta requires new fields on an existing event payload, ALWAYS add them as `readonly fooField?: ...` (optional) rather than required. The existing `IAttackDeclaredPayload` had `weapons: readonly string[]` (singular weapon-id with array of one is the runner-emission shape) but no `range` / `firingArc` fields. P2 added both as optional so the legacy `InteractiveSession` multi-weapon emission path (which doesn't carry per-shot range / arc) keeps compiling.

The same additive pattern applies to `ILocationDestroyedPayload.viaTransfer?: boolean` — the existing `cascadedTo?: string` field is for arm-cascade (different concept), and adding `viaTransfer` as optional preserves compatibility with pre-P2 emitters at `gameSessionAttackResolution.ts:278` (the session-layer twin of the runner phase).

**Why it matters**: Required fields would have forced a sweep across every emit-site (15+ files emit AttackDeclared / LocationDestroyed across InteractiveSession, gameSessionAttackResolution, the new runner phase, and 5+ test fixture files). Optional + populated-by-default means the new fields propagate through code that needs them and stay `undefined` everywhere else. Tests assert SHAPE compatibility regardless: `range` is `'short' | 'medium' | 'long' | 'extreme' | undefined`, all four enum-mapped values appear in passing scenarios.

**Reference**: `src/types/gameplay/GameSessionInterfaces.ts:493-525` (IAttackDeclaredPayload.range / firingArc), `src/types/gameplay/GameSessionInterfaces.ts:983-988` (ILocationDestroyedPayload.viaTransfer).

## [2026-05-06] Task: P2 — Misses MUST emit AttackResolved (count invariant)

**Convention discovered**: The pre-P2 `weaponAttack.ts` did `if (!hit) continue;` — silently dropping the miss without any event. P2 inverts that: every `AttackDeclared` MUST be paired with an `AttackResolved`, regardless of hit/miss. The contract is `AttackDeclared.length === AttackResolved.length` over any time window, asserted in the unit test (`AttackDeclared count equals AttackResolved count (per-mount invariant)`) and in the integration test (`AttackDeclared count equals AttackResolved count (every shot resolves)`).

On miss, the resolved-payload `location` and `damage` are intentionally `undefined` — the discriminated-union contract distinguishes hit-shape (location + damage populated) from miss-shape (both undefined). Tests assert both branches.

**Why it matters**: Downstream consumers (replay UI, P5 MetricsCollector, swarm aggregation, anomaly detectors) treat the count delta as a corruption signal. A silent miss-drop breaks that signal and would make hit-rate metrics garbage.

**Reference**: `src/simulation/runner/phases/weaponAttack.ts:267-294` (miss branch emission), unit test `runAttackPhase events ... AttackDeclared count equals AttackResolved count`.

## [2026-05-06] Task: P2 — `viaTransfer` semantics: chain-position, not arm-cascade

**Convention discovered**: Two different "is this a cascade" concepts coexist in the damage pipeline:

1. **Transfer-chain cascade** (`viaTransfer: true`): residual damage flowed FROM a previously-destroyed location IN this same shot's transfer chain. Set when `i > 0` in the `result.locationDamages` array iteration.
2. **Arm-cascade** (`cascadedTo: 'left_arm' | 'right_arm'`): a side-torso destruction structurally takes the corresponding arm with it. Set off the post-state `destroyedLocations` diff. Independent of `viaTransfer`.

The runner emits BOTH fields on the same `LocationDestroyed` event: `cascadedTo` carries the arm-id when applicable; `viaTransfer` indicates whether THIS event is the i==0 entry (direct hit) or i>0 (downstream). The cascade-arm gets its OWN `LocationDestroyed` event with `viaTransfer: false` (the arm wasn't reached by transfer; it was structurally taken with the parent torso).

**Why it matters**: A naive reading would conflate the two — "the arm was destroyed cascading from the torso, so viaTransfer:true". That's wrong. The transfer chain and the structural cascade are separate phenomena and downstream consumers (UI debris animation, P5 metrics) need both signals to render and aggregate correctly. The unit-test `emits viaTransfer:true on cascade destruction from transfer chain` explicitly asserts the i>0 case; the `cascadedTo` field assertion lives in `gameSessionAttackResolution.ts`-side tests inherited from the prior `integrate-damage-pipeline` change.

**Reference**: `src/simulation/runner/phases/weaponAttack.ts:362-405` (the LocationDestroyed emission block), `src/types/gameplay/GameSessionInterfaces.ts:970-988` (payload doc-comment).

## [2026-05-06] Task: P2 — TypeScript narrow→wide modifier projection

**Convention discovered**: `IToHitModifierDetail.source: ToHitModifierSource` (a narrow string-literal union) is structurally assignable to `IToHitModifier.source: string` (the wider event-payload type). TypeScript accepts the projection at the position level, but `modifiersToPayload()` deliberately constructs a fresh object with only the three contracted fields (`name`, `value`, `source`). This drops the `description?: string` field carried on the detail type without changing the modifier list shape on the wire.

**Why it matters**: Future evolution of `IToHitModifierDetail` (e.g., adding a `category` enum) won't leak into the event payload's wire format. The projection function is the contract surface — change it deliberately when expanding the event payload.

**Reference**: `src/simulation/runner/phases/weaponAttack.ts:66-88` (`modifiersToPayload`).

## [2026-05-06] Task: P3 — `criticalContext` bundle on `IUnitDamageState`

**Convention discovered**: The `resolveCriticalHits` API takes seven positional arguments (`unitId, location, manifest, componentDamage, diceRoller, forceCrits?, armorType?`). Threading those through the damage-layer call chain naively would have required four new positional parameters on `resolveDamage()` plus every transitive caller. The cleanest extension was a single optional `criticalContext?: ICriticalContext` field on `IUnitDamageState` bundling the four resolver inputs (`unitId / manifest / componentDamage / armorType?`) with the roller already threaded via the existing P0 `roller?: D6Roller` parameter.

When `criticalContext` is present AND a 2d6 trigger fires AND the roller is provided, `resolveDamage` dispatches `resolveCriticalHits` per location, accumulates results in running aggregates (manifest + componentDamage compound across cluster-weapon multi-location chains), and surfaces the post-resolution data on `IResolveDamageResult`'s new fields (`componentDamage / criticalEvents / criticalTriggers / manifest`). When the context is absent, behavior is identical to pre-P3 — `criticalHits[]` stays empty and `criticalEvents` is undefined. Existing damage tests (264 in damage.test.ts + criticalHitResolution.test.ts) keep passing without edits.

**Why it matters**: P4 (heat / ammo) and P5 (metrics) will need similar bundle-based extensions. The pattern is: when an existing utility needs N additional inputs that are conceptually one "resolution context", wrap them in an optional bundle field on the input state rather than adding N positional parameters. The legacy callers don't construct the bundle and behavior is unchanged; the new caller (the runner) builds it once per shot and feeds it through.

**Reference**: `src/utils/gameplay/damage/types.ts:34-39` (`ICriticalContext`), `src/utils/gameplay/damage/resolve.ts:96-165` (per-location dispatch loop), `src/simulation/runner/phases/weaponAttack.ts:614-640` (runner-side context build).

## [2026-05-06] Task: P3 — Manifest persistence via per-target side table

**Convention discovered**: The `CriticalSlotManifest` records which crit slots are destroyed; when a slot is destroyed in shot 1, slot-selection in shot 2 against the same target MUST skip it. Persisting the manifest on `IUnitGameState` would require a new optional field + plumbing through `createInitialUnitState` / `createHydratedUnitState` / state reducers / fixture builders. The lower-blast-radius path is a per-target side table on the runner, mirroring P1's `weaponsByUnit` pattern: an optional `manifestsByUnit?: Map<string, CriticalSlotManifest>` parameter on `runAttackPhase`.

A `getOrSeedManifest(targetId)` helper inside the phase reads the running map, lazy-builds a default biped manifest on first crit, and writes the post-resolution manifest from `damageResult.manifest` after each shot. The manifest survives across mounts within a single phase call AND across phase calls when the caller persists the same `Map` instance. Tests that don't care about persistence omit the parameter — the helper builds a fresh default per shot, identical to the pre-P3 stateless path.

**Why it matters**: This is the same per-unit side-table pattern used for `weaponsByUnit`. The side table is a runner-internal concern; `IGameEvent` + `IUnitGameState` stay untouched. P4's ammo-state side table (`ammoState`) already lives ON `IUnitGameState` because it's consumed by event reducers; the manifest doesn't need that — only the runner reads + writes it during the per-mount fire loop.

**Reference**: `src/simulation/runner/phases/weaponAttack.ts:387-404` (`getOrSeedManifest`), `src/simulation/runner/phases/weaponAttack.ts:642-647` (post-shot persist).

## [2026-05-06] Task: P3 — Cause translation at the event-emission boundary

**Convention discovered**: The crit-resolution layer encodes engine 3-hit destruction as `unit_destroyed { cause: 'damage' }` (per `engineEffects.applyEngineHit`). That's an internal-resolver convention from before the P0.5 closed-set hygiene pass — the resolver predates the unified 7-value snake_case enum. Renaming inside the resolver would touch 5+ files of resolver / effects / tests. Per the spec scenario "Engine-3-hit destruction triggers UnitDestroyed", the runner-emitted `UnitDestroyed` event MUST carry `cause: 'engine_destroyed'`.

The fix: translate at the runner's emission boundary. The resolver keeps its internal convention; `weaponAttack.ts:emitCritEvents` maps `'damage' → 'engine_destroyed'` when the source is a crit-induced destruction. Same translation happens in `resolveDamage` for the `IResolveDamageResult.destructionCause` field so the runner's existing `UnitDestroyed` emit (which sources `damageResult.result.destructionCause` as a fallback) sees the translated cause too. The translation is one-way + lossless — every other cause value (`pilot_death`, `ammo_explosion`, etc.) passes through unchanged.

**Why it matters**: Boundary translation isolates resolver-internal naming from spec-mandated event-payload naming. P4 may face the same pattern with ammo-explosion cascades (the resolver emits `cause: 'ammo_explosion'` already, but heat-induced explosions in `runHeatPhase` may need a different translation). Keep translations at the emission-boundary helper, not deep in the resolver.

**Reference**: `src/utils/gameplay/damage/resolve.ts:174-196` (resolver-side translation for `IResolveDamageResult`), `src/simulation/runner/phases/weaponAttack.ts:271-299` (runner-side translation in `emitCritEvents`).

## [2026-05-06] Task: P3 — Permissive `ICriticalHitPayload` for two producers

**Convention discovered**: `KeyMomentDetector` consumes `CriticalHit` events for component-specific moment detection (`payload.component === 'engine'` for `critical-engine` moments). The pre-P3 detector defined a local `ICriticalHitPayload` with REQUIRED `component: string`. The P3 spec scenario specifies `CriticalHit { unitId, location, count: 1 }` — count, not component.

The pragmatic resolution: define the canonical `ICriticalHitPayload` in `GameSessionInterfaces.ts` as the WIDE union with BOTH `component?` AND `count?` optional. The runner emits both fields populated (one event per resolved slot, count=1, component=slot.componentType). The detector's local-NARROW type with required `component` stays as the consumer-side contract — TypeScript's structural-typing accepts the wider runner-side shape at the narrower detector position because all required fields are present.

**Why it matters**: Migrating the detector + 30+ test fixtures away from per-component `CriticalHit` events would have ballooned PR scope. Keeping two compatible shapes (canonical wide producer / local narrow consumer) lets the spec contract land without sweeping detector behavior. Both `count` and `component` carry meaningful information; the canonical type is permissive precisely so producers and consumers can each pick their preferred subset.

**Reference**: `src/types/gameplay/GameSessionInterfaces.ts:1054-1078` (canonical `ICriticalHitPayload` with optional component + count), `src/simulation/detectors/KeyMomentDetector/types.ts:43-48` (local-narrow consumer-side type, unchanged).

## [2026-05-06] Task: P3 — Runner-side seed sweep for crit emission tests

**Convention discovered — the runner's RNG is shared, not factored**: `runAttackPhase` uses a single `SeededRandom` for to-hit + hit-location + crit-trigger + slot-selection rolls. To deterministically test "a crit fires", you'd have to predict the entire RNG sequence after to-hit + hit-location consumed N rolls. That's brittle.

Practical pattern that emerged: write the runner-level tests as a SEED SWEEP across known-good crit seeds, with structural assertions (causal ordering, payload shape, count parity) rather than slot-specific assertions. The probe used to find seeds: build a stripped-armor scenario, run 20 candidate seeds, log per-seed event-type counts, pick the seeds that produced `critical_hit` events. For this PR, seeds 22, 77, and 200 were known-good for an AC/20 vs stripped-armor target.

For deterministic SLOT-LEVEL assertions (which component destroyed, post-manifest state), drop down to `resolveDamage` directly with a scripted `D6Roller` — the closure-based roller bypasses the runner's shared `SeededRandom` and lets you script the entire 2d6 + slot-selection sequence. The two-layer split (runner seed sweep for event-shape + scripted-roller for slot mechanics) is the canonical pattern for combat-fidelity tests.

**Why it matters**: Future P4/P5/P6 tests will face the same tension. Don't fight the shared RNG — use seed sweeps where the assertion is structural, drop to the underlying utility with a custom roller where the assertion is mechanical.

**Reference**: `src/simulation/runner/__tests__/criticalHitEvents.test.ts:407-433` (seed-sweep pattern), `src/simulation/runner/__tests__/criticalHitEvents.test.ts:71-78` (scriptedRoller helper), `src/simulation/__tests__/scenario-crit-chains.integration.test.ts` (scripted-roller scenarios at the resolveDamage layer).

## [2026-05-06] Task: P3 — Crits accelerate destruction (test budget widening)

**Convention discovered**: Three pre-P3 tests had implicit assumptions that crits never fired:
1. `atlasMirrorMultiWeapon.integration.test.ts` asserted `result.turns >= 5` and `winner === null` — Atlas mirror would never finish in 5 turns. With P3 crits enabled, engine 3-hit destruction can end the match by turn 3.
2. `simulation-combat-integration.test.ts` asserted `cause IN ['damage', 'pilot_death']` — P3's `'engine_destroyed'` enum value broke the assertion.
3. `swarm-pilot-skills-batch.test.ts` 95% dominance threshold — skilled pilots (gunnery 2) now land more crits AND more hits, pushing observed win rate from 0.94 to 0.97.

All three are LEGITIMATE test updates, not regressions: P3 added new emergent combat dynamics. The fixes preserved test INTENT while widening assertions:
- (1) crash-guard intent preserved as `turns >= 1` + winner ∈ valid set.
- (2) cause whitelist expanded to the full P0.5 7-value enum.
- (3) threshold widened 0.95 → 0.99 with rationale comment citing the crit-induced lift.

**Why it matters**: Pre-existing tests written under "crits don't fire" assumptions surface as failures the moment the rule turns on. Look for tests with literal `cause IN [...]` lists or hard-coded turn counts BEFORE the rule lands; widen them in-place rather than disabling. P4 (heat/ammo) and P5 (metrics) will hit the same kind of fallout — heat shutdown can now end matches faster, ammo cookoff can destroy units mid-volley, etc. Per project MEMORY: budget widening is a 3x rule of thumb with explanatory comments, never silent.

**Reference**: `src/simulation/__tests__/atlasMirrorMultiWeapon.integration.test.ts:182-203`, `src/simulation/__tests__/simulation-combat-integration.test.ts:494-507`, `src/simulation/__tests__/swarm-pilot-skills-batch.test.ts:281-301`.

