# Proposal: Pin Occupied Destination Movement Block

## Why

The tactical map can show blocked movement hexes before the player commits a move, but occupied destination blocking needs a browser-visible proof that matches committed movement validation. MegaMek treats ordinary movement into an occupied/stacking-violating hex as illegal; MekStation should expose the same simplified `DestinationOccupied` rejection clearly on the map surface.

## What Changes

- Add a tactical-map browser harness scenario with a selected unit attempting to walk into an occupied adjacent clear hex.
- Render the occupied destination as non-reachable with the shared `DestinationOccupied` reason/details and a non-color `OCC` invalid badge.
- Add fixture parity coverage proving the rendered projection and committed movement validation reject with the same reason, details, MP cost, and heat.
- Record the MegaMek stacking-violation source pin in the tactical-map rules source matrix.

## Out of Scope

- Full MegaMek stacking exceptions for multi-height buildings, friendly/enemy stacking allowances, charge, or death-from-above.
- Changes to pathfinding, movement cost calculation, or committed movement validation behavior.
- New unit selection or collision UI beyond the represented occupied-destination case.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: tactical-map e2e harness, occupied-destination fixture, Playwright smoke coverage
- Tests: focused fixture Jest plus targeted Playwright browser smoke
