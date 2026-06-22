## Why

The tactical map is already rich enough to explain movement, combat, LOS, terrain, elevation, overlays, and invalid reasons, but its public component boundary still accepts those channels as separate legacy inputs. Wave 7 makes the shared tactical projection data an explicit UI contract so previews can be proven to match the engine-facing projection surface before players commit actions.

## What Changes

- Add an explicit tactical projection frame input for `HexMapDisplay` so callers can provide the shared projection lookup directly.
- Preserve the current locally-derived projection path as a compatibility fallback, but mark its source so QC and tests can distinguish it from supplied shared projection data.
- Surface projection frame provenance, coverage, and missing-hex diagnostics on the map container/layer.
- Lock the behavior with tests that prove rendered hexes, hover context, overlays, and invalid reasons are driven by the shared projection frame.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `tactical-map-interface`: the tactical map projection layer becomes an explicit component contract with provenance and coverage diagnostics.

## Impact

- Affected UI: `src/components/gameplay/HexMapDisplay/*`.
- Affected shared projection types: `src/utils/gameplay/tacticalMapProjection*`.
- Affected tests: HexMapDisplay projection tests and tactical projection unit tests.
- No external dependencies, persistence migrations, or BattleTech rules data changes.

## Non-goals

- This change does not complete every remaining BattleTech movement/combat rules gap.
- This change does not replace the existing movement agreement suite or combat validation catalog.
- This change does not remove legacy `movementRange` / `attackRange` props; it makes their fallback status explicit.
