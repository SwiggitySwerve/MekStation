# Proposal: Add Unit Token State Metadata

## Why

The tactical map increasingly explains terrain, movement, combat, LOS, and projection state at the hex level, but rendered unit token wrappers still expose only generic identity and fog/isometric flags. Players and tests need the token layer to be inspectable too: unit type, displayed map position, source position, facing, and type-specific state like aerospace altitude and velocity should be available without reverse-engineering the child SVG.

## What Changes

- Add unit type, displayed map position, source position, and facing metadata to rendered unit token wrappers.
- Add mounted host metadata for battle armor passenger badges.
- Add aerospace altitude and velocity metadata to aerospace token wrappers when present.
- Preserve displayed map position, source position, facing, and unit type on
  isometric scene token wrappers.
- Preserve aerospace altitude and velocity metadata on isometric scene token
  wrappers so depth-sorted 2.5D projection remains inspectable.
- Include the same state in token accessible labels.
- Preserve token visuals, movement animation behavior, fog behavior, and click handling.

## Out of Scope

- Changing unit movement, combat, fog, or isometric occlusion rules.
- Wiring new aerospace velocity state into the engine.
- Changing token silhouettes, badges, or animation paths.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: `src/components/gameplay/UnitToken/UnitTokenForType.tsx`,
  `src/components/gameplay/HexMapDisplay/HexMapDisplay.tsx`
- Tests: focused UnitTokenForType wrapper metadata coverage plus isometric
  HexMapDisplay/browser coverage
