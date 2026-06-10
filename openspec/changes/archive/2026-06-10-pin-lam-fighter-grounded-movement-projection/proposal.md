# Proposal: Pin Grounded LAM Fighter Movement Projection

## Why

LAM Fighter conversion is not the same movement profile as Mek or AirMek conversion. MegaMek derives Fighter cruise/flank MP from current thrust, halves thrust while the Fighter is grounded, disables flanking for grounded aerospace movement, uses grounded aerospace terrain prohibitions, and reports height 0 outside Mek mode. MekStation needs the tactical map to explain that grounded conversion state before a player commits movement.

## What Changes

- Resolve represented grounded LAM Fighter conversion state into wheeled/taxing-aerospace motive, height 0, no jump movement, and grounded Fighter cruise/flank MP.
- Add a tactical-map fixture proving a grounded Fighter cannot enter an abrupt level-2 elevation change.
- Prove the browser projection and committed movement validation reject the same destination with matching reason, MP, heat, and legend metadata.
- Record the MegaMek LAM Fighter source pin in the tactical-map rules source matrix.

## Out Of Scope

- Airborne aerodyne turn/velocity pathing, takeoff/landing sequencing, control rolls, conversion action timing, and AirMek ground-clearance submodes.
- New player-facing conversion controls.

## Impact

- Affected code: runtime movement capability resolution, LAM tactical-map fixture, e2e tactical-map harness, Playwright smoke coverage
- Affected docs: tactical-map rules source matrix
