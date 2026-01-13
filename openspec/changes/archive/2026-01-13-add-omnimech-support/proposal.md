# Change: Add OmniMech Support

## Why

OmniMechs represent a significant portion of BattleTech units, especially Clan designs. They have unique construction rules that differ fundamentally from standard BattleMechs:

1. **Fixed vs Pod Equipment**: OmniMechs have a base chassis with fixed components (engine, structure, cockpit, gyro, fixed weapons) and modular pod space where equipment can be swapped
2. **Base Chassis Heat Sinks**: A portion of heat sinks are permanently fixed to the chassis
3. **Configuration Variants**: Same chassis can have Prime, A, B, C, D, etc. configurations with different pod loadouts
4. **Construction Constraints**: Pod-mounted equipment has specific placement rules

Currently, MekStation:
- Detects OmniMechs during import (`isOmniMechConfig()`)
- Has `isOmni` flag in unit store
- Has skeletal `IOmniMech` interface
- Does NOT track fixed vs pod equipment distinction
- Does NOT support base chassis heat sinks
- Does NOT have UI for OmniMech-specific editing
- Does NOT parse `(omnipod)` markers from MTF files

## What Changes

### New Capability: `omnimech-system`

Core OmniMech support including:
- Fixed vs pod equipment tracking per mounted item
- Base chassis heat sink count
- Pod space calculation per location
- Configuration variant metadata
- Equipment mounting rules (which items can be pod-mounted)

### Modified Capabilities

**`serialization-formats`**
- MTF parser: Parse `Base Chassis Heat Sinks:` field
- MTF parser: Parse `clanname:` field for Clan reporting name
- MTF parser: Detect `(omnipod)` suffix on equipment lines
- MTF exporter: Output OmniMech-specific fields
- MTF exporter: Add `(omnipod)` suffix to pod-mounted equipment

**`heat-sink-system`**
- Separate base chassis heat sinks from pod heat sinks
- Validate minimum fixed heat sinks based on engine capacity
- Track which heat sinks are fixed vs swappable

**`equipment-placement`**
- Track `isOmniPodMounted` flag per equipment instance
- Determine if equipment CAN be pod-mounted (`canPodMount()`)
- Equipment that is `omniFixedOnly` cannot be pod-mounted

**`unit-store-architecture`**
- Add `baseChassisHeatSinks` to unit state
- Add `isOmniPodMounted` to equipment instances
- Add reset chassis action (clear all pod equipment)

**`customizer-tabs`**
- Structure Tab: Add "OmniMech" checkbox with cascade effects
- Structure Tab: Add base chassis heat sink spinner (visible when isOmni)
- Structure Tab: Add "Reset Chassis" button for variant switching

**`validation-rules-master`**
- OmniMech heat sink minimum validation
- Pod equipment placement validation
- Fixed equipment immutability validation

## Impact

- Affected specs: omnimech-system (new), serialization-formats, heat-sink-system, equipment-placement, unit-store-architecture, customizer-tabs, validation-rules-master
- Affected code: src/types/, src/stores/, src/services/conversion/, src/components/customizer/, src/utils/validation/
- **NON-BREAKING**: OmniMech support adds new fields/behaviors without breaking existing standard mech functionality

## Implementation Priority

1. **Phase 1 - Data Model**: Add OmniMech fields to types, store, and interfaces
2. **Phase 2 - MTF Parsing**: Parse and preserve OmniMech-specific MTF fields
3. **Phase 3 - UI Controls**: Add OmniMech checkbox and related controls
4. **Phase 4 - Validation**: Implement OmniMech-specific validation rules

## Research Sources

- [MegaMekLab source code](https://github.com/MegaMek/megameklab) - `UnitUtil.canPodMount()`, `BMChassisView.java`, `HeatSinkView.java`
- [MekHQ OmniPod.java](https://github.com/MegaMek/mekhq/blob/master/MekHQ/src/mekhq/campaign/parts/OmniPod.java)
- [Sarna.net OmniMech wiki](https://www.sarna.net/wiki/OmniMech)
- MM-data OmniMech MTF files (Timber Wolf, Dire Wolf, Summoner, Mad Dog)
