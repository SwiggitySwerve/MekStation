# OmniMech Support Design Document

## Overview

This document captures the architectural decisions and detailed design for adding OmniMech support to MekStation, based on research of MegaMekLab's implementation and BattleTech construction rules.

## Key Concepts

### Fixed vs Pod Equipment

The fundamental distinction in OmniMech design:

| Aspect     | Fixed Equipment                          | Pod Equipment                        |
| ---------- | ---------------------------------------- | ------------------------------------ |
| Permanence | Cannot be removed                        | Swappable between configurations     |
| Examples   | Engine, gyro, structure, base heat sinks | Weapons, ammo, additional heat sinks |
| MTF Marker | No suffix                                | `(omnipod)` suffix                   |
| Storage    | Part of base chassis                     | Part of configuration variant        |

### Base Chassis Heat Sinks

OmniMechs have a special heat sink allocation:

```
Total Heat Sinks = Base Chassis Heat Sinks + Pod Heat Sinks

Where:
- Base Chassis: Fixed to the chassis, cannot be removed
- Pod Heat Sinks: Can be swapped for other equipment
```

The `Base Chassis Heat Sinks:` MTF field indicates how many are permanently fixed.

**Constraint**: Cannot pod-mount a heat sink if doing so would reduce fixed heat sinks below the engine's free capacity requirement.

### Configuration Variants

OmniMechs have named configurations (Prime, A, B, C, D, E, F, H, etc.):

- **Same base chassis**: Engine, structure, armor type/allocation, gyro, cockpit
- **Different pod loadouts**: Weapons, ammo, additional heat sinks, misc equipment
- **Stored separately**: Each variant is a separate MTF file with same `chassis:` but different `model:`

## Data Model Changes

### Equipment Instance Extension

```typescript
interface IMountedEquipmentInstance {
  // Existing fields...

  // NEW: OmniMech pod mounting status
  isOmniPodMounted: boolean;
}
```

### Unit State Extension

```typescript
interface UnitState {
  // Existing fields...

  // NEW: OmniMech-specific state
  isOmni: boolean; // Already exists
  baseChassisHeatSinks: number; // NEW: Fixed heat sinks count
  clanName: string; // NEW: Clan reporting name
}
```

### OmniMech-Specific Interface

The existing `IOmniMech` interface needs implementation:

```typescript
interface IOmniMech extends IBattleMech {
  readonly baseConfiguration: string; // e.g., "Prime", "A", "B"
  readonly clanName: string; // e.g., "Timber Wolf" for Mad Cat
  readonly baseChassisHeatSinks: number; // Fixed heat sinks
  readonly podSpace: Record<MechLocation, number>; // Available pod slots per location
  readonly fixedEquipment: readonly IMountedEquipment[];
  readonly podEquipment: readonly IMountedEquipment[];
}
```

## MTF Format Handling

### New Fields to Parse

```
clanname:Timber Wolf              # Clan reporting name
Base Chassis Heat Sinks:15        # Fixed heat sinks
```

### Equipment Line Parsing

```
Current: "CLERLargeLaser"
OmniMech: "CLERLargeLaser (omnipod)"  # Pod-mounted
OmniMech: "CLERLargeLaser"            # Fixed (no marker)
```

### Config Line Detection

```
Standard:  Config:Biped
OmniMech:  Config:Biped Omnimech
```

## UI Design

### Structure Tab Changes

```
+------------------------------------------+
| Chassis Configuration                     |
+------------------------------------------+
| [ ] OmniMech                              |  <-- NEW: Checkbox
|                                           |
| Base Chassis Heat Sinks: [15 ▼]           |  <-- NEW: Spinner (visible when isOmni)
|                                           |
| [Reset Chassis]                           |  <-- NEW: Button (visible when isOmni)
+------------------------------------------+
```

### OmniMech Checkbox Behavior

When toggled ON:

1. Set `isOmni = true`
2. Show base chassis heat sinks spinner
3. Show reset chassis button
4. Initialize `baseChassisHeatSinks` from engine capacity
5. Mark all non-structural equipment as pod-mounted by default

When toggled OFF:

1. Set `isOmni = false`
2. Hide OmniMech-specific controls
3. Clear `baseChassisHeatSinks`
4. Clear `isOmniPodMounted` from all equipment

### Base Chassis Heat Sinks Spinner

- **Minimum**: 0
- **Maximum**: Engine's weight-free heat sink capacity
- **Default**: Engine capacity (all engine heat sinks are fixed)
- **Effect**: Changes which heat sinks are fixed vs pod-mounted

### Reset Chassis Button

Removes all pod-mounted equipment from the unit:

- Filters equipment by `isOmniPodMounted === true`
- Removes each item from equipment list
- Preserves fixed equipment, armor, structure
- Used when switching from one configuration variant to another

## Equipment Mounting Logic

### canPodMount() Decision Tree

```
canPodMount(unit, equipment):
  1. If unit is not OmniMech → return false
  2. If equipment.isOmniFixedOnly → return false
  3. If equipment is heat sink:
     a. Calculate required fixed heat sinks = engine.freeCapacity - criticalFreeHeatSinks
     b. Count currently fixed heat sinks
     c. Return (fixed count >= required)
  4. Return true (all other equipment can be pod-mounted)
```

### Equipment Categories

| Category           | Can Pod Mount | Notes                                |
| ------------------ | ------------- | ------------------------------------ |
| Weapons            | Yes           | All weapons can be pod-mounted       |
| Ammo               | Yes           | Ammo bins can be pod-mounted         |
| Heat Sinks         | Conditional   | Subject to minimum fixed requirement |
| Engine             | No            | Always fixed                         |
| Gyro               | No            | Always fixed                         |
| Cockpit            | No            | Always fixed                         |
| Structure          | No            | Always fixed                         |
| Armor              | No            | Always fixed                         |
| CASE               | Yes           | Can be pod-mounted                   |
| Targeting Computer | Yes           | Can be pod-mounted                   |
| MASC/TSM           | Varies        | Some enhancements are chassis-fixed  |

## Validation Rules

### OmniMech-Specific Validation

1. **Heat Sink Minimum**
   - Fixed heat sinks >= engine's required minimum
   - Error: "Insufficient base chassis heat sinks"

2. **Pod Equipment Only**
   - When editing OmniMech variant, cannot modify fixed equipment
   - Warning: "Cannot modify fixed equipment on OmniMech variant"

3. **Configuration Consistency**
   - All variants of same chassis must have same base (engine, structure, armor allocation)
   - Note: This is informational only; we don't enforce cross-file consistency

## Migration Path

### Existing Units

- Standard mechs: No changes needed
- OmniMechs imported before this change:
  - `isOmni` already detected from config
  - `baseChassisHeatSinks`: Default to engine capacity
  - `isOmniPodMounted`: Infer from MTF `(omnipod)` markers if re-parsed

### Data Compatibility

- New fields are additive, not breaking
- Units without OmniMech fields are treated as standard mechs
- MTF export adds OmniMech fields only when `isOmni === true`

## Open Questions

1. **Variant Management**: Should MekStation support multi-variant editing (Prime + A + B in same session)?
   - MegaMekLab does NOT support this
   - Recommendation: Single variant per session, like MegaMekLab

2. **Pod Space Visualization**: Should the UI show available pod space per location?
   - MegaMekLab does not show this explicitly
   - Recommendation: Phase 2 enhancement, not initial release

3. **Fixed Equipment Indication**: How to visually distinguish fixed vs pod equipment in critical slots?
   - Options: Different colors, icons, or labels
   - Recommendation: Add "(fixed)" label in equipment tray for fixed items

## References

- MegaMekLab `UnitUtil.java:canPodMount()` - Core pod mounting logic
- MegaMekLab `BMChassisView.java` - OmniMech checkbox and reset button
- MegaMekLab `HeatSinkView.java` - Base chassis heat sink spinner
- MegaMekLab `BMStructureTab.java:omniChanged()` - State change handler
- MM-data OmniMech MTF files - Real-world data examples
