## ADDED Requirements

### Requirement: Native marker allocations reserve physical critical cells

SHALL load every supported native armor or structure marker into its exact occupied source critical cell without charging material mass a second time.

#### Scenario: A marker cannot be over-filled

- **GIVEN** a loaded Ferro-Fibrous or Endo Steel unit
- **WHEN** the editor displays or allocates critical slots
- **THEN** every native marker cell is occupied and excluded from available slots
- **AND** adding equipment after the remaining capacity is filled fails without changing state

### Requirement: Native marker allocations survive cold save and reopen

SHALL preserve marker identity, structural allocation, zero equipment mass, fixed status and exact source cells through custom save and cold reopen.

#### Scenario: Repeated round trip retains markers once

- **GIVEN** a canonical unit with native marker criticals
- **WHEN** it is saved, contract parsed and reopened twice
- **THEN** all marker cells remain occupied without duplication
- **AND** other equipment allocations and unrecovered cell sets remain unchanged

### Requirement: One owner recognises unrepresented critical entries

MUST derive critical-entry identity, kind, effect and represented coverage in the shared unit-loader owner and derive diagnostics only from actual final representation.

#### Scenario: Recognised but unplaced entry remains a warning

- **GIVEN** a recognised source entry without an actual primary, split, spread or fixed-system allocation
- **WHEN** recognition and load diagnostics run
- **THEN** the entry remains in the missing subset
- **AND** rendering and serialization add no independent recogniser
