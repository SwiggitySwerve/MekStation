# Change: Multi-Unit Type Support

## Why

MekStation currently only supports BattleMech construction. The mm-data repository contains 10,397 unit files across 13 unit type categories (Vehicles, Aerospace, Battle Armor, Infantry, ProtoMechs, DropShips, etc.). Users need the ability to import, validate, customize, and export all unit types to make MekStation a complete BattleTech unit management tool.

## What Changes

### Phase 1: Foundation & Data Layer
- **BREAKING**: Refactor `ISerializedUnit` to support polymorphic unit types
- Add BLK file format parser for non-mech units
- Create abstract `IBaseUnit` interface with shared properties
- Create unit-type-specific interfaces extending `IBaseUnit`
- Implement unit type detection and routing

### Phase 2: Import & Validation Pipeline
- Extend `UnitLoaderService` to handle all unit types
- Create unit-type-specific validation rule registries
- Implement component mappers for each unit type
- Add unit-specific equipment filtering

### Phase 3: Customizer UI Per Unit Type
- Create unit-type-specific customizer tabs (following MegaMekLab patterns)
- Implement unit-specific diagrams (vehicle locations, aerospace arcs, etc.)
- Add unit-specific toggles and controls
- Create unit-specific status bars

### Phase 4: Export & Printing
- Extend serialization to support all unit types
- Implement unit-type-specific record sheet generation
- Add BLK export capability

## Impact

### Affected Specs
- `serialization-formats` - Add polymorphic unit serialization
- `unit-entity-model` - Expand to all unit types
- `mm-data-asset-integration` - Add vehicle/aerospace assets
- `validation-rules-master` - Add unit-type registries
- `customizer-tabs` - Add unit-type-specific tabs
- `armor-diagram` - Add vehicle/aerospace variants

### Affected Code
- `src/types/unit/` - All unit interfaces
- `src/services/units/` - Loader, factory, repository
- `src/services/validation/` - Validation rules
- `src/components/customizer/` - All customizer components
- `src/stores/unitState.ts` - Unit state model

### New Specs Required
- `unit-type-hierarchy` - Base interface architecture
- `vehicle-construction-system` - Vehicle-specific rules
- `aerospace-construction-system` - Aerospace-specific rules
- `battle-armor-construction-system` - BA-specific rules
- `infantry-construction-system` - Infantry-specific rules
- `protomech-construction-system` - ProtoMech-specific rules
- `blk-format-parser` - BLK file parsing

## External References

| Resource | Location | Purpose |
|----------|----------|---------|
| mm-data | `E:\Projects\mm-data` or `github.com/MegaMek/mm-data` | Unit data files (BLK/MTF) |
| MegaMekLab | `E:\Projects\megameklab` or `github.com/MegaMek/megameklab` | Reference implementation |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Scope creep | High | High | Phased approach, validate each phase |
| MegaMek parity gaps | Medium | Medium | Document deviations, prioritize common units |
| Performance with large datasets | Medium | Low | Lazy loading, pagination |
| Incompatible data formats | Low | High | Extensive BLK parser testing |

## Success Criteria

1. Import any mm-data BLK file for all 13 unit types
2. Validate imported units against TechManual rules
3. Display unit in appropriate customizer with correct diagram
4. Export back to BLK/MTF format with round-trip fidelity
5. Generate record sheets for all unit types
