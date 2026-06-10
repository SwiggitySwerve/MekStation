# Proposal: Pin QuadVee Conversion Movement Projection

## Why

QuadVee conversion state changes how the unit interacts with the battlefield. MegaMek treats vehicle-mode QuadVees as tracked or wheeled vehicles, gives them height 0, and disables their jump movement. MekStation already carries runtime conversion state, but the tactical map needs a rules-backed proof that preview highlights and committed movement validation both consume that state instead of continuing to use the import-time Mek movement profile.

## What Changes

- Resolve runtime QuadVee vehicle mode into tracked or wheeled movement, unit height 0, and jump MP 0.
- Add paired tactical-map scenarios showing the same elevation climb is legal in QuadVee Mek mode and blocked in tracked vehicle mode.
- Verify the browser map exposes the changed movement motive, jump-disabled legend state, MP/elevation/heat metadata, and non-color elevation block badge.
- Record the MegaMek QuadVee source pin in the tactical-map rules source matrix.

## Out of Scope

- Full QuadVee conversion actions, conversion MP cost, turn mode, hull-down behavior, and vehicle-mode physical attack restrictions.
- LAM AirMek/Fighter movement-mode dispatch.
- Broad dynamic unit-state replay beyond the tactical-map projection and commit validation path.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: runtime movement capability resolution, tactical-map e2e harness, QuadVee conversion fixture, Playwright smoke coverage
- Tests: runtime capability Jest, movement fixture Jest, targeted Playwright browser smoke
