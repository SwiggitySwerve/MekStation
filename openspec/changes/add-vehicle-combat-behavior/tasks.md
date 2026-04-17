# Tasks: Add Vehicle Combat Behavior

## 1. Unit-Type Dispatch in Combat Engine

- [ ] 1.1 Extend `resolveDamage()` dispatch to call `vehicleResolveDamage()` when target is `IVehicleUnit`
- [ ] 1.2 Extend `resolveCriticalHits()` dispatch to call `vehicleResolveCriticalHits()`
- [ ] 1.3 Extend `hitLocation.ts` dispatch to call `vehicleHitLocation()` when target is vehicle
- [ ] 1.4 Extend `firingArc.ts` to compute vehicle arcs from facing + motion type

## 2. Vehicle Hit Location Tables

- [ ] 2.1 Front attack (2d6): 2=Front(TAC), 3-4=Right Side, 5-7=Front, 8-9=Left Side, 10-11=Turret, 12=Front(TAC)
- [ ] 2.2 Side attack: 2=Side(TAC), 3-5=Rear, 6-8=Side, 9-10=Front, 11-12=Turret
- [ ] 2.3 Rear attack: 2=Rear(TAC), 3-5=Left/Right Side, 6-8=Rear, 9-10=Turret, 11-12=Rear(TAC)
- [ ] 2.4 VTOL extra: roll of 12 on Front/Rear attack hits Rotor instead of Turret
- [ ] 2.5 Unit tests across every (direction × roll) combination

## 3. Armor → Structure Transfer Chain (Vehicle)

- [ ] 3.1 Apply damage to hit-location armor first
- [ ] 3.2 Overflow into internal structure at that location
- [ ] 3.3 No adjacent-location transfer (vehicles are single chassis)
- [ ] 3.4 When any location's structure reaches 0, the vehicle is destroyed (except Turret → turret destroyed, Rotor → immobilized)
- [ ] 3.5 Emit `LocationDestroyed` and `VehicleDestroyed` events

## 4. Motive Damage Table

- [ ] 4.1 Trigger motive-damage roll whenever damage exposes structure at Front/Side/Rear
- [ ] 4.2 Roll 2d6: 2-5 = no effect, 6-7 = minor damage (-1 cruise MP), 8-9 = moderate (-2), 10-11 = heavy (-3), 12 = immobilized
- [ ] 4.3 Apply `MotivePenaltyApplied` event with new cruise MP value
- [ ] 4.4 Stack penalties (multiple rolls accumulate)
- [ ] 4.5 Flank MP recomputed from reduced cruise MP
- [ ] 4.6 Hover / Hydrofoil: motive-damage roll on any hit, not just structure-exposing

## 5. Motive Crit Effects per Motion Type

- [ ] 5.1 Tracked: reduced MP only; fully mobile at 1 MP minimum until immobilized
- [ ] 5.2 Wheeled: immobilized on heavy motive damage (treat heavy = immobilized for wheeled)
- [ ] 5.3 Hover: any heavy damage sinks (destroyed in water, bogged on land)
- [ ] 5.4 VTOL: any rotor hit → crash (see §7)
- [ ] 5.5 Naval: heavy → sinking begins (destroyed in N turns)

## 6. Vehicle Critical Hit System

- [ ] 6.1 Crit trigger: hit location rolls of 2 (TAC) or structure-exposing damage with crit roll ≥ 8
- [ ] 6.2 Crit table: 1 = crew stunned (skip phase), 2 = weapon destroyed, 3 = cargo/infantry hit, 4 = driver/commander hit, 5 = fuel tank, 6 = engine, 7 = ammo explosion (if ammo in slot), 8 = crew killed
- [ ] 6.3 Apply `VehicleCrewStunned` event — no firing / no movement next phase
- [ ] 6.4 Engine crit: 1 hit = disabled this turn, 2 hits = engine destroyed → vehicle dead
- [ ] 6.5 Ammo explosion: per standard ammo rules, vehicle destroyed
- [ ] 6.6 Fuel tank: ICE/FuelCell only — fire onboard

## 7. VTOL-Specific Rules

- [ ] 7.1 Rotor location has its own armor/structure
- [ ] 7.2 Any damage to Rotor structure → `VTOLCrashCheck` event
- [ ] 7.3 Rotor destruction → vehicle falls, takes fall damage = 10 × altitude
- [ ] 7.4 Altitude is tracked in combat state (0 at hover, 1-5 at flight)

## 8. Turret-Specific Rules

- [ ] 8.1 Turret Locked: crit #2 on turret location locks turret to current facing; turret weapons now fire in chassis Front arc only
- [ ] 8.2 Emit `TurretLocked` event
- [ ] 8.3 Dual turrets tracked independently

## 9. Firing Arc Computation

- [ ] 9.1 Ground vehicle arcs: Front = 60° front, Left/Right Side = 120° each, Rear = 60°
- [ ] 9.2 Turret arc: 360° ignoring chassis facing (if not locked)
- [ ] 9.3 Chin turret (VTOL): 360° horizontal with −1 to-hit penalty for pivots beyond 180°
- [ ] 9.4 Sponson turrets: 180° forward-side arc only

## 10. Heat Exemption

- [ ] 10.1 Vehicles with Fusion/XL engines accumulate heat per TW combat-vehicle rules (1 heat per 3 heat-sink slots needed for weapons)
- [ ] 10.2 ICE / Fuel Cell vehicles have no heat track at all
- [ ] 10.3 Vehicle heat effects: at 6+ cap shutdown per Total Warfare; not identical to mech scale

## 11. AI Adaptations

- [ ] 11.1 Bot treats vehicle as no-reverse-jump, no pivot-in-place (wheeled)
- [ ] 11.2 Bot prefers flanking arcs (Side) given motive-damage table
- [ ] 11.3 Bot prioritizes turret-mounted high-BV weapons when scoring targets

## 12. Validation

- [ ] 12.1 `openspec validate add-vehicle-combat-behavior --strict`
- [ ] 12.2 Simulation harness: 1 mech vs 1 tank produces legal outcomes
- [ ] 12.3 Unit tests for motive damage table across directions + motion types
- [ ] 12.4 Unit tests for turret-locked, crew-stunned, ammo-crit paths
- [ ] 12.5 Build + lint clean
