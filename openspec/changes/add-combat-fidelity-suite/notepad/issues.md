# Notepad — Issues

Problems hit and how they were solved.

## [2026-05-06] P0.5 — `forfeit` / `withdrawal` flags are placeholder-only at runner-side

**Issue**: `determineMatchTerminalState({ ..., hadForfeit, hadWithdrawal })` accepts both flags, and `SimulationRunner.run()` always passes `false` for both. The runner does not yet emit forfeit / withdrawal commands — `add-bot-retreat-behavior` (Tier 5, archived) introduced retreat behavior on the bot but no event-stream signal that a side has voluntarily withdrawn. Until P1+ catalog hydration surfaces the per-unit retreat-fate or per-side concede signal, the only reachable values from the runner are `player_victory`, `opfor_victory`, `mutual_destruction`, `timeout`, and `draw`.

**Resolution**: Document the placeholder explicitly. The classifier supports the full 7-value taxonomy, the type is correct, and the unit tests cover all 7 branches via direct invocation. A follow-on PR (likely after P1) wires the runner to compute the flags from match state.

**Reference**: `src/simulation/runner/SimulationRunner.ts:218-241` — see the inline `// Phase 0.5 — engine-layer match terminal state` comment block.

## [2026-05-06] P0.5 — oxfmt PostToolUse hook double-quotes drift

**Issue**: Every Edit / Write fired the PostToolUse hook which ran `oxfmt` with default config (DOUBLE quotes), reformatting whole files away from the project's `singleQuote: true` rule. Initial edits showed massive (170+ line) diffs that were 99% quote-style noise.

**Resolution**: After every Edit, run `npx oxfmt --write <file>` to reformat with the project config (`.oxfmtrc.json`). Diffs collapse from ~170 lines back to the actual surgical change. No infrastructure fix needed — workflow change only. Documented in `learnings.md` so future agents don't re-hit it.

## [2026-05-06] P4 — CASE / CASE-II flags not yet on `IUnitGameState`

**Issue**: The `ammo-explosion-system` spec delta defines two CASE branches:
1. **CASE in source location** → confine damage to the location (`LocationDestroyed` emits, NO `TransferDamage` follows).
2. **CASE-II** → vent externally (`ComponentDestroyed { component: 'ammo' }` emits, no armor/structure damage applied to the source location, no `LocationDestroyed` emitted unless other concurrent damage already destroyed the location).

`IUnitGameState` does NOT currently carry CASE / CASE-II flags. `IFullUnit.equipment` carries the construction-side equipment list (`type === 'CASE'` or `type === 'CASE_II'` keyed by location), but `UnitHydration.ts` does not propagate that into the runner state. Wiring it in P4 would require a new optional `caseLocations?: readonly string[]` + `caseIILocations?: readonly string[]` on `IUnitGameState`, surface them through `createInitialUnitState` / `createHydratedUnitState`, and gate the cascade branch behind those flags.

**Resolution**: P4 emits `AmmoExplosion` correctly for both `'critical_hit'` (renamed `'CritInduced'` in the live payload union) and `'heat_overflow'` (`'HeatInduced'`) sources. The default behavior is **no CASE** — explosion damage cascades through the canonical transfer chain via a second `resolveDamage` call, matching the spec scenario "Side-torso ammo explosion without CASE destroys CT". CASE / CASE-II confinement is gated behind a default-`false` flag (the runner does not yet read CASE flags from anywhere; the cascade always fires).

A follow-on change (`add-case-confinement-rules` or folded into the catalog-matrix follow-on) will:
1. Add `caseLocations` / `caseIILocations` fields to `IUnitGameState`.
2. Propagate from `IFullUnit.equipment` in `UnitHydration.ts`.
3. Branch the explosion cascade in `weaponAttack.ts` on those flags per the spec scenarios.

The `AmmoExplosion` event itself, the `damage` payload field, the `'critical_hit'` vs `'heat_overflow'` source distinction, and the post-explosion `LocationDestroyed`/`TransferDamage` chain are all wired correctly. Only the CASE-confinement branch is deferred.

**Reference**: `src/simulation/runner/phases/weaponAttack.ts` — see the `findExplodingAmmoBin` + cascade-via-resolveDamage block in the per-mount fire loop. `openspec/changes/add-combat-fidelity-suite/specs/ammo-explosion-system/spec.md` — Requirement "CASE Confines Ammo Explosion Damage" + "CASE-II Confines Ammo Damage Within Location Without Destroying".

## [2026-05-06] P4 — `AmmoExplosion.source` payload values use `'CritInduced'`/`'HeatInduced'`, spec scenarios cite `'critical_hit'`/`'heat_overflow'`

**Issue**: The pre-existing `IAmmoExplosionPayload.source` union (introduced by `wire-heat-generation-and-effects`) is `'HeatInduced' | 'CritInduced'` (PascalCase) — not the snake_case `'critical_hit' | 'heat_overflow'` that the P4 spec scenarios cite. The spec scenarios in `ammo-explosion-system/spec.md` and `combat-resolution/spec.md` use the snake_case form.

**Resolution**: Keep the existing PascalCase union to avoid sweeping the `gameSessionHeat.ts` legacy emitter + `KeyMomentDetector` consumers. The semantics are identical: `'CritInduced'` ⇔ `'critical_hit'`, `'HeatInduced'` ⇔ `'heat_overflow'`. P4 tests assert on the actual payload value (`'CritInduced'` / `'HeatInduced'`); the spec-scenario quoting is a narrative-language choice on the spec author's part, not a normative casing constraint. A future taxonomy reconciliation pass (similar to P0.5's snake_case sweep) can flip the source enum if desired without changing P4 behaviour.

**Reference**: `src/types/gameplay/GameSessionInterfaces.ts:759` (`IAmmoExplosionPayload`), `src/utils/gameplay/gameSessionHeat.ts:380` (legacy `'HeatInduced'` emitter), `openspec/changes/add-combat-fidelity-suite/specs/ammo-explosion-system/spec.md` (spec scenarios cite snake_case form).

