## ADDED Requirements

### Requirement: Recover Catalog Ammunition from Critical Slots

The unit loader SHALL recover resolvable ammunition bins from critical-slot tokens when absent from the serialized equipment array. It SHALL reuse equipment registry name resolution and the existing slot-claiming mechanism, without duplicating ammunition already listed in that array.

#### Scenario: Danielle Atlas ammunition

- **GIVEN** the canonical Atlas AS7-D (Danielle) definition has two ISAC20 Ammo tokens and two ISLRM20 Ammo tokens
- **WHEN** it is loaded into the customizer
- **THEN** it carries two AC/20 and two LRM-20 one-ton ammunition bins in their source slots
- **AND** its loaded weight is 100.0 tons
- **AND** MissingAmmunitionRule reports no missing-ammunition warning

#### Scenario: Serialized ammunition is already present

- **GIVEN** the same four bins are also listed in the serialized equipment array, with or without explicit slot indices
- **WHEN** the definition is loaded
- **THEN** each bin is carried once and occupies its matching critical slot

#### Scenario: Existing display-name aliases remain compatible

- **WHEN** the canonical 2755 Atlas AS7-D is loaded
- **THEN** it retains two AC/20, two LRM-20, and one SRM-6 ammunition bins
