# Design: Tactical Map Projection Status Badges

## Approach

Add a tiny SVG badge component colocated with the existing `HexCell` badge modules. It consumes only the shared tactical projection fields already passed into `HexCell`; it does not inspect movement or combat structures directly and does not re-derive legality.

The badge renders only when the projection status is `mixed` or `blocked`. Legal movement and legal combat already have dedicated movement/range badges, while neutral terrain hexes should remain uncluttered.

## Placement

Render the projection status badge in the upper-left corner of the hex, offset from the centered elevation badge and path badge. Keep it pointer-events disabled and use a compact 12px-high badge matching existing badge proportions.

## Metadata

The rendered badge exposes:

- `data-projection-status-badge-status`
- `data-projection-status-badge-intent`
- `data-projection-status-badge-reasons`
- `data-projection-status-badge-explanation`

## Verification

Use a map render test where a selected unit can move to a hex containing an enemy, but selected weapons are out of range. The unified projection should classify the hex as `movement-combat` + `mixed`, preserve the combat blocked reason, and render a `MIX` badge.
