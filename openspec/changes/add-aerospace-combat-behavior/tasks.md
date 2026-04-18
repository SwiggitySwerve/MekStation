# Tasks: Add Aerospace Combat Behavior (2D simplified)

## 1. Unit-Type Dispatch

- [x] 1.1 Route `resolveDamage()` to `aerospaceResolveDamage()` when target is `IAerospaceUnit`
- [x] 1.2 Route `resolveCriticalHits()` to aerospace variant
- [x] 1.3 Route `hitLocation.ts` to aerospace arc tables
- [x] 1.4 Route `movement` to aerospace 2D flight rules

## 2. Aerospace Hit Location Tables

- [x] 2.1 Front attack: 2=Nose(TAC), 3-4=RightWing, 5-7=Nose, 8-9=LeftWing, 10-11=Aft, 12=Nose(TAC)
- [x] 2.2 Side attack: 2=Side(TAC), 3-5=Nose, 6-8=NearWing, 9-10=Aft, 11-12=Side(TAC)
- [x] 2.3 Rear attack: 2=Aft(TAC), 3-5=Wing (random L/R), 6-8=Aft, 9-10=Nose, 11-12=Aft(TAC)
- [x] 2.4 Small craft: swap LeftWing/RightWing → LeftSide/RightSide tables
- [x] 2.5 Unit tests for every (direction × roll) combo

## 3. Armor → SI Damage Chain

- [x] 3.1 Apply damage to hit-arc armor first
- [x] 3.2 Excess reduces SI by (excess / 10) rounded down
- [x] 3.3 When SI reaches 0, the unit is destroyed
- [x] 3.4 Emit `SIReduced` event when SI changes
- [x] 3.5 No arc-to-arc transfer (aerospace damage does not carry over)

## 4. Control Roll Trigger

- [x] 4.1 Damage > (0.1 × current SI) triggers a Control Roll
- [x] 4.2 Control Roll = 2d6 + pilot skill + damage modifier vs TN 8
- [x] 4.3 Failure: unit takes 1 additional SI damage and may lose control heading
- [x] 4.4 Emit `ControlRoll` event (pass/fail)

## 5. Aerospace Critical Hit Table

- [x] 5.1 Trigger on TAC (roll 2) or SI-exposing damage
- [x] 5.2 Table: 2 = nothing, 3 = crew stunned, 4-5 = cargo/fuel hit, 6-7 = avionics, 8-9 = engine hit (+5 heat, can destroy), 10-11 = control surfaces (−1 thrust), 12 = catastrophic (destroyed)
- [x] 5.3 Fuel hit: bleed 5 fuel points + ignition chance
- [x] 5.4 Avionics: +1 to-hit on all subsequent attacks
- [x] 5.5 Engine: aerospace engine crits count separately from mech rules
- [x] 5.6 Emit `ComponentDestroyed` events per hit

## 6. 2D Simplified Movement

- [x] 6.1 Flying unit moves `2 × safeThrust` hexes per turn (MVP simplification)
- [x] 6.2 Movement is a straight line plus one ≤60° turn
- [x] 6.3 No altitude tracking — all flying units are at a single shared "above-board" layer
- [x] 6.4 No thrust-point economy — each turn pays nothing from a budget
- [x] 6.5 Unit tests: flying unit traversing board, turning, reaching edge

## 7. Off-Map / Re-Entry

- [x] 7.1 Flying unit that reaches board edge enters off-map state
- [x] 7.2 Off-map state lasts N turns (configurable per scenario, default 2)
- [x] 7.3 Re-entry hex chosen by unit owner on any edge; original facing restored
- [x] 7.4 Emit `AerospaceExited` and `AerospaceEntered` events

## 8. Fly-Over Attack

- [x] 8.1 During movement, aerospace unit declares a strafe path (series of hexes)
- [x] 8.2 Weapons in Nose / Wings may fire at ground units in path hexes
- [x] 8.3 Bomb loads drop one bomb per declared drop hex (bomb bays only)
- [x] 8.4 Each strafed hex incurs +2 to-hit penalty for the aerospace attacker (simplified)
- [x] 8.5 Emit `AerospaceFlyOver` event listing affected hexes

## 9. Firing Arcs

- [x] 9.1 Nose arc: 60° forward cone
- [x] 9.2 Wings: 120° each side (LeftWing / RightWing)
- [x] 9.3 Aft: 60° rear cone
- [x] 9.4 Fuselage weapons: fire in whichever arc the pilot declares
- [x] 9.5 Small craft arcs rename Wings → Sides

## 10. Heat System for Aerospace

- [x] 10.1 Heat pool uses aerospace heat-sink count (10 baseline + extras)
- [x] 10.2 Heat generated same as mech weapon fire
- [x] 10.3 Heat 9+: −1 thrust (speed penalty), heat 15+: shutdown check
- [x] 10.4 Aerospace heat table is NOT identical to mech — use TW aerospace table

## 11. Fuel Burn

- [x] 11.1 Each turn a flying unit spends fuel equal to the thrust used
- [x] 11.2 Fuel 0: unit must leave board, may not re-enter this scenario
- [x] 11.3 Emit `FuelDepleted` event at depletion

## 12. AI Adaptations

- [x] 12.1 Bot flying an aero unit prefers strafe targets by mech/vehicle BV
- [x] 12.2 Bot withdraws when SI ≤ 30% or fuel < 2 turns
- [x] 12.3 Bot uses heat-safe attack cadence

## 13. Validation

- [x] 13.1 `openspec validate add-aerospace-combat-behavior --strict`
- [ ] 13.2 Simulation harness: 1 ASF vs 2 mechs resolves in ≤ 10 turns — DEFERRED (integration harness sits atop the GameEngine which isn't yet wired to the aerospace dispatcher; follow-up change will close the loop)
- [x] 13.3 Unit tests cover hit-location / SI / control-roll / crit paths (159 tests / 11 suites, all green)
- [x] 13.4 Build + lint clean

## 14. Documentation

- [x] 14.1 Add `docs/architecture/aerospace-combat-2d.md` noting 2D simplification and pointers to the full-rules follow-up
