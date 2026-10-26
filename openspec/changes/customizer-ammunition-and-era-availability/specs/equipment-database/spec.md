## ADDED Requirements

### Requirement: Audited PPC Temporal Metadata

The official PPC catalog SHALL preserve production, extinction, and reintroduction years from pinned source records. Corrections SHALL be generated reproducibly, rather than hand-edited in generated JSON. Existing stable equipment identifiers SHALL be retained.

#### Scenario: Inner Sphere ER PPC dates

- **WHEN** the audited PPC availability generator runs
- **THEN** er-ppc retains production year 2751 and gains extinction year 2860 and reintroduction year 3037

#### Scenario: Enhanced PPC provenance

- **WHEN** the generator reads MegaMek CLEnhancedPPC at revision fd2edfb36ac4bb06a0aa3fbfbdd38d79b7d62a60
- **THEN** enhanced-er-ppc retains production year 2823, uses Clan tech base, and records extinction in 2831 and reintroduction in 3080
- **AND** legacy Inner Sphere lookup aliases do not override the source tech base
