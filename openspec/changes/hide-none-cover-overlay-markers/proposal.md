## Why

The tactical-map interface spec says the cover overlay should show no indicator
for hexes with no cover, but the map currently renders gray `NONE` badges for
clear/no-cover hexes. That adds visual noise to the battlefield and makes actual
partial/full cover harder to scan.

## What Changes

- Stop rendering cover overlay markers for `CoverLevel.None`.
- Keep partial and full cover markers unchanged, including terrain/elevation
  source metadata.
- Update focused map overlay coverage to assert no-cover hexes stay visually
  quiet when the cover overlay is enabled.

## Non-Goals

- Change cover calculation rules.
- Change movement-cost overlays or combat cover modifiers.
- Change partial/full cover marker shape, metadata, or placement.
