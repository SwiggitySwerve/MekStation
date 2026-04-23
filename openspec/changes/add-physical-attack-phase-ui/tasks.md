# Tasks: Add Physical Attack Phase UI

## 0. Prerequisites

- [ ] 0.1 `implement-physical-attack-phase` merged (engine must emit `PhysicalAttackDeclared` / `PhysicalAttackResolved` and accept `IPhysicalAttackDeclaration`)
- [ ] 0.2 `add-interactive-combat-core-ui` merged (action panel + phase HUD)
- [ ] 0.3 `add-attack-phase-ui` merged (target-lock and forecast-modal patterns are reused)

## 1. Phase Detection

- [x] 1.1 Store selector exposes `isPhysicalAttackPhase` derived from `GameSession.currentPhase`
- [ ] 1.2 Action panel switches the "Attacks" section from weapons list (grayed) to physical attacks sub-panel when this selector is true
- [ ] 1.3 Weapons list is visible but fully disabled during physical phase (avoids confusing hard-hides)

## 2. Physical Attack Plan State

- [x] 2.1 Extend `useGameplayStore` with `physicalAttackPlan: {attackerId, targetId, attackType, limb?} | null`
- [x] 2.2 Target-lock interaction (click adjacent enemy while friendly selected) sets `targetId` — same pattern as weapon attack, but restricted to adjacent hexes
- [x] 2.3 `physicalAttackPlan` clears on phase transition away from Physical Attack

## 3. Eligible Declarations Projection

- [x] 3.1 Expose `getEligiblePhysicalAttacks(attacker, target): IPhysicalAttackOption[]` from `physicalAttacks/restrictions.ts` as a UI projection
- [x] 3.2 Each option includes `{attackType, limb?, toHit, damage, selfRisk, restrictionsFailed: string[]}`
- [x] 3.3 Ineligible options include non-empty `restrictionsFailed` — the UI renders them disabled with a tooltip per failure reason
- [x] 3.4 No adjacent enemy → projection returns empty list; UI renders "No eligible physical attacks this turn"

## 4. Physical Attacks Sub-Panel

- [x] 4.1 Sub-panel header reads `"Physical Attacks"` and lists up to six option rows (punch × up to 2 arms, kick × up to 2 legs, charge, DFA, push, club)
- [x] 4.2 Each row shows attack-type icon + limb + target designation + to-hit (TN) + damage
- [x] 4.3 Row hover highlights the target token + shows the attack arc on the map (see task 7)
- [x] 4.4 Disabled rows render with a red strikethrough + tooltip (`"Right arm fired LRM-10 — cannot punch this turn"`)
- [x] 4.5 Each eligible row has a "Declare" button

## 5. Declaration Flow

- [x] 5.1 Click "Declare" opens the forecast modal (see task 6)
- [x] 5.2 Modal "Confirm" appends `PhysicalAttackDeclared { attackerId, targetId, attackType, limb? }` to the session
- [x] 5.3 After commit, the attacker token shows a "Declared" overlay; the sub-panel collapses to a summary ("Punch declared vs. Enemy-3")
- [x] 5.4 "Skip" button on the sub-panel appends a no-op declaration so the phase can proceed

## 6. Forecast Modal (Physical Variant)

- [x] 6.1 Reuse `ToHitForecastModal` from `add-attack-phase-ui`, parameterized to render a `PhysicalAttackForecast` variant
- [x] 6.2 Modifier breakdown surfaces: piloting base, attack-type base (kick −2, push −1, punch 0, DFA 0, charge +attacker-movement), actuator damage mods, TMM, prone-target mods
- [x] 6.3 For charge + DFA, modal includes a "Self-risk" row showing damage-to-attacker and auto-fall conditions
- [x] 6.4 Confirm / Back buttons match the weapon-attack forecast contract

## 7. Map Overlays

- [x] 7.1 New `PhysicalAttackIntentArrow` component — renders a directional arrow from attacker to target
- [x] 7.2 Charge intent: solid arrow, color-coded per attacker side, arrowhead pointing at target
- [x] 7.3 DFA intent: dashed arc arrow (lift + crash) to visually distinguish from charge
- [x] 7.4 Push intent: ghost-hex marker at the target's displaced destination
- [x] 7.5 Overlays render only while the row is hovered OR an attack of that type is declared

## 8. Resolution Handling

- [ ] 8.1 On `PhysicalAttackResolved`, the event log receives one entry per attack (hit/miss + location + damage + any self-damage)
- [ ] 8.2 `add-damage-feedback-ui` already animates the damage pips — no new animation work here; this change only confirms the event hookup is wired
- [ ] 8.3 If resolution causes a fall, the existing `UnitFell` event path handles the token state change

## 9. Accessibility

- [x] 9.1 Intent arrows carry both color + shape (arrowhead style) + dash pattern — deuteranopia users still distinguish charge vs. DFA vs. push
- [x] 9.2 Disabled rows use strikethrough + tooltip (not color alone) to signal ineligibility
- [ ] 9.3 Keyboard: sub-panel is tabbable; Enter declares the focused row, Escape closes the modal
- [ ] 9.4 `aria-live` region announces phase-state changes (`"Physical Attack phase — 2 eligible options"`)

## 10. Tests

- [x] 10.1 Unit test: `getEligiblePhysicalAttacks` returns punch + kick for a fully-intact mech adjacent to an enemy
- [x] 10.2 Unit test: an arm that fired a weapon this turn returns a punch option with `restrictionsFailed: ['WeaponFiredThisTurn']`
- [x] 10.3 Integration test: select attacker → select adjacent target → declare punch → `PhysicalAttackDeclared` appears in event log with the right payload
- [x] 10.4 Integration test: charge + DFA intent arrows render on hover and clear on mouse-out
- [x] 10.5 Integration test: "Skip" proceeds to end-of-phase without any declaration
- [ ] 10.6 Accessibility test: simulated-deuteranopia snapshot still distinguishes the three intent arrow types

## 11. Spec Compliance

- [ ] 11.1 Every requirement in the `tactical-map-interface` delta has at least one GIVEN/WHEN/THEN scenario
- [ ] 11.2 Every requirement in the `physical-attack-system` delta has at least one scenario
- [ ] 11.3 `openspec validate add-physical-attack-phase-ui --strict` passes clean
