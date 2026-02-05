# Design: Exotic Mech Configuration Support

## Context

MekStation currently hardcodes biped mech assumptions throughout the codebase. The location system assumes 8 specific locations (Head, CT, LT, RT, LA, RA, LL, RL), actuator definitions assume arm/leg split, armor diagrams render only biped silhouettes, and MTF parsing expects biped location headers.

BattleTech includes several exotic mech configurations:

- **Quad**: 4-legged mechs with no arms (8 locations, all legs)
- **Tripod**: 2 arms + 3 legs (9 locations)
- **LAM**: Land-Air Mechs with 3 modes (Mech/AirMech/Fighter)
- **QuadVee**: Quad mechs that transform to vehicles

Reference data from MegaMekLab (mm-data repository) confirms the MTF format differences:

- Quad uses: "Front Left Leg:", "Front Right Leg:", "Rear Left Leg:", "Rear Right Leg:"
- Tripod uses: standard biped locations plus "Center Leg:"
- LAM uses: biped locations plus "Landing Gear" and "Avionics" equipment
- Armor labels differ: "FLL armor:", "CL armor:", etc.

## Goals

- Support full editing of Quad, LAM, Tripod, and QuadVee mechs
- Maintain backward compatibility with existing biped units
- Use data-driven configuration definitions (not hardcoded switch statements)
- Enable future configuration additions without code changes

## Non-Goals

- Vehicle, Aerospace, Infantry, Battle Armor support (separate effort)
- OmniMech variants of exotic configs (deferred)
- Combat simulation rules (damage transfer, hit locations)

## Decisions

### Decision 1: Configuration Registry Pattern

**What**: Create a centralized `ConfigurationRegistry` that holds `MechConfigurationDefinition` objects defining locations, actuators, rules, and diagram components per configuration.

**Why**: Avoids scattered switch statements throughout codebase. Adding new configurations becomes a data definition task rather than code changes.

**Alternatives considered**:

- Inheritance/polymorphism (rejected: TypeScript data models don't benefit from OOP patterns for this)
- Switch statements in each module (rejected: hard to maintain, easy to miss cases)

### Decision 2: Expanded MechLocation Enum

**What**: Expand `MechLocation` enum to include all possible locations across configurations:

```typescript
enum MechLocation {
  // Universal
  HEAD,
  CENTER_TORSO,
  LEFT_TORSO,
  RIGHT_TORSO,
  // Biped/Tripod/LAM
  LEFT_ARM,
  RIGHT_ARM,
  LEFT_LEG,
  RIGHT_LEG,
  // Tripod
  CENTER_LEG,
  // Quad/QuadVee
  FRONT_LEFT_LEG,
  FRONT_RIGHT_LEG,
  REAR_LEFT_LEG,
  REAR_RIGHT_LEG,
  // LAM Fighter mode
  NOSE,
  LEFT_WING,
  RIGHT_WING,
  AFT,
  FUSELAGE,
}
```

**Why**: Single type covers all configurations. Helper function `getLocationsForConfig(config)` returns relevant subset.

**Migration**: Existing units use biped locations which remain unchanged.

### Decision 3: Separate Armor Diagram Components

**What**: Create distinct React components for each configuration's armor diagram:

- `BipedArmorDiagram` (existing)
- `QuadArmorDiagram` (new)
- `TripodArmorDiagram` (new)
- `LAMArmorDiagram` (new, with mode toggle)

**Why**: Each configuration has significantly different visual representation. Separate components are cleaner than conditional rendering within one component.

**Trade-off**: More files to maintain, but each is simpler and focused.

### Decision 4: LAM Mode as View State

**What**: LAM mode (Mech/AirMech/Fighter) is a display/view concern, not persisted unit data. The underlying unit data is the same; mode affects which stats and armor mapping are shown.

**Why**: Simplifies data model. Unit doesn't change when switching modes in UI; only the view changes.

**Exception**: Fighter mode armor uses different location mapping (Mech locations → Fighter locations).

### Decision 5: Configuration-Aware MTF Parser

**What**: MTF parser reads `Config:` line first, then selects appropriate location header mappings:

```typescript
const PARSER_CONFIGS = {
  [MechConfiguration.QUAD]: {
    locationHeaders: ['Front Left Leg:', 'Front Right Leg:', ...],
    armorLabels: { 'FLL armor': MechLocation.FRONT_LEFT_LEG, ... }
  },
  // ... other configs
};
```

**Why**: Clean separation of format knowledge from parsing logic.

## Risks / Trade-offs

### Risk: Enum Expansion Breaking Changes

**Risk**: Expanding MechLocation enum could break existing serialized data.
**Mitigation**: New values are additions, not changes. Existing biped locations (LEFT_ARM, etc.) remain unchanged. Serialization includes configuration type, so parser knows which locations to expect.

### Risk: Armor Diagram SVG Complexity

**Risk**: Creating quad/tripod silhouettes requires graphic design effort.
**Mitigation**: Start with simplified/schematic diagrams; can enhance visuals later.

### Risk: Validation Rule Explosion

**Risk**: Each configuration adds many rules, making validation slow or complex.
**Mitigation**: Rules are filtered by `appliesTo` before execution. Only relevant rules run for each config.

## Migration Plan

1. **Phase 1**: Add ConfigurationRegistry with biped + quad definitions
2. **Phase 2**: Update MTF parser/exporter for quad
3. **Phase 3**: Add QuadArmorDiagram
4. **Phase 4**: Add quad validation rules
5. **Phase 5**: Repeat for LAM, Tripod, QuadVee

Rollback: Each phase is independently deployable. Revert to previous phase if issues.

## Open Questions

1. **Quad turret rules**: How detailed should turret weapon mounting validation be?
   - Resolved: Full BattleTech rules per user request

2. **LAM fighter armor mapping**: Should fighter mode show separate armor values or mapped values?
   - Resolved: Hybrid diagram with mode toggle, showing mapped values

3. **Tripod center leg position**: Where should center leg appear in diagram?
   - Deferred: Design during implementation
