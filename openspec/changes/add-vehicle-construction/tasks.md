# Tasks: Add Vehicle Construction

## 1. Types and Interfaces

- [ ] 1.1 Extend `IVehicleUnit` with `motionType`, `engineType`, `engineRating`, `cruiseMP`, `turretConfig`, `crewSize`, `barRating?`
- [ ] 1.2 Add `MotionType` enum (Tracked, Wheeled, Hover, VTOL, Naval, Hydrofoil, Submarine, WiGE, Rail, Maglev)
- [ ] 1.3 Add `TurretConfig` enum (None, Single, Dual, Chin, Sponson)
- [ ] 1.4 Add `VehicleLocation` enum (Front, LeftSide, RightSide, Rear, Turret, Body, Rotor, ChinTurret)
- [ ] 1.5 Add `IVehicleArmor`, `IVehicleTurret`, `IVehicleCrew` interfaces per spec

## 2. Motion Type + Tonnage Rules

- [ ] 2.1 Implement per-motion-type max tonnage table per existing `vehicle-unit-system` spec
- [ ] 2.2 Clamp tonnage when motion type changes (e.g., Hover → max 50t)
- [ ] 2.3 On motion switch to VTOL, auto-add Rotor location and restrict turret to None/Chin
- [ ] 2.4 On motion switch away from VTOL, remove Rotor and reset turret options
- [ ] 2.5 Unit tests for every motion transition

## 3. Engine Selection

- [x] 3.1 Compute engine rating from tonnage × cruiseMP
- [x] 3.2 Apply motive-modifier multiplier by motion type (Hover/VTOL/WiGE = 1.0, Tracked = 1.0, Wheeled = 1.0; Naval per table)
- [x] 3.3 Look up engine weight from rating × engine-type factor (Fusion 1.0, ICE 2.0, XL 0.5, Light 0.75, Fuel Cell 1.2)
- [x] 3.4 Validate engine rating does not exceed table max (400)
- [x] 3.5 Compute flank MP = floor(cruiseMP × 1.5)

## 4. Internal Structure

- [x] 4.1 Compute structure weight = ceil(tonnage × 0.1 / 0.5) × 0.5 (combat vehicle)
- [x] 4.2 Apply structure-type multiplier (Standard 1.0, Endo-Steel 0.5, Composite 0.5)
- [x] 4.3 Compute internal structure points per location from tonnage table
- [x] 4.4 Unit tests for 20/40/60/80/100 ton vehicles

## 5. Armor System

- [x] 5.1 Support all standard armor types (Standard, Ferro-Fibrous, Heavy FF, Light FF, Stealth, Reactive, Reflective, Hardened)
- [x] 5.2 Enforce per-location max armor = 2 × internal structure (location)
- [x] 5.3 Compute armor weight from points / points-per-ton by type
- [ ] 5.4 Support BAR rating 1–10 for support vehicles with BAR-scaled armor tonnage
- [ ] 5.5 Prevent armor allocation on Body (support) unless ≥ BAR 6
- [x] 5.6 Unit tests across combat, VTOL, and support armor paths

## 6. Turret System

- [x] 6.1 Enforce turret weight = 10% of turret-mounted equipment weight (rounded up to half-ton)
- [x] 6.2 Single turret: 360° arc, mountable on combat vehicles, tonnage limited to tonnage – crew – other mounts
- [x] 6.3 Dual turret: each turret weighs 10% of its own equipment; only on vehicles ≥ 50t
- [x] 6.4 Chin turret: VTOL only, half weight of standard turret
- [x] 6.5 Sponson turret: per pair, 5% of equipment weight each, forward-side arc
- [x] 6.6 Validation: reject turret if motion type / tonnage is ineligible

## 7. Crew Calculation

- [x] 7.1 Compute minimum crew from tonnage × motion-type table (e.g., Tracked 40t → 3 crew)
- [x] 7.2 Add passenger slots if configured
- [x] 7.3 Require commander crew slot on vehicles > 5t
- [x] 7.4 Validation error on understaffed vehicle

## 8. Weapon and Equipment Mounting

- [x] 8.1 Mount weapons/equipment to legal locations (Front, sides, Rear, Turret(s), Body)
- [x] 8.2 Enforce arc legality (e.g., no Rear-mounted Sponson)
- [x] 8.3 Compute power amplifier weight: 10% of energy-weapon weight on ICE/Fuel Cell engines
- [x] 8.4 Reject equipment that requires slots the vehicle chassis cannot provide
- [ ] 8.5 Support omni vehicles (pod-mounted equipment flag)

## 9. Construction Validation Rules

- [x] 9.1 `VAL-VEHICLE-TONNAGE` — tonnage within legal range for motion type / unit sub-type
- [x] 9.2 `VAL-VEHICLE-ENGINE` — engine rating legal and engine weight + structure + armor + equipment ≤ tonnage
- [x] 9.3 `VAL-VEHICLE-TURRET` — turret mass 10% rule and motion-type eligibility
- [x] 9.4 `VAL-VEHICLE-ARMOR-LOC` — per-location armor ≤ 2× structure
- [x] 9.5 `VAL-VEHICLE-CREW` — at least minimum crew for tonnage / motion type
- [x] 9.6 `VAL-VEHICLE-POWER-AMP` — power amps present when required

## 10. Store and UI Wiring

- [x] 10.1 Wire `vehicleStore` to persist all new construction state
- [x] 10.2 Update `VehicleStructureTab`, `VehicleArmorTab`, `VehicleEquipmentTab`, `VehicleTurretTab` to use the new calculators
- [x] 10.3 Status bar reflects live weight / tonnage ratio and validation errors
- [ ] 10.4 Integration test: build a legal 40-ton tracked tank end-to-end

## 11. Validation

- [ ] 11.1 `openspec validate add-vehicle-construction --strict`
- [x] 11.2 Build + lint clean
- [ ] 11.3 Fixture: Demolisher, Manticore, Savannah Master, VTOL Warrior, Support Truck round-trip through pipeline
