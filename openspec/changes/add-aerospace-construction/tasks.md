# Tasks: Add Aerospace Construction

## 1. Types and Interfaces

- [x] 1.1 Extend `IAerospaceUnit` with `safeThrust`, `maxThrust`, `structuralIntegrity`, `fuelTons`, `fuelPoints`, `heatSinkPool`
- [x] 1.2 Add `AerospaceArc` enum (Nose, LeftWing, RightWing, Aft, Fuselage; LeftSide, RightSide for small craft)
- [x] 1.3 Add `AerospaceEngineType` enum (Fusion, XL, CompactFusion, ICE, FuelCell)
- [x] 1.4 Add `ISmallCraftCrew` interface with crew / passenger / marine slots
- [x] 1.5 Add `IAerospaceBreakdown` for weight usage summary

## 2. Tonnage Ranges

- [x] 2.1 Aerospace Fighter: 5–100 tons
- [x] 2.2 Conventional Fighter: 5–50 tons (ICE / Fuel Cell only)
- [x] 2.3 Small Craft: 100–200 tons
- [x] 2.4 Validation error for out-of-range tonnage

## 3. Engine + Thrust Calculation

- [x] 3.1 safeThrust = engineRating / tonnage (floor), clamped to maximum thrust by size class
- [x] 3.2 maxThrust = floor(safeThrust × 1.5)
- [x] 3.3 Engine weight = ratingToWeight(engineType, rating)
- [x] 3.4 Conventional fighters: ICE doubles weight; Fusion excluded
- [x] 3.5 XL engine: half weight, reduced damage threshold (tracked for combat)

## 4. Structural Integrity

- [x] 4.1 Default SI = ceil(tonnage / 10)
- [x] 4.2 SI weight = SI × (tonnage / 10) × 0.5
- [x] 4.3 SI max per size class: ASF max 20, CF max 15, Small Craft max 30
- [x] 4.4 Increasing SI beyond default increments costs weight

## 5. Fuel Tonnage and Burn Rate

- [x] 5.1 Minimum fuel: ASF 5 tons, CF 2 tons, Small Craft 20 tons
- [x] 5.2 Fuel points per ton: Fusion 80, ICE 40, FuelCell 60
- [x] 5.3 Burn per thrust point per turn — stored for combat use
- [x] 5.4 Validation: reject < minimum fuel tonnage

## 6. Armor Allocation per Arc

- [x] 6.1 Four arcs for ASF / CF: Nose, LeftWing, RightWing, Aft
- [x] 6.2 Small craft arcs: Nose, LeftSide, RightSide, Aft
- [x] 6.3 Max armor per arc = tonnage × aerospace-armor-max-table
- [x] 6.4 Total armor ≤ sum of arc maxes
- [x] 6.5 Armor weight = totalPoints / pointsPerTon by armor type (Standard, Ferro-Aluminum, Heavy FA, Light FA)

## 7. Equipment Mounting per Arc

- [x] 7.1 Equipment can be mounted in Nose, LWing, RWing, Aft, or Fuselage (internal; no arc restriction)
- [x] 7.2 Slot count per arc: Nose 6, each Wing 6, Aft 4, Fuselage unlimited (bounded by tonnage)
- [ ] 7.3 Wing-mounted heavy weapons (PPC, Gauss) — tonnage cap per wing
- [ ] 7.4 Bomb bays — small craft only, configurable bays

## 8. Heat Sink Pool

- [x] 8.1 Baseline 10 engine-free heat sinks
- [x] 8.2 Additional heat sinks weigh 1 ton each (single) or DHS rules (double)
- [x] 8.3 Heat-sink tonnage is part of overall weight budget

## 9. Crew (Small Craft)

- [x] 9.1 Small craft require crew quarters and life support
- [x] 9.2 Standard quarters: 5 tons per crew
- [x] 9.3 Steerage quarters: 3 tons per passenger
- [x] 9.4 Validation: minimum crew per small craft tonnage

## 10. Construction Validation Rules

- [x] 10.1 `VAL-AERO-TONNAGE` — within sub-type range
- [x] 10.2 `VAL-AERO-THRUST` — safeThrust ≤ engine-derived max
- [x] 10.3 `VAL-AERO-SI` — SI within table
- [x] 10.4 `VAL-AERO-FUEL` — fuel ≥ minimum
- [x] 10.5 `VAL-AERO-ARC-MAX` — armor per arc ≤ arc max
- [x] 10.6 `VAL-AERO-CREW` — small craft crew / life support present

## 11. Store and UI Wiring

- [x] 11.1 Wire `aerospaceStore` to persist all new construction state
- [x] 11.2 Hook calculators into `AerospaceStructureTab`, `AerospaceArmorTab`, `AerospaceEquipmentTab`
- [x] 11.3 `AerospaceStatusBar` shows live tonnage / SI / fuel / armor totals and validation errors
- [x] 11.4 `AerospaceDiagram` renders 4-arc armor allocation visually

## 12. Validation

- [x] 12.1 `openspec validate add-aerospace-construction --strict` — all VAL-AERO-* rules covered by jest tests
- [x] 12.2 Fixtures: Shilone (65t ASF), Stuka (100t ASF), Sparrowhawk (30t CF), Seeker (100t SmallCraft)
- [x] 12.3 Build + lint clean — tsc --noEmit passes, 97/97 jest tests pass
