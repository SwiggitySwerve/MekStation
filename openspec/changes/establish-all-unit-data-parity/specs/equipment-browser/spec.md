## ADDED Requirements

### Requirement: Family equipment browser admission preserves unknown applicability

Every shared family equipment picker SHALL apply the current unit type to the
catalog's pinned `allowedUnitTypes` before ammunition matching and pagination.
An absent list SHALL preserve the family's existing picker policy; an explicit
empty list SHALL admit no unit types. Picker filtering SHALL NOT discard mounted
equipment or change placement validation's treatment of unknown applicability.

#### Scenario: Family inventory and lookup-only miscellaneous equipment

- **GIVEN** mech, vehicle, aerospace, battle-armor or ProtoMech equipment browsers
- **WHEN** the browser receives its current unit type
- **THEN** every explicitly listed item SHALL admit that type
- **AND** matching pinned Miscellaneous and Unknown records SHALL be reachable through the browser inventory
- **AND** absent lists SHALL preserve legacy membership, with ProtoMech's existing stricter non-ammunition predicate retained
- **AND** switching family SHALL NOT replace shared equipment inventory with a filtered subset
- **AND** the default `getAllEquipment()` inventory SHALL retain its validation, API, resolver and audit behavior
- **AND** infantry's separate personal-weapon and field-gun selectors SHALL remain unchanged

#### Scenario: Empty applicability survives every loading boundary

- **GIVEN** absent, empty and populated applicability lists on weapons, physical weapons, ammunition, electronics and miscellaneous equipment
- **WHEN** conversion, loader search, unified lookup and the family browser consume them
- **THEN** absent and empty SHALL remain distinct
- **AND** an empty list SHALL never trigger the loader's BattleMech, Vehicle and Aerospace fallback
- **AND** ammunition SHALL retain its applicability metadata in the unified item

#### Scenario: Ammunition fallback recognizes catalog display suffixes

- **GIVEN** a bin without declared compatible IDs and a launcher displayed with `(Clan)` or `(ProtoMech)`
- **WHEN** the shared ammunition matcher compares the bin with that launcher
- **THEN** an otherwise identical undecorated fallback identity SHALL match within the same tech base
- **AND** this additional alias SHALL NOT introduce a cross-tech match or remove an existing match
- **AND** explicit compatible IDs SHALL retain precedence
- **AND** family and catalog predicates SHALL run before ammunition matching, totals and paging
