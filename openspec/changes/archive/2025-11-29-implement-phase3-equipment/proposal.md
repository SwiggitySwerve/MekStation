# Change: Implement Phase 3 Equipment Systems

## Why
BattleMechs require weapons, ammunition, electronics, and other equipment. Phase 3 implements the complete equipment system including weapons database, ammunition tracking, electronics, physical weapons, and equipment placement rules.

## What Changes
- **ADDED** Weapon System - Energy, ballistic, missile weapons with damage/heat/range
- **ADDED** Ammunition System - Ammo types, shots per ton, explosion rules
- **ADDED** Electronics System - C3, ECM, TAG, probes, targeting computers
- **ADDED** Physical Weapons System - Melee weapons (hatchets, swords, claws)
- **ADDED** Equipment Placement - Location restrictions and split rules
- **ADDED** Equipment Database - Complete equipment catalog with stats
- **ADDED** Hardpoint System - Weapon mounting restrictions

## Impact
- **Affected specs**: Phase 4 validation (heat, BV), Phase 5 data models
- **Affected code**: 
  - `src/types/equipment/` - Equipment type definitions
  - `src/data/equipment/` - Equipment database
  - `src/services/equipment/` - Equipment services
  - `src/components/equipment/` - Equipment UI components

## Dependencies
- Phase 1 Foundation (Core Types, Enumerations)
- Phase 2 Construction (Critical Slots, Weight)

## Related Specifications
- `openspec/specs/phase-3-equipment/weapon-system/spec.md`
- `openspec/specs/phase-3-equipment/ammunition-system/spec.md`
- `openspec/specs/phase-3-equipment/electronics-system/spec.md`
- `openspec/specs/phase-3-equipment/physical-weapons-system/spec.md`
- `openspec/specs/phase-3-equipment/equipment-placement/spec.md`
- `openspec/specs/phase-3-equipment/equipment-database/spec.md`
- `openspec/specs/phase-3-equipment/hardpoint-system/spec.md`

