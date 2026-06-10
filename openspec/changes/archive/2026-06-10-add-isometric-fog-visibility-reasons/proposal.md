# Proposal: Add Isometric Fog Visibility Reasons

## Why

Isometric mode already boosts units that may be hidden behind elevated terrain and marks that case with an `ELEV` reason. Fogged and last-known contacts are different: visibility rules, not terrain geometry, limit inspection. The map currently relies on the generic fog marker, which can blur whether the player is dealing with elevation occlusion or tactical visibility/fog of war.

The isometric view should communicate visibility-rule limits explicitly while preserving the existing terrain occlusion halo behavior.

## What Changes

- Add isometric-only visibility-rule metadata for hidden and last-known contacts.
- Render compact `FOG` and `LAST` badges on fog-limited contacts in isometric mode.
- Keep terrain/elevation occlusion indicators separate from fog-rule indicators.
- Preserve existing top-down fog markers and existing isometric elevation halos.

## Out of Scope

- Changing sensor, LOS, or fog-of-war legality.
- Making hidden contacts selectable when rules currently disallow it.
- Reworking the full fog-of-war model.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: `src/components/gameplay/HexMapDisplay/*`, `src/components/gameplay/UnitToken/*`
- Tests: focused render coverage for hidden and last-known isometric contacts
