# Document Critical Slot Assignment Workflow

## Summary

Document the existing critical slot assignment and unassignment workflows to establish clear specifications for how equipment is placed into and removed from critical slots.

## Problem Statement

The critical slot assignment system has multiple pathways for both assignment and unassignment, but these are not formally specified. This creates ambiguity about:

- Which UI interactions trigger assignment vs unassignment
- What validations are performed at each step
- How fixed slots, location restrictions, and contiguous slot requirements interact

## Current Implementation Analysis

### Assignment Methods

1. **Click-to-Assign (Critical Slots Tab)**
   - User selects equipment in loadout tray
   - User clicks on empty slot in critical slots grid
   - Equipment assigned to clicked slot + consecutive slots based on `criticalSlots` count
   - Selection cleared after assignment

2. **Quick Assign (Context Menu)**
   - User right-clicks unallocated equipment in loadout tray
   - Context menu shows valid locations with available slot counts
   - Clicking location auto-assigns to first available contiguous range
   - Validates location restrictions (e.g., jump jets → torsos/legs only)

3. **Drag-and-Drop (Planned)**
   - Drag equipment from loadout tray onto empty slot
   - Similar to click-to-assign but with drag interaction

### Unassignment Methods

1. **Double-Click on Slot**
   - Double-click equipment in critical slots grid
   - Clears `location` and `slots` fields
   - Equipment returns to "Unallocated" section

2. **Right-Click Context Menu on Slot**
   - Right-click equipment in critical slots grid
   - Shows "Unassign" option
   - Same effect as double-click

3. **Unassign Button in Loadout Tray**
   - Allocated equipment shows ↩ button on hover
   - Clicking clears location assignment

4. **Reset All**
   - Toolbar "Reset" button clears ALL equipment locations
   - Returns all equipment to unallocated state

### Key Validations

- **Fixed Slots**: System components (actuators, engine, gyro, sensors) occupy fixed slots that cannot be assigned
- **Location Restrictions**: Equipment types may be restricted to certain locations (e.g., jump jets → TORSO_OR_LEG)
- **Contiguous Slots**: Multi-slot equipment must occupy consecutive slot indices
- **Available Space**: Must have enough contiguous empty slots for equipment

## Proposed Spec Updates

- Update `critical-slot-allocation` spec with assignment/unassignment scenarios
- Update `equipment-tray` spec with context menu and unassign interactions
- Add scenarios for validation behaviors

## Impact

- Documentation only - no code changes required
- Establishes baseline for future enhancements

## Files Affected

- `openspec/specs/critical-slot-allocation/spec.md`
- `openspec/specs/equipment-tray/spec.md`
