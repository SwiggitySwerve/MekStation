# record-sheet-export Delta — add-templated-infantry-battlearmor-record-sheets

## ADDED Requirements

### Requirement: Infantry and Battle Armor Record Sheet Adapters

The system SHALL provide one adapter folder per Wave-2 family
(`infantry/`, `battlearmor/`) under
`src/services/printing/svgRecordSheetRenderer/`, each containing two
pure modules: `selectTemplate.ts` and `bindings.ts`, mirroring the
Wave-1 per-family adapters.

`selectTemplate.ts` SHALL be a pure function mapping a unit to a
`templateKey` string. For the single-unit MVP it SHALL return the
**per-unit block** template key — `conventional_infantry_platoon` for
an infantry platoon and `battle_armor_squad` for a Battle Armor squad
— and SHALL NOT return the multi-slot outer sheet key
(`conventional_infantry_default` / `battle_armor_default`).

`bindings.ts` SHALL be a pure function mapping the unit's
`IRecordSheetData` variant (`IInfantryRecordSheetData` /
`IBattleArmorRecordSheetData`) to a `{ texts, pips }` structure keyed
against the template's real element IDs, including a typed per-family
`PipCounts` contract computed from unit stats.

Neither adapter module SHALL perform I/O, DOM access, or asset
loading — they SHALL be deterministic pure functions.

**Priority**: Critical

#### Scenario: Infantry template key selects the per-unit platoon block

- **GIVEN** a conventional infantry platoon
- **WHEN** the infantry `selectTemplate` runs
- **THEN** it SHALL return the key `conventional_infantry_platoon`, the
  per-unit block template, NOT the multi-slot
  `conventional_infantry_default` outer sheet

#### Scenario: Battle Armor template key selects the per-unit squad block

- **GIVEN** a Battle Armor squad
- **WHEN** the battlearmor `selectTemplate` runs
- **THEN** it SHALL return the key `battle_armor_squad`, the per-unit
  block template, NOT the multi-slot `battle_armor_default` outer sheet

#### Scenario: Battle Armor bindings produce a typed PipCounts contract

- **GIVEN** a Battle Armor `IRecordSheetData` with a per-trooper armor
  pip count for each suit in the squad
- **WHEN** the battlearmor `bindings` function runs
- **THEN** the returned `pips` SHALL include a typed `PipCounts`
  structure whose per-trooper counts equal each trooper's actual armor
  pip value

#### Scenario: Infantry bindings produce a typed PipCounts contract

- **GIVEN** an infantry `IRecordSheetData` with a platoon size
- **WHEN** the infantry `bindings` function runs
- **THEN** the returned `pips` SHALL include a typed `PipCounts`
  structure whose platoon pip-grid count equals the platoon's actual
  trooper count

#### Scenario: Adapters are pure functions

- **GIVEN** the `infantry/` and `battlearmor/` adapter modules
- **WHEN** `selectTemplate` or `bindings` is invoked
- **THEN** it SHALL perform no fetch, no DOM access, and no asset
  loading, and SHALL return a deterministic result for a given input

---

### Requirement: Battle Armor Per-Trooper Pip Grid

The shared pip engine SHALL support a Battle Armor per-trooper pip
grid: a layout that places one armor pip cluster per trooper column
across the 4–6 trooper columns of a Battle Armor squad, each cluster
sized to that trooper's per-suit armor pip count.

This is an extension of the Wave-1 pip engine, not a modification of
its existing per-location pip layout. The existing per-location pip
layout used by the mech and Wave-1 families SHALL be unchanged.

**Priority**: Critical

#### Scenario: Per-trooper pip clusters laid out per column

- **GIVEN** a 5-trooper Battle Armor squad with a per-suit armor pip
  count and a template exposing 5 trooper-column pip regions
- **WHEN** the Battle Armor per-trooper pip grid lays out the squad
- **THEN** it SHALL emit one pip cluster per trooper column, and each
  cluster SHALL contain exactly that trooper's per-suit armor pip
  count

#### Scenario: Trooper-count range

- **GIVEN** a Battle Armor squad with a trooper count between 4 and 6
- **WHEN** the per-trooper pip grid lays out the squad
- **THEN** it SHALL lay out exactly one pip cluster per trooper present
  and SHALL leave unused trooper-column regions empty

#### Scenario: Existing per-location pip layout unchanged

- **GIVEN** the Wave-1 mech and vehicle / aerospace / protomech pip
  layout
- **WHEN** the Battle Armor per-trooper pip-grid helper is added to the
  pip engine
- **THEN** the existing per-location pip layout SHALL be unchanged and
  the Wave-1 pip-count fidelity tests SHALL still pass

---

### Requirement: Infantry Damage-Per-Trooper Formula

The infantry record sheet SHALL compute its damage row from a verbatim
reproduction of MegaMek's `Infantry.getDamagePerTrooper()` formula
(MegaMek `Infantry.java`). The reproduction SHALL be a deterministic
calculation of damage per trooper from the platoon's primary and
secondary weapon damage values and trooper composition.

The formula SHALL apply the documented primary-weapon damage cap of
`0.6` (MegaMek `INFANTRY_PRIMARY_WEAPON_DAMAGE_CAP`, per the 09/2021
errata) to the primary weapon's contribution.

The record sheet SHALL render a damage row where, for each trooper
count `j` in the range `1..30`, the value `DAMAGE+j` equals
`round(perTrooper × j)`, where `perTrooper` is the result of the
formula.

**Priority**: Critical

#### Scenario: Damage per trooper reproduces the MegaMek formula

- **GIVEN** an infantry platoon with a known primary weapon, secondary
  weapons, and trooper composition
- **WHEN** the damage-per-trooper value is computed
- **THEN** it SHALL equal the value produced by a verbatim
  reproduction of MegaMek `Infantry.getDamagePerTrooper()` for the same
  inputs

#### Scenario: Primary-weapon damage cap is applied

- **GIVEN** an infantry platoon whose primary weapon's per-trooper
  damage exceeds `0.6`
- **WHEN** the damage-per-trooper value is computed
- **THEN** the primary weapon's contribution SHALL be capped at `0.6`,
  matching MegaMek `INFANTRY_PRIMARY_WEAPON_DAMAGE_CAP`

#### Scenario: Damage row spans trooper counts 1 to 30

- **GIVEN** a rendered infantry record sheet with a computed
  per-trooper damage value
- **WHEN** the damage row is produced
- **THEN** for each trooper count `j` in `1..30` the `DAMAGE+j` value
  SHALL equal `round(perTrooper × j)`

---

### Requirement: Wave-2 Pip-Count Fidelity Gate

Each Wave-2 family adapter SHALL have a test that parses the rendered
output SVG and asserts the count of pip elements matches the unit's
actual statistics — per trooper column for Battle Armor and per
platoon block for infantry.

**Priority**: Critical

#### Scenario: Battle Armor pip count matches per-trooper armor stats

- **GIVEN** a Battle Armor fixture with a known per-trooper armor pip
  count for each suit
- **WHEN** the squad is rendered through the templated path and the
  output SVG is parsed
- **THEN** the pip-element count for each trooper column SHALL equal
  that trooper's armor pip value from the fixture

#### Scenario: Infantry pip count matches platoon size

- **GIVEN** an infantry fixture with a known platoon trooper count
- **WHEN** the platoon is rendered through the templated path and the
  output SVG is parsed
- **THEN** the platoon pip-grid element count SHALL equal the
  fixture's trooper count

#### Scenario: Wrong fixture fails the fidelity assertion

- **GIVEN** a Wave-2 fixture deliberately stated with an incorrect pip
  count
- **WHEN** the pip-count fidelity test runs against the rendered SVG
- **THEN** the assertion SHALL fail, proving the gate detects
  pip-count drift

---

### Requirement: Templated-Path Exercise Guard

The system SHALL have a test that asserts the canonical template path
is actually exercised for the infantry and battle-armor families, so a
silently broken template path that falls back to the skeleton renderer
cannot pass unnoticed.

The guard SHALL assert that `isTemplatedUnit()` returns `true` for
both `infantry` and `battlearmor` payloads, AND that the SVG produced
for each family through `renderTemplated` is template-derived — it
SHALL carry a marker that only the canonical-template path produces
and that the skeleton renderer's output does not.

**Priority**: Critical

#### Scenario: isTemplatedUnit recognizes the Wave-2 families

- **GIVEN** an `IInfantryRecordSheetData` payload and an
  `IBattleArmorRecordSheetData` payload
- **WHEN** `isTemplatedUnit()` is called on each
- **THEN** it SHALL return `true` for both, the inverse of the Wave-1
  exclusion behaviour

#### Scenario: Rendered SVG is template-derived, not skeleton output

- **GIVEN** an infantry unit and a battle-armor unit with reachable
  canonical template assets
- **WHEN** each is rendered through `renderTemplated`
- **THEN** the output SVG SHALL carry a canonical-template marker
  absent from the corresponding skeleton renderer's output, proving
  the template path — not the fallback — produced it

## MODIFIED Requirements

### Requirement: Per-Type SVG Renderers

The system SHALL provide record-sheet rendering per unit type. For the
mech, vehicle, VTOL, support-vehicle, aerospace, conventional-fighter,
ProtoMech, infantry, and battle-armor families, rendering SHALL use the
canonical mm-data template path via the shared
`TemplateRecordSheetRenderer` and shared pip engine.

Each family's templated rendering SHALL consume its matching
`IRecordSheetData` variant, select a canonical template, apply text
bindings and dynamic pips, and produce an SVG conforming to the
canonical Total Warfare record-sheet layout for that type. For the
infantry and battle-armor families the renderer SHALL use the per-unit
**block** template (`conventional_infantry_platoon` /
`battle_armor_squad`) and render one unit per page.

The vehicle, aerospace, protomech, infantry, and battle-armor skeleton
renderers SHALL remain available as the runtime fallback and SHALL NOT
be deleted by this change.

**Priority**: Critical

#### Scenario: Renderer dispatch by variant tag

- **GIVEN** an `IInfantryRecordSheetData` or `IBattleArmorRecordSheetData`
  payload
- **WHEN** the top-level `renderer.ts` dispatcher is called
- **THEN** it SHALL route to the templated path for that family,
  falling back to the family skeleton renderer only on template
  failure

#### Scenario: BattleArmor per-trooper grid

- **GIVEN** a 5-trooper Elemental point
- **WHEN** the battle-armor unit is rendered through the templated path
- **THEN** the output SVG SHALL be derived from the
  `battle_armor_squad` canonical template and SHALL show 5 distinct
  trooper columns, each with its own armor pip grid laid out from
  template geometry

#### Scenario: Infantry platoon counter and damage row

- **GIVEN** a 28-trooper foot rifle platoon
- **WHEN** the infantry unit is rendered through the templated path
- **THEN** the output SVG SHALL be derived from the
  `conventional_infantry_platoon` canonical template and SHALL show
  the platoon pip grid plus the damage row whose `DAMAGE+j` values
  follow the damage-per-trooper formula

#### Scenario: Infantry and battle-armor asset failure degrades to skeleton

- **GIVEN** an infantry or battle-armor unit whose canonical template
  asset fails to load from local, CDN, and raw sources
- **WHEN** `renderTemplated` runs for that unit
- **THEN** it SHALL catch the failure and return the output of the
  existing `infantryRenderer` / `battleArmorRenderer` skeleton renderer
