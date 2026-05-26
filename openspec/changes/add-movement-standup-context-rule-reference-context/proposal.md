# Add Movement Stand-Up Context Rule Reference Context

## Why

Stand-up movement rows explain prone-unit movement cost and PSR risk before the
player commits. They should carry movement projection source and rule
references just like other tactical explanation rows, especially because
stand-up can consume MP, fail a PSR, or make a destination impossible.

## What Changes

- Surface movement projection source and rule references on stand-up cost,
  stand-up PSR, and stand-up modifier rows.
- Add a stand-up-specific MegaMek movement source reference when a movement
  projection contains stand-up context.
- Expose stable attributes for stand-up mode, cost, PSR requirement, PSR reason,
  target number, modifier, impossible reason, and modifier details when
  represented.
- Apply the same stand-up context rows to movement-only and combined
  movement+combat tactical hovers.

## Out Of Scope

- Changing stand-up MP cost, PSR target computation, modifier computation,
  movement reachability, commit validation, or movement resolution.
