## Context

`HexMapDisplay` currently derives a `tacticalMapProjectionLookup` internally from terrain, movement range, combat range, highlighted path, and legacy attack range inputs. Individual hexes already consume that lookup and expose projection status, movement cost, blocked reasons, LOS blocker references, source references, and explanation data attributes. The remaining architectural gap is that callers cannot pass the shared projection frame as the primary data contract, so drift between engine projection and UI-derived fallback can be hidden.

## Goals / Non-Goals

**Goals:**
- Add a typed projection frame boundary that carries the lookup plus source metadata.
- Prefer supplied shared projection frames over locally-derived fallback projections.
- Expose frame source and coverage diagnostics for QC and automated tests.
- Keep the existing public props working while identifying them as fallback-derived projection input.

**Non-Goals:**
- Rewrite movement or combat validation engines.
- Remove legacy props in this wave.
- Expand official rules catalog coverage beyond the projection contract.

## Decisions

1. **Use an explicit projection frame object instead of a bare lookup.**
   - A bare lookup would let the UI render from shared data, but it would not prove where the data came from or whether it covers the rendered map.
   - The frame records `source`, `lookup`, and optional metadata so tests and QC can distinguish `shared-engine-projection` from `hex-map-derived-fallback`.

2. **Fallback remains local and backward-compatible.**
   - Existing callers pass `movementRange`, `attackRange`, terrain, and combat options. Removing those in one wave would be noisy and risky.
   - The fallback path keeps behavior stable while exposing provenance attributes that make future migration measurable.

3. **Coverage warnings are diagnostics, not runtime exceptions.**
   - Throwing on missing hexes would make partial test fixtures and future progressive rendering brittle.
   - Diagnostics on the map container provide a testable and user-debuggable signal without interrupting gameplay.

4. **Hex rendering continues to consume `ITacticalMapHexProjection`.**
   - The existing per-hex projection shape already carries terrain, movement, combat, LOS blocker references, statuses, blocked reasons, and explanation text.
   - This wave strengthens the boundary around that shape instead of introducing a parallel projection model.

## Risks / Trade-offs

- **Risk:** Callers may keep using fallback inputs indefinitely. -> **Mitigation:** expose `data-tactical-projection-frame-source` so QC and journey tests can require shared frames in specific flows later.
- **Risk:** A supplied frame may omit hexes. -> **Mitigation:** compute missing rendered hex keys and expose them as diagnostics.
- **Risk:** Duplicate data paths can confuse maintainers. -> **Mitigation:** document fallback as compatibility-only and add tests that prove shared frames take precedence.

## Migration Plan

1. Introduce projection frame types and optional `HexMapDisplay` prop.
2. Wrap the existing local derivation in a fallback frame.
3. Prefer supplied frames and add provenance/coverage attributes.
4. Add focused tests for shared-frame precedence and missing-hex diagnostics.
5. Later waves can update higher-level tactical game surfaces to provide shared-engine frames directly and make QC require that source.

## Open Questions

- Which top-level gameplay page should be the first mandatory shared-frame caller in a later browser-backed journey wave?
