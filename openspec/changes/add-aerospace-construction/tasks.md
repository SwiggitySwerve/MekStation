# Tasks: Add Aerospace Construction

## 1. Types and Interfaces

- [ ] 1.1 Extend `IAerospaceUnit` with `safeThrust`, `maxThrust`, `structuralIntegrity`, `fuelTons`, `fuelPoints`, `heatSinkPool`
- [ ] 1.2 Add `AerospaceArc` enum (Nose, LeftWing, RightWing, Aft, Fuselage; LeftSide, RightSide for small craft)
- [ ] 1.3 Add `AerospaceEngineType` enum (Fusion, XL, CompactFusion, ICE, FuelCell)
- [ ] 1.4 Add `ISmallCraftCrew` interface with crew / passenger / marine slots
- [ ] 1.5 Add `IAerospaceBreakdown` for weight usage summary

## 2. Tonnage Ranges

- [ ] 2.1 Aerospace Fighter: 5–100 tons
- [ ] 2.2 Conventional Fighter: 5–50 tons (ICE / Fuel Cell only)
- [ ] 2.3 Small Craft: 100–200 tons
- [ ] 2.4 Validation error for out-of-range tonnage

## 3. Engine + Thrust Calculation

- [ ] 3.1 safeThrust = engineRating / tonnage (floor), clamped to maximum thrust by size class
- [ ] 3.2 maxThrust = floor(safeThrust × 1.5)
- [ ] 3.3 Engine weight = ratingToWeight(engineType, rating)
- [ ] 3.4 Conventional fighters: ICE doubles weight; Fusion excluded
- [ ] 3.5 XL engine: half weight, reduced damage threshold (tracked for combat)

## 4. Structural Integrity

- [ ] 4.1 Default SI = ceil(tonnage / 10)
- [ ] 4.2 SI weight = SI × (tonnage / 10) × 0.5
- [ ] 4.3 SI max per size class: ASF max 20, CF max 15, Small Craft max 30
- [ ] 4.4 Increasing SI beyond default increments costs weight

## 5. Fuel Tonnage and Burn Rate

- [ ] 5.1 Minimum fuel: ASF 5 tons, CF 2 tons, Small Craft 20 tons
- [ ] 5.2 Fuel points per ton: Fusion 80, ICE 40, FuelCell 60
- [ ] 5.3 Burn per thrust point per turn — stored for combat use
- [ ] 5.4 Validation: reject < minimum fuel tonnage

## 6. Armor Allocation per Arc

- [ ] 6.1 Four arcs for ASF / CF: Nose, LeftWing, RightWing, Aft
- [ ] 6.2 Small craft arcs: Nose, LeftSide, RightSide, Aft
- [ ] 6.3 Max armor per arc = tonnage × aerospace-armor-max-table
- [ ] 6.4 Total armor ≤ sum of arc maxes
- [ ] 6.5 Armor weight = totalPoints / pointsPerTon by armor type (Standard, Ferro-Aluminum, Heavy FA, Light FA)

## 7. Equipment Mounting per Arc

- [ ] 7.1 Equipment can be mounted in Nose, LWing, RWing, Aft, or Fuselage (internal; no arc restriction)
- [ ] 7.2 Slot count per arc: Nose 6, each Wing 6, Aft 4, Fuselage unlimited (bounded by tonnage)
- [ ] 7.3 Wing-mounted heavy weapons (PPC, Gauss) — tonnage cap per wing
- [ ] 7.4 Bomb bays — small craft only, configurable bays

## 8. Heat Sink Pool

- [ ] 8.1 Baseline 10 engine-free heat sinks
- [ ] 8.2 Additional heat sinks weigh 1 ton each (single) or DHS rules (double)
- [ ] 8.3 Heat-sink tonnage is part of overall weight budget

## 9. Crew (Small Craft)

- [ ] 9.1 Small craft require crew quarters and life support
- [ ] 9.2 Standard quarters: 5 tons per crew
- [ ] 9.3 Steerage quarters: 3 tons per passenger
- [ ] 9.4 Validation: minimum crew per small craft tonnage

## 10. Construction Validation Rules

- [ ] 10.1 `VAL-AERO-TONNAGE` — within sub-type range
- [ ] 10.2 `VAL-AERO-THRUST` — safeThrust ≤ engine-derived max
- [ ] 10.3 `VAL-AERO-SI` — SI within table
- [ ] 10.4 `VAL-AERO-FUEL` — fuel ≥ minimum
- [ ] 10.5 `VAL-AERO-ARC-MAX` — armor per arc ≤ arc max
- [ ] 10.6 `VAL-AERO-CREW` — small craft crew / life support present

## 11. Store and UI Wiring

- [ ] 11.1 Wire `aerospaceStore` to persist all new construction state
- [ ] 11.2 Hook calculators into `AerospaceStructureTab`, `AerospaceArmorTab`, `AerospaceEquipmentTab`
- [ ] 11.3 `AerospaceStatusBar` shows live tonnage / SI / fuel / armor totals and validation errors
- [ ] 11.4 `AerospaceDiagram` renders 4-arc armor allocation visually

## 12. Validation

- [ ] 12.1 `openspec validate add-aerospace-construction --strict`
- [ ] 12.2 Fixtures: Shilone, Stingray, Sabre, SB-27, Union DropShip small-craft shuttle
- [ ] 12.3 Build + lint clean
