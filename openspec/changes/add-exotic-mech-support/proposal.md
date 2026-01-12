# Change: Add Exotic Mech Configuration Support

## Why
The application currently only supports biped BattleMechs. Users need to import, view, and edit Quad mechs, LAMs, Tripods, and QuadVees with proper location layouts, actuator configurations, armor diagrams, and validation rules. These exotic configurations represent a significant portion of the BattleTech universe and are frequently used in MegaMekLab.

## What Changes

### New Capability: `mech-configuration-system`
- Configuration registry with definitions for Biped, Quad, Tripod, LAM, QuadVee
- Location definitions per configuration (different location sets)
- Actuator definitions per configuration
- Equipment mounting rules per configuration
- LAM mode definitions (Mech/AirMech/Fighter)

### Modified Capabilities

**`critical-slot-allocation`**
- Expand MechLocation enum with Quad locations (FLL, FRL, RLL, RRL), Tripod center leg (CL), and LAM fighter locations
- Configuration-aware actuator placement
- Quad: all 4 locations use leg actuators (Hip, Upper Leg, Lower Leg, Foot)
- Tripod: add center leg with leg actuators
- LAM: add Landing Gear and Avionics as fixed equipment

**`armor-diagram`**
- Add QuadArmorDiagram component (4-legged silhouette)
- Add TripodArmorDiagram component (3-legged + arms)
- Add LAMArmorDiagram component (hybrid with mode toggle)
- Diagram selector based on unit configuration

**`serialization-formats`**
- MTF parser: configuration-aware location headers (Front Left Leg:, Center Leg:, etc.)
- MTF parser: configuration-specific armor labels (FLL armor, CL armor)
- MTF exporter: output correct location names per configuration

**`validation-rules-master`**
- Quad-specific: no hand actuators, no hand weapons, turret mounting rules
- LAM-specific: required Landing Gear and Avionics placement
- Tripod-specific: center leg validation
- Configuration-scoped rule execution

## Impact
- Affected specs: mech-configuration-system (new), critical-slot-allocation, armor-diagram, serialization-formats, validation-rules-master
- Affected code: src/types/construction/, src/components/customizer/ArmorTab/, src/services/conversion/, src/utils/validation/
- **BREAKING**: MechLocation enum expansion requires migration of existing data

## Implementation Priority
1. Foundation + Quad support
2. LAM support with mode switching
3. Tripod support
4. QuadVee support (builds on Quad)
