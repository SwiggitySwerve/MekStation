# Proposal: Project Isometric Target Boosts From Combat Projection

## Why

Isometric mode uses foreground boosts and visibility halos to keep important
units readable when terrain stacks would otherwise hide them. That visibility
chrome still has a legacy path that can read `IUnitToken.isValidTarget`
directly, even when weapon-backed combat projection is active. A stale token
flag can therefore pull an unrelated unit forward in the isometric scene after
the shared combat projection has rejected it as a valid target.

## What Changes

- Reuse combat-projected valid-target ids when deciding whether legacy
  valid-target chrome should foreground a unit in isometric mode.
- Preserve selected-unit, terrain-occlusion, and combat-target readability
  boosts.
- Preserve `IUnitToken.isValidTarget` as the fallback when no configured weapon
  projection data exists.

## Out of Scope

- Changing isometric terrain occluder detection or scene depth math.
- Removing combat-target readability boosts for blocked-but-relevant target
  hexes.
- Changing weapon range, firing arc, LOS, or attack validation rules.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: `src/components/gameplay/HexMapDisplay/HexMapDisplay.stateHooks.ts`
  and state wiring
- Tests: focused isometric render coverage for projection-active suppression
  and legacy fallback
