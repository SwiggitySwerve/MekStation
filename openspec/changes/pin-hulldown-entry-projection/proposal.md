# Pin Hull-Down Entry Projection

## Why

The tactical map follow-up audits still list entering hull-down as an
unresolved movement gap. MegaMek represents this as a dedicated `HULL_DOWN`
movement step: a standing Mek-style unit spends 2 MP, stays in its current
hex/facing, clears prone, and sets hull-down.

## What Changes

- Add a movement-phase Hull Down command for standing Mek-style units.
- Commit the action as a same-hex walking `MovementDeclared` event with
  `hullDownEntryAttempt`, 2 MP, walking heat, and a `hullDown` movement step.
- Replay that declaration by setting hull-down, clearing prone, and locking
  movement without emitting a stand-up PSR or `UnitStood` event.
- Reject already-prone, already-hull-down, non-Mek-style, insufficient-MP, and
  destroyed-gyro attempts before posture state changes.

## Out Of Scope

- Prone-to-hull-down entry with actuator/hip location-cost handling.
- Vehicle and QuadVee fortified-hex side-table behavior.
- Session option UX for enabling or disabling TacOps hull-down globally; this
  follows the repo's existing represented hull-down action model.
- Broader MegaMek oracle sweeps for every hull-down posture branch.
