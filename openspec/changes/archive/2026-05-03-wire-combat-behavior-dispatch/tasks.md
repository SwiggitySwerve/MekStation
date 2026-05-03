# Tasks: Wire Combat-Behavior Dispatch

> Council #1 ruling: ship as PR7 (`wire-combat-behavior-dispatch`). PR8 (token discriminated-union flip) is a follow-up, NOT part of this change.

## 1. Foundation: factory verification + altitude field

- [x] 1.1 Verify the four combat-state factories are exported as documented:
  - `createAerospaceCombatState` at `src/utils/gameplay/aerospace/state.ts:171`
  - `createInfantryCombatStateFromUnit` at `src/utils/gameplay/infantry/state.ts:130`
  - `createProtoMechCombatState` at `src/utils/gameplay/protomech/state.ts:139`
  - `createBattleArmorCombatState` at `src/utils/gameplay/battlearmor/state.ts:39`
  - Acceptance: all four import-resolve from `@/utils/gameplay/{aerospace,infantry,protomech,battlearmor}/state`.
  - QA: `npx tsc --noEmit` clean before any other change.

- [x] 1.2 Add `altitude: number` field to `IAerospaceCombatState` (`src/utils/gameplay/aerospace/state.ts:60`).
  - Position: after `destroyed: boolean;` on line 96, before the readonly thrust fields.
  - Acceptance: type compiles; no existing consumer breaks (the field is new, not narrowed).
  - QA: `npx tsc --noEmit` clean.

- [x] 1.3 Extend `createAerospaceCombatState` (`src/utils/gameplay/aerospace/state.ts:171`) to accept `altitude?: number` and default to `1`.
  - Acceptance: existing 3 call-sites still compile (param is optional); new field appears in returned state.
  - QA: `npm test -- aerospace/state` clean.

## 2. State envelope: discriminated-union slot

- [x] 2.1 Add the `combatState?` discriminated-union slot to `IUnitGameState` in `src/types/gameplay/GameSessionInterfaces.ts:1397` (insert before the closing `}` of the interface, after `hasRetreated?: boolean;`).
  - Use the verbatim TS shape from `design.md` § "Per-type slot shape".
  - Add the four required `import type` statements at the top of the file. If `IBattleArmorCombatState` is already re-exported from `@/types/gameplay`, import from there; otherwise import from `@/utils/gameplay/battlearmor/state` (verify before authoring).
  - Acceptance: type-only addition, all existing call-sites continue to compile (slot is optional).
  - QA: `npx tsc --noEmit` clean.

- [x] 2.2 Re-export the four per-type combat-state interfaces (`IAerospaceCombatState`, `IInfantryCombatState`, `IProtoMechCombatState`, `IBattleArmorCombatState`) from `src/types/gameplay/index.ts` if not already exported.
  - Acceptance: `import type { IAerospaceCombatState } from '@/types/gameplay'` works.
  - QA: `npx tsc --noEmit` clean.

## 3. Initialization: seeding + discriminated assertion

- [x] 3.1 In `src/utils/gameplay/gameState/initialization.ts:30` (`createInitialUnitState`), branch on `unit.unitType` to construct the per-type `combatState` envelope and assign it to the returned object.
  - Aerospace branch (`AEROSPACE_FIGHTER` / `CONVENTIONAL_FIGHTER` / `SMALL_CRAFT`): call `createAerospaceCombatState({ maxSI, armorByArc, heatSinks, fuelPoints, safeThrust, maxThrust, altitude: 1 })` using construction fields off the unit blob.
  - Infantry branch (`INFANTRY`): call `createInfantryCombatStateFromUnit(unit as IInfantry)`.
  - Protomech branch (`PROTOMECH`): call `createProtoMechCombatState({ unitId, chassisType, hasMainGun, armorByLocation, structureByLocation, altitude: chassis === GLIDER ? 0 : undefined })`.
  - Battle armor branch (`BATTLE_ARMOR`): call `createBattleArmorCombatState({ unitId, squadSize, armorPointsPerTrooper, stealthKind, hasMagneticClamp, hasVibroClaws, vibroClawCount })`.
  - Mech / vehicle branches: leave `combatState` undefined.
  - Acceptance: returned `IUnitGameState` has `combatState.kind` matching `unitType` for the four per-type kinds; mech/vehicle paths have `combatState === undefined`.
  - QA: `npm test -- initialization` clean.

- [x] 3.2 In the same file, add a discriminated assertion: when `unitType` is one of the four supported per-type kinds AND any required construction field is missing, throw `new Error("createInitialUnitState: <unitType> unit '<unitId>' missing required field(s): <list>")`.
  - Required fields per kind documented inline (cross-reference design.md § "Decision: Init-time discriminated assertion").
  - Acceptance: a missing field produces a thrown error whose message contains the unit id AND the missing field name.
  - QA: see test in §8.1.

## 4. Projection adapter: unify the two `unitStateToToken` copies

- [x] 4.1 Create `src/lib/gameplay/unitStateToToken.ts` containing the unified adapter using the verbatim sketch from design.md § "Projection adapter sketch".
  - Acceptance: file exports `unitStateToToken` and `IFogProjection`; narrows on `combatState.kind`; honours `isHidden` early-return.
  - QA: `npx tsc --noEmit` clean; the file imports cleanly with no circular-dependency warnings.

- [x] 4.2 Update `src/components/gameplay/GameplayLayout.tsx:181` to remove the local `unitStateToToken` definition and import from `@/lib/gameplay/unitStateToToken`.
  - At call-site (`GameplayLayout.tsx:429`), compute `isHidden` from the existing fog branch (the case where neither owned nor `canPlayerSeeUnit` is true) and pass it through as the new last argument.
  - Acceptance: no behaviour change for visible units; hidden enemies now have per-type fields stripped from their tokens.
  - QA: `npx tsc --noEmit` clean; `npm test -- GameplayLayout` clean.

- [x] 4.3 Update `src/components/gameplay/SpectatorViewPanels.tsx:19` to remove the local `unitStateToToken` definition and import from `@/lib/gameplay/unitStateToToken`.
  - Spectator view has no fog branch — pass `isHidden = false` (omit, default).
  - Acceptance: spectator-view tokens render identically to pre-change for any unit that has `combatState` seeded.
  - QA: `npm test -- SpectatorViewPanels` clean.

## 5. Remove the four token-component default fallbacks

- [x] 5.1 `src/components/gameplay/UnitToken/AerospaceToken.tsx:45` — replace `token.altitude ?? 1` with `token.altitude` and `token.velocity ?? 0` with `token.velocity ?? 0` (keep velocity fallback temporarily; TODO marker stays, comment retargeted to "movement slice 2").
  - Remove the `// TODO: remove default when add-aerospace-combat-behavior wires altitude field.` line; replace with a comment referencing the wired source: `// altitude is wired from IAerospaceCombatState.altitude via the unitStateToToken adapter.`
  - Acceptance: source no longer contains `altitude ?? 1`; component renders when given concrete altitude; `velocity ?? 0` survives with new TODO pointing at "movement slice 2".
  - QA: visual snapshot matches pre-change for `altitude=1` fixture.

- [x] 5.2 `src/components/gameplay/UnitToken/InfantryToken.tsx:83` — replace `token.infantryCount ?? 28` with `token.infantryCount`. Also drop `token.platoonCount ?? 1` to `token.platoonCount`.
  - Acceptance: source no longer contains `infantryCount ?? 28` or `platoonCount ?? 1`; component renders when given concrete trooper count.
  - QA: visual snapshot matches for `infantryCount=28, platoonCount=1` fixture.

- [x] 5.3 `src/components/gameplay/UnitToken/BattleArmorToken.tsx:75` — replace `Math.max(1, Math.min(6, token.trooperCount ?? 4))` with `Math.max(1, Math.min(6, token.trooperCount))`.
  - Acceptance: source no longer contains `trooperCount ?? 4`; component renders when given concrete trooper count in [1,6].
  - QA: visual snapshot matches for `trooperCount=4` fixture.

- [x] 5.4 `src/components/gameplay/UnitToken/ProtoMechToken.tsx:60-62` — replace `token.protoCount ?? 5`, `token.isGlider ?? false`, `token.hasMainGun ?? false` with the bare prop reads.
  - Acceptance: source no longer contains any `?? <default>` for those three fields; component renders when given concrete values.
  - QA: visual snapshot matches for `protoCount=5, isGlider=false, hasMainGun=false` fixture.

## 6. Fog-of-war redaction wiring

- [x] 6.1 In `src/lib/gameplay/unitStateToToken.ts` (created in 4.1), the `isHidden` early-return is the redaction implementation. No additional file change needed — but verify by code-reading that no per-type field can leak through `base` (only fog-projection fields `fogStatus` / `lastKnownPosition` / `sensorRange` may persist).
  - Acceptance: `base` object literal contains zero per-type fields; switch arms are the only writers of per-type fields.

- [x] 6.2 In `src/components/gameplay/GameplayLayout.tsx:417-427`, derive `isHidden` from the existing fog branch:
  - `isHidden = config.fogOfWar === true && unitInfo.side !== playerSide && !canPlayerSeeUnit(localFogPlayerId, unitId, visibilityState)`
  - Pass it as the new last argument to `unitStateToToken(...)`.
  - Acceptance: an enemy infantry unit with `combatState.kind === 'platoon'` and `survivingTroopers === 22`, hidden by fog, projects to a token with `infantryCount === undefined`.
  - QA: see test in §8.4.

## 7. (Reserved — was a duplicate of §6; intentionally left blank to keep section numbering stable across reviewer copies.)

## 8. Tests

- [x] 8.1 New: `src/utils/gameplay/gameState/__tests__/initialization.combatState.test.ts`
  - Cases: aerospace seeding produces `kind: 'aero'`; infantry seeding produces `kind: 'platoon'`; protomech (Biped + Glider + Quad) seeding produces `kind: 'proto'` with correct location maps; battle armor seeding produces `kind: 'squad'` with correct trooper count; mech and vehicle units leave `combatState` undefined.
  - Cases: missing-input assertion throws with unit id + field name in the error message for each per-type kind.
  - Acceptance: all cases green; uses real factories (no mocks).
  - QA: `npm test -- initialization.combatState` clean.

- [x] 8.2 New: `src/lib/gameplay/__tests__/unitStateToToken.test.ts`
  - Cases: aerospace projection (altitude wired; velocity undefined); infantry projection (`infantryCount` from `survivingTroopers`); battle armor projection (`trooperCount` from `getSurvivingTroopers`); protomech projection (`isGlider` reflects `chassisType === ProtoChassis.GLIDER`, `hasMainGun` mirrors); mech path returns no per-type fields.
  - Cases: `isHidden=true` strips all per-type fields from the returned token; `fogStatus` / `lastKnownPosition` / `sensorRange` survive.
  - Acceptance: all cases green; ≥ 1 case per discriminant kind plus the redaction case.
  - QA: `npm test -- unitStateToToken` clean.

- [x] 8.3 Update existing tests that build `IUnitGameState` for non-mech types so they include the new `combatState` slot OR explicitly use `unitType: 'BATTLEMECH'` for the stubs. Surface candidates (verify scope during execution):
  - `src/utils/gameplay/__tests__/gameState.test.ts`
  - `src/utils/gameplay/__tests__/damagePipeline.test.ts`
  - `src/utils/gameplay/__tests__/unitStateExtension.test.ts`
  - Any other test under `src/**/__tests__/` that constructs `IUnitGameState` for an aerospace / proto / infantry / BA unit (`grep -r "IUnitGameState" src/**/__tests__/`).
  - Acceptance: all updated tests pass; no test relies on the removed token-component defaults.
  - QA: `npm test` full suite clean.

- [x] 8.4 Update Storybook stories that exercise the four token components so each story passes a concrete value for the per-type fields (matching the prior defaults to keep visuals stable):
  - `src/components/gameplay/UnitToken/AerospaceToken.stories.tsx` (verify path) — set `altitude: 1`, leave `velocity` undefined.
  - `src/components/gameplay/UnitToken/InfantryToken.stories.tsx` — set `infantryCount: 28`, `platoonCount: 1`.
  - `src/components/gameplay/UnitToken/BattleArmorToken.stories.tsx` — set `trooperCount: 4`.
  - `src/components/gameplay/UnitToken/ProtoMechToken.stories.tsx` — set `protoCount: 5`, `isGlider: false`, `hasMainGun: false`.
  - Acceptance: storybook build succeeds; renders are visually identical to pre-change.
  - QA: `npm run storybook:build` clean.

## 9. Final Verification Wave

- [x] F1 `npx tsc --noEmit` clean across all touched files.
- [x] F2 `npm run lint` clean; `npx oxfmt --check` clean (CI is stricter than lint-staged — see MEMORY.md "Husky Pre-Commit Gotchas").
- [x] F3 `npm test` full suite green (target: 22477+ tests, all green).
- [x] F4 `npm run validate-bv` parity report shows 0 deltas vs pre-change baseline (BV calculation untouched; this is a regression sentinel).
- [x] F5 `npm run storybook:build` clean; manual spot-check of the four per-type token stories shows identical rendering.
- [x] F6 Grep verification: `grep -rn "?? 1" src/components/gameplay/UnitToken/AerospaceToken.tsx` returns no `altitude ?? 1` match; equivalent grep for the other three components' removed defaults returns no matches.
- [x] F7 `omo-spec-verifier` pass: every SHALL / MUST in the three delta specs (`game-state-management`, `tactical-map-interface`, `fog-of-war`) has either an implementation site or a test referencing it.
