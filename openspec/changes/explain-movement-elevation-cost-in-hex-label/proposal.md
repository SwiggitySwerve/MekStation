# Proposal: Explain Movement Elevation Cost In Hex Label

## Why

Movement projection already carries terrain cost, elevation delta, and elevation
MP cost for reachable and blocked destination hexes. The map exposes the
elevation cost through data attributes, movement badges, and tooltips, but the
primary hex label only included elevation delta.

That leaves the main top-down/isometric cell explanation one step short of the
goal: a player inspecting a destination should see not just that the elevation
changed, but also how much MP that elevation change costs.

## What Changes

- Include movement elevation MP cost in the hex-level movement explanation when
  movement projection supplies it.
- Preserve the existing terrain cost, elevation delta, heat, stand-up, and
  blocked/invalid reason wording.
- Add focused terrain-label coverage that proves stacked tactical overlays still
  expose terrain cost, elevation delta, elevation cost, and heat in the cell
  label.

## Out of Scope

- Changing movement reachability or MP pricing rules.
- Changing badge rendering or tooltip rows.
- Adding new movement modes or terrain types.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code:
  `src/components/gameplay/HexMapDisplay/HexCell.labels.tsx`,
  `src/components/gameplay/HexMapDisplay/__tests__/HexMapDisplay.terrainLabels.test.tsx`
- Tests: focused HexMapDisplay terrain/elevation label coverage
