# BLK Format Quirks per Unit Type

This document captures the per-type quirks of MegaMek's BLK (Building Block)
file format that the MekStation converter pipeline has to handle. It's a
reference for anyone debugging a BLK import or extending a converter.

> **Source of truth:** `E:\Projects\mm-data\data\mekfiles\` (vehicles,
> aerospace, battlearmor, infantry, protomeks subdirectories).

## Common across all unit types

- Files start with a CC BY-NC-SA 4.0 license comment block (lines beginning
  with `#`). The parser strips comments before tag extraction.
- Tags are XML-style (`<TagName>` / `</TagName>`) but the format is **not**
  valid XML — there is no root element and tag values are usually plain text
  on the line(s) between open/close tags.
- `<UnitType>` drives the per-type dispatcher in `BlkParserService.parseByUnitType`.
  Recognised values: `Tank`, `VTOL`, `Aero`, `ConvFighter`, `SmallCraft`,
  `BattleArmor`, `Infantry`, `ProtoMek`. Anything else is logged + skipped.
- Equipment names are the human-readable MegaMek labels (e.g.
  `IS ER Medium Laser`) **not** the canonical IDs the MTF pipeline produces
  (e.g. `ISERMediumLaser`). The converters reuse `EquipmentNameMapper`
  aliases via `normalize_equipment_id` to resolve to the same internal id.
- Equipment lines may have `(R)` / `(T)` location suffixes for rear-mount /
  turret. Converters preserve these as boolean flags on the equipment entry.

## Vehicles (`Tank` / `VTOL`)

- **Locations:** `Front`, `Right`, `Left`, `Rear`, `Turret`, `Body`. Some
  vehicles have a `Secondary Turret` / `Sponson Turret`; the converter maps
  both to `TURRET_2` / `SPONSON`.
- **Motion type** lives in `<motion_type>` and uses MegaMek strings
  (`Tracked` / `Wheeled` / `Hover` / `VTOL` / `Naval` / `Hydrofoil` /
  `Submarine` / `WiGE` / `Rail` / `Maglev`). Some legacy files use `Leg`
  for a tracked transport — folded into `Tracked`.
- **Engine codes** in `<engine_type>` are numeric (0=Fusion, 1=XL, 2=Light,
  3=Compact, 4=Clan XL, 5=XXL, 6=ICE, 7=Fuel Cell, 8=Fission). Codes 6+
  are vehicle-only and not present in MTF.
- **Filename gotcha (Windows):** chassis can contain `/` (e.g.
  `AC/2 Carrier`). The converter sanitizes filenames with
  `re.sub(r"[\\/:*?\"<>|]", "-", name)` before writing.
- **Skip list:** WarShip / DropShip / JumpShip / LAM / QuadVee / Mobile
  Structure are explicitly skipped with a counted warning; they are Phase 6
  non-goals.

## Aerospace (`Aero` / `ConvFighter` / `SmallCraft`)

- **Locations:** `Nose`, `Right Wing`, `Left Wing`, `Aft`. The converter
  normalises to `NOSE` / `RW` / `LW` / `AFT`.
- **Structural Integrity** lives in `<SI>` (sometimes `<si>`). Max thrust
  is derived from `safe thrust × 1.5` rounded up.
- **Bomb bays:** chassis can declare `<bomb_bays>` slots; each slot can
  carry one bomb of a specified type at runtime. The converter records
  the count, not the loadout.
- **Fuel:** `<fuel>` value is total points; for ConvFighter the converter
  multiplies by the fuel-per-point factor (5).
- The aerospace converter reads from **all subdirectories under
  `mekfiles/`** rather than a single dir, because aerospace BLKs are
  grouped by faction.

## BattleArmor

- **`<Trooper Count>`** is frequently empty in BLKs — the converter falls
  back to `4`. Real squad sizes follow per-faction conventions
  (4 for IS, 5 for Clan, 6 for Star League) but BLKs typically encode this
  via the _number_ of `<Trooper N Equipment>` blocks rather than the
  Trooper Count tag. Parity targets accept the broader range to absorb
  this BLK quirk.
- **Manipulators** are per-arm and can be `Battle Claw`, `Vibro Claw`,
  `Battle Magnetic Claw`, `Cargo Lifter`, `Drill`, etc. Stored as
  `armManipulators: { left, right }`.
- **Modular weapon mounts** appear as `<Mount> Modular Weapon Mount`
  entries. The converter exposes them as a count plus the linked
  installable weapon, if specified.
- Squad-level abilities (e.g. `SwarmMek`, `LegAttack`) appear as
  unlocated equipment lines with no location suffix.

## Infantry

- **Composition** is `squadCount × squadSize` (e.g. 4 squads × 7 troopers
  = 28-trooper platoon). `<Trooper Count>` overrides squadSize when present.
- **Motive type** in `<motion_type>`: `Foot` / `Jump` / `Motorized` /
  `Mechanized Wheeled` / `Mechanized Tracked` / `Mechanized Hover` /
  `Beast Mounted` / etc.
- **Primary/secondary weapons** are referenced by name in
  `<primaryW>` / `<secondaryW>`. The converter resolves these against the
  infantry-weapon catalog separately from per-trooper equipment.
- **Field guns** appear as standard vehicle weapons in the equipment list,
  and the converter tags them with `isFieldGun: true`.
- **Specialization** (e.g. `Mountain`, `Marine`, `Anti-Mek`) lives in
  `<specialization>` and unlocks special movement / combat rules.

## ProtoMech

- **5-location armor:** `<armor>` is a single integer = armor per trooper
  (in BLK terms, the proto's full armor value). Locations are
  `Head`, `Torso`, `Right Arm`, `Left Arm`, `Legs`. Optional `Main Gun`
  for proto chassis with a heavy weapon mount.
- **Motion type:** `Biped`, `Quad`, `Glider`, `UMU` (underwater), `WiGE`.
  Glider mode bumps movement to the air mover regime.
- **`<jumpingMP>`** doubles as glider MP for glider chassis.
- **`<interface_cockpit>`** is a flag for proto chassis with an interface
  cockpit (rare).
- **Weight class:** standard 2–9 tons; **Ultraheavy** (10–15 tons) is
  flagged via the chassis name suffix `Ultraheavy ProtoMech`.

## Equipment ID Alias Reuse

All converters call `normalize_equipment_id(name)` from `enum_mappings.py`
to produce stable lower-kebab IDs. The same helper backs the MTF pipeline,
so BLK and MTF outputs share the same equipment catalog vocabulary.

When the BLK label diverges from the MTF id (e.g. `IS ER Medium Laser` vs
`ISERMediumLaser`), the alias table in
`src/services/conversion/EquipmentNameResolverData.ts` provides the
forward mapping. Converters fall back to the normalised name when no
alias exists, and the parity report flags any unknown weapon strings.

## Parity Validation

Each converter runs a minimum-viable parity sweep at the end:

1. Build a manifest entry per converted unit.
2. Index by lowercased chassis.
3. For each canonical fixture in `PARITY_TARGETS`, assert the key field
   (tonnage, squad size, etc.) falls within the expected range.
4. Exit non-zero on any failure (so CI fails the build).
5. Persist the run-log to `validation-output/blk-<type>-run-log.json`.

Each type's `PARITY_TARGETS` list contains 10 canonical fixtures sourced
from the MUL (Master Unit List). Adding new fixtures requires verifying
the expected values against a real MUL entry.
