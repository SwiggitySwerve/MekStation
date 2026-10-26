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

### Requirement: Source-backed Catalog Availability

The availability generator SHALL synchronize every unambiguously matched official equipment entry covered by pinned MegaMek weapon constructors and ammunition, electronics, miscellaneous, and physical-equipment factories. It SHALL use production dates when present, otherwise common or prototype dates, preserve explicit extinction and reintroduction dates, and correct exclusive source tech bases. Shared source technology SHALL retain each catalog row's tech-base projection and use that projection's dates. It SHALL retain stable IDs and report unmatched or ambiguous identities and records without usable source dates rather than inventing metadata.

#### Scenario: Succession Wars equipment gaps

- **WHEN** source-backed catalog rows are queried for Inner Sphere year 3028
- **THEN** Beagle Active Probe, ER Large Laser, Gauss Rifle, Ultra AC/5, Artemis IV, CASE, Double Heat Sink, and ER PPC are excluded during their source extinction intervals
- **AND** ER Small Laser and ER Medium Laser are excluded until their source introduction dates
- **AND** the generic one-ton Active Probe uses the Clan tech base from createCLActiveProbe and is excluded from Inner Sphere availability

#### Scenario: Reproducible source audit

- **WHEN** the availability generator runs with --check against its pinned revision
- **THEN** it fails if generated availability differs from source metadata
- **AND** its report identifies every matched source, changed row, unmatched or ambiguous ID, and absent date
