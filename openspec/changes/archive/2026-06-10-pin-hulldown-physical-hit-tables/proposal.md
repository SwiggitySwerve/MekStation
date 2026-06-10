# Pin Hull-Down Physical Hit Tables

## Why

MekStation already blocked hull-down kicks and projected hull-down target
weapon cover, but physical damage still treated hull-down punches and
Mek-style melee weapon attacks as ordinary punch-table hits. MegaMek has
explicit hit-table branches for these physical attacks, so the map forecast,
declaration payload, and resolver need to agree before the player commits.

## What Changes

- Source-pin hull-down punch and club/melee hit-table selection to MegaMek
  `PunchAttackAction` and `ClubAttackAction`.
- Preserve the chosen physical hit table on `PhysicalAttackDeclared` so
  target-specific projection context is still authoritative when physical
  attacks resolve later in the phase.
- Keep physical option rows, forecast damage, declaration payloads, and
  resolved hit locations aligned for representative hull-down physical attacks.

## Out Of Scope

- Full vehicle/QuadVee fortified-side-table handling.
- General physical side-table selection for non-hull-down normal hit tables.
- New physical attack types beyond the represented punch/kick/club families.
