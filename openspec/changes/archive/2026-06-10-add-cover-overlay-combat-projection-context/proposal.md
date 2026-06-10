# Change: Add Cover Overlay Combat Projection Context

## Why

The cover overlay already identifies terrain/elevation cover markers, but
attack preview uses a richer shared combat projection for true target-cover
effects such as horizontal building/elevation cover and target-specific
partial-cover modifiers. The overlay should expose that projection context so a
player can inspect whether the attack resolver will actually apply cover.

## What Changes

- Pass the shared combat projection lookup into cover overlay markers.
- Render a cover marker when combat projection reports target-cover even if the
  target hex itself has no terrain-cover marker.
- Expose projected cover level, modifier, partial-cover state, reason, target
  ids, and projection explanation on cover overlay markers.
- Keep terrain/elevation cover metadata and existing shield visuals intact.

## Non-Goals

- Change target-cover rules, LOS classification, terrain properties, or attack
  resolution.
- Redesign the visible cover marker shape or map controls.
