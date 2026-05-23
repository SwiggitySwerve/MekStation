# Proposal: Add Movement Legend Capability Metadata

## Why

The on-map MP legend identifies Walk, Run, and Jump overlay colors, but it does
not expose the selected unit's motive mode or the effective MP values that were
used to derive the visible movement range. This is especially thin for vehicle,
hover, VTOL, UMU, and other non-mech movement modes where "walk" and "run" are
declaration types but the actual motive profile affects terrain/elevation rules.

The tactical map should let players understand how the current overlay was
computed without opening a separate panel.

## What Changes

- Extend the map MP legend state with motive mode plus effective walk/run/jump
  MP values.
- Render the motive mode and MP values in the on-map legend with accessible
  metadata.
- Preserve existing active/inactive and disabled jump states.

## Out of Scope

- Changing movement reachability, terrain costs, heat, or movement legality.
- Adding new movement modes.
- Changing the movement type switcher buttons.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: movement planning legend state and `HexMapDisplay` MP legend
- Tests: focused render/planning coverage
