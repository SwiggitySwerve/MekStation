## Why

Journey QC can now prove the core MekStation flows from the command line, but the gameplay UI does not yet expose a single operator view that connects those same validated journeys across campaign, contract, encounter, tactical combat, post-combat, repair, salvage, economy, and time surfaces. Wave 6 needs a thin UI shell so players and GMs can launch or inspect the same top-level scenarios that automated QC already validates.

## What Changes

- Add a gameplay flow shell that renders the major player and GM routes in the same order as the end-to-end journey model.
- Add a typed UI flow registry that maps each required journey QC ID to gameplay routes, modules, default QC commands, and GM/player inspection intent.
- Add drift validation so journey catalog, validation graph, and UI flow registry cannot disagree silently.
- Surface the flow shell from the gameplay hub without replacing existing quick game, campaign, encounter, force, pilot, game, or multiplayer pages.
- Document the UI flow shell in the journey QC docs.

## Non-goals

- Do not implement new campaign, combat, repair, salvage, economy, or time mechanics.
- Do not replace the existing journey runner or evidence bundle format.
- Do not make browser-backed journey execution mandatory for every journey in this wave.
- Do not add GM ledger behaviors beyond linking to the already available review/intervention routes.

## Capabilities

### New Capabilities

- `ui-flow-shell`: Gameplay UI flow mapping and inspection surface for journey-backed player and GM scenarios.

### Modified Capabilities

- `journey-qc`: Adds a requirement that required journey IDs remain mapped to UI flow shell entries.

## Impact

- Gameplay hub UI and any new flow-shell components under `src/components/gameplay`.
- Journey QC docs and validation scripts under `docs/qc` and `scripts/qc`.
- Unit/script tests that prove required journey IDs, graph nodes, and UI flow mappings stay aligned.
- No new runtime dependency or database migration.
