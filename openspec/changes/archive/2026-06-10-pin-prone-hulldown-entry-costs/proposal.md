# Pin Prone Hull-Down Entry Costs

## Why

The hull-down source matrix still listed prone-to-hull-down entry as an
unresolved movement gap. MegaMek's `HullDownStep` handles that branch
separately from standing entry: a prone Mek starts at 1 MP, adds non-hip leg
actuator crits, adds hip crits separately, and makes destroyed support
locations effectively impossible by adding 99 MP.

## What Changes

- Preserve actuator critical damage by combat location when the critical hit
  resolver has source location data.
- Allow prone Mek-style units to commit the Hull Down command as a same-hex
  walking posture action.
- Price prone hull-down entry at 1 MP plus represented per-location non-hip
  leg actuator and hip crit costs.
- Reject prone entry when a required biped/quad support location is destroyed,
  with the same 99 MP impossible-cost evidence carried on the invalid event.

## Out Of Scope

- Vehicle and QuadVee fortified-hex side-table behavior.
- Full QuadVee vehicle-mode hull-down support.
- Punch/club hull-down hit-table selection beyond the existing punch/kick
  table representation.
