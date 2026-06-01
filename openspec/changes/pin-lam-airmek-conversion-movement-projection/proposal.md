# Proposal: Pin LAM AirMek Conversion Movement Projection

## Why

LAM conversion state changes the movement profile the map must explain. MegaMek treats AirMek conversion as WiGE-style movement, derives AirMek cruise/flank MP from jump MP, and reports height 0 outside Mek mode. MekStation already carries runtime conversion state, but the tactical map needs a rules-backed proof that an imported Mek-mode LAM can change its preview and commit legality when runtime state changes to AirMek.

## What Changes

- Resolve runtime LAM AirMek conversion state into WiGE motive, height 0, and AirMek cruise/flank MP.
- Add paired tactical-map fixtures showing the same elevation route blocked in Mek mode and legal in AirMek mode.
- Prove preview and committed movement validation agree for both conversion states.
- Record the MegaMek LAM source pin in the tactical-map rules source matrix.

## Out Of Scope

- Full LAM conversion action timing, AirMek ground-clearance submodes, Fighter/aerodyne mode, turn mode, and special LAM landing/control-roll behavior.
- New player-facing conversion controls.

## Impact

- Affected code: runtime movement capability resolution, tactical-map e2e harness, LAM conversion fixture, Playwright smoke coverage
- Affected docs: tactical-map rules source matrix
