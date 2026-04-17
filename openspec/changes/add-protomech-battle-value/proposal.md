# Change: Add ProtoMech Battle Value

## Why

ProtoMechs are costed in forces by point (typically 5 units); getting BV right matters for scenario balance even at low play rates. Currently BV returns 0. This change adds ProtoMech BV 2.0 per TechManual using the mech formula adapted to proto scale. Existing spec flagged "detailed BV calculation beyond simplified formula" as out of scope — this change promotes it to full scope, consistent with BA.

## What Changes

- Add defensive BV = armor BV + structure BV + defensive equipment BV + speed factor
- Add offensive BV = weapon BV + ammo BV + main gun BV + physical bonus
- Add speed factor using `mp = walkMP + round(jumpMP / 2)` similar to mechs
- Add proto-specific multipliers: Glider 0.9× (lower durability), Ultraheavy 1.15× (heavy)
- Add main gun treated as full BV weapon, same multiplier as mech weapons
- Add point-composition metadata: BV stored per proto and summed when part of a point
- Add pilot skill multiplier from shared table
- Expose breakdown on unit
- Add parity harness vs canonical proto BV

## Non-goals

- Per-point combat BV aggregation (individual protos still fight as units; point is a command/admin construct)

## Dependencies

- **Requires**: `add-protomech-construction`, `battle-value-system`
- **Blocks**: `add-protomech-combat-behavior`

## Impact

- **Affected specs**: `battle-value-system` (MODIFIED — proto path), `protomech-unit-system` (MODIFIED — remove simplified-BV scope exclusion; ADDED breakdown)
- **Affected code**: `src/utils/construction/protomech/protoMechBV.ts` (new), dispatch in `battleValueCalculations.ts`
- **Validation target**: ≥ 90% within 5% vs canonical protos
