# Change: Implement Phase 2 Construction Systems

## Why
BattleMech construction requires precise rules for all structural components including engines, gyros, internal structure, armor, cockpits, heat sinks, and movement systems. Phase 2 implements the core construction rules from the BattleTech TechManual.

## What Changes
- **ADDED** Engine System - 10 engine types with weight/slot formulas
- **ADDED** Gyro System - 4 gyro types with placement rules
- **ADDED** Heat Sink System - 5 heat sink types and engine integration
- **ADDED** Internal Structure System - 7 structure types with hit point tables
- **ADDED** Armor System - 14 armor types with points-per-ton ratios
- **ADDED** Cockpit System - 5 cockpit types and head layout
- **ADDED** Movement System - Walk/Run/Jump calculations and enhancements
- **ADDED** Critical Slot Allocation - Location slots and placement rules
- **ADDED** Tech Base Integration - IS/Clan/Mixed unit handling
- **ADDED** Tech Base Rules Matrix - Tech base restriction mappings
- **ADDED** Tech Base Variants Reference - IS vs Clan differences
- **ADDED** Formula Registry - Centralized calculation formulas
- **ADDED** Construction Rules Core - 12-step construction sequence

## Impact
- **Affected specs**: Phase 3-5 equipment and validation systems
- **Affected code**: 
  - `src/types/construction/` - Construction component types
  - `src/services/construction/` - Construction calculation services
  - `src/utils/constructionRules/` - Rule calculation utilities
  - `constants/BattleTechConstructionRules.ts` - Single source of truth

## Dependencies
- Phase 1 Foundation (Core Entity Types, Enumerations, Physical Properties)

## Related Specifications
- `openspec/specs/phase-2-construction/engine-system/spec.md`
- `openspec/specs/phase-2-construction/gyro-system/spec.md`
- `openspec/specs/phase-2-construction/heat-sink-system/spec.md`
- `openspec/specs/phase-2-construction/internal-structure-system/spec.md`
- `openspec/specs/phase-2-construction/armor-system/spec.md`
- `openspec/specs/phase-2-construction/cockpit-system/spec.md`
- `openspec/specs/phase-2-construction/movement-system/spec.md`
- `openspec/specs/phase-2-construction/critical-slot-allocation/spec.md`
- `openspec/specs/phase-2-construction/tech-base-integration/spec.md`
- `openspec/specs/phase-2-construction/tech-base-rules-matrix/spec.md`
- `openspec/specs/phase-2-construction/tech-base-variants-reference/spec.md`
- `openspec/specs/phase-2-construction/formula-registry/spec.md`
- `openspec/specs/phase-2-construction/construction-rules-core/spec.md`

