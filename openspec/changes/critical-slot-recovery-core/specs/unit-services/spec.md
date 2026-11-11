## ADDED Requirements

### Requirement: One owner recognises unrepresented critical entries

The unit loader SHALL expose `recognizeCriticalSlotEntries(input)` returning
`cells` and `missing`, retain raw and parsed token evidence including size
parameters, and derive missing cells from actual primary, split and spread
allocations. Recognition SHALL NOT grant recovery permission.

#### Scenario: Recognised but unplaced entry remains a warning

- **GIVEN** a recognised source cell without an actual allocation
- **WHEN** recognition and load diagnostics run
- **THEN** the cell remains in the missing subset and diagnostic residual
- **AND** rendering and serialization add no independent recogniser

### Requirement: Recovery dispatch is explicit and exhaustive

The unit loader SHALL expose `recoverCriticalSlotEntries(input)` returning
zero or more mounts without mutating its input. Its kind switch SHALL contain
an explicit arm for every declared critical-entry kind, no default arm and a
compile-time exhaustiveness check. Existing component and grouped weapon
recovery SHALL retain admission guards, sizing, reservations and stage order.

#### Scenario: A new recovery kind requires an explicit decision

- **GIVEN** a new critical-entry kind is added without a dispatcher arm
- **WHEN** typechecking and the dispatcher contract test run
- **THEN** both reject the unhandled kind

#### Scenario: Marker recovery remains deferred

- **GIVEN** canonical Galahad GLH-1D with its 14 native structure marker cells
- **WHEN** the loader and notice grouping run on core
- **THEN** all marker cells remain unrecovered and listed in the notice
- **AND** no marker cells appear in mounted equipment or gain hydration

### Requirement: Native system exclusions use exact identity

System-component recognition SHALL use vocabulary-owned exact native identities
on parsed lookup tokens, preserving the resolver facade and notice owner.

#### Scenario: Equipment contains a system word

- **GIVEN** Chain Whip or ISC3Sensors source equipment
- **WHEN** the real unit is loaded, saved and cold reopened twice
- **THEN** its equipment cells survive each round trip
- **AND** native system cells remain excluded from equipment recovery
