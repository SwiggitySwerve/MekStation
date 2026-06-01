# Proposal: Add Combat Projection Explanation Details

## Why

The tactical map now builds a shared per-hex projection that combines terrain, movement, and combat state. Individual combat badges already expose arc, target visibility, cover, minimum range, to-hit, and indirect-fire facts, but the projection-level explanation remains much thinner: range and LOS only.

The projection explanation feeds the projection badge/title and machine-readable hex metadata, so it should summarize the same rules-backed combat facts the player needs before committing an attack.

## What Changes

- Enrich `ITacticalMapHexProjection.explanation` for combat projections.
- Include firing arc, target visibility, target ids, available weapons, cover modifiers, minimum-range penalties, to-hit preview, and indirect-fire reason when present.
- Preserve existing movement/terrain explanation content.

## Out of Scope

- Changing combat legality or to-hit calculation.
- Changing badge placement or hover tooltip layout.
- Removing legacy attack-range fallback.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: `src/utils/gameplay/tacticalMapProjection.ts`
- Tests: focused projection-unit and HexMapDisplay metadata coverage
