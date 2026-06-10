# Pin Hull-Down Movement Exit Projection

## Why

The tactical map follow-up audit still listed hull-down entry/exit movement as
an unresolved rules-trust boundary. Combat restrictions and target cover are
already source-backed, but movement highlights and commits did not yet model
MegaMek's Mek-style `GET_UP` posture step for leaving hull-down before ground
movement.

## What Changes

- Project Mek-style hull-down ground movement with the same `GET_UP` MP
  reservation used by MegaMek (`GetUpStep` cost: 2 MP, or 1 MP for units with
  only 1 run MP).
- Surface hull-down exit cost on movement hex metadata, labels, badges, and
  hover context so players can understand why available range shrinks.
- Clear hull-down state only through a committed movement declaration that
  records `hullDownExitAttempt`, keeping replay and engine state aligned.
- Gate direct jump attempts from hull-down until the unit first exits the
  posture, matching MegaMek's hull-down movement-state restrictions.

## Out Of Scope

- Entering hull-down from the movement UI.
- Going prone from hull-down.
- Vehicle and QuadVee fortified-hex side-table behavior.
- Broader MegaMek oracle sweeps for every hull-down posture branch.
