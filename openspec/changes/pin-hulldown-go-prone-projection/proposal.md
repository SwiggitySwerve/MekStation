# Pin Hull-Down Go-Prone Projection

## Why

The tactical map follow-up audits still grouped hull-down entry and go-prone
actions together as unresolved rules-trust gaps. MegaMek makes the narrow
`GO_PRONE` branch explicit: a Mek-style unit that is already hull-down may go
prone for 0 MP, clearing hull-down and setting prone without a stand-up PSR.

## What Changes

- Add a movement-phase Go Prone command for standing hull-down Mek-style units.
- Commit the action as a same-hex stationary `MovementDeclared` event with
  `goProneAttempt`, 0 MP, 0 heat, and a `goProne` movement step.
- Replay that declaration by setting the unit prone and clearing hull-down
  before locking movement.
- Reject the command for already-prone units, non-hull-down units, and
  represented vehicle/non-Mek-style movement profiles.

## Out Of Scope

- Entering hull-down from the movement UI.
- Normal standing-to-prone movement outside the hull-down branch.
- Vehicle and QuadVee fortified-hex side-table behavior.
- Broader MegaMek oracle sweeps for every hull-down posture branch.
