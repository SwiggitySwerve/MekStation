# Proposal: Pin LAM AirMek Movement Heat Projection

## Why

LAM AirMek conversion does not use ordinary Mek walk/run heat. MegaMek routes AirMek VTOL walk/run heat through `getAirMekHeat()`, which derives heat from the movement points used divided by three. MekStation already projects AirMek MP and terrain behavior, but long AirMek movement previews still need source-backed heat so the tactical map and committed movement agree on heat impact.

## What Changes

- Add a represented AirMek movement heat profile for LAM AirMek runtime conversion.
- Project AirMek walk/run heat from used movement points instead of generic Mek walk/run constants.
- Add a long AirMek tactical-map fixture proving preview and committed validation agree on MP, path, and generated heat.
- Record the MegaMek AirMek heat source pin in the tactical-map rules source matrix.

## Out Of Scope

- Damaged coolant system heat adders, improved/prototype/disposable jump-jet heat variants, partial wing heat reduction, and AirMek conversion action timing.
- Airborne aerodyne Fighter pathing.

## Impact

- Affected code: movement heat calculation, runtime movement capability resolution, LAM tactical-map fixture, e2e tactical-map harness, Playwright smoke coverage
- Affected docs: tactical-map rules source matrix
