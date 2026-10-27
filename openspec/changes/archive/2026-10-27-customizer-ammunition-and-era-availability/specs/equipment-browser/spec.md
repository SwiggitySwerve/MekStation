## ADDED Requirements

### Requirement: Historical Availability Filter

The Equipment Browser SHALL use the shared temporal availability predicate when hiding unavailable items for a unit year or applying an explicit year filter. Its context label SHALL describe availability in that year. Turning off the unit availability filter SHALL permit browsing extinct items unless another filter excludes them.

#### Scenario: Inner Sphere equipment in 3028

- **WHEN** an Inner Sphere unit has year 3028 and Hide Unavailable is enabled
- **THEN** Inner Sphere ER PPC is absent during its 2860–3037 extinction interval
- **AND** Enhanced ER PPC is absent because it is Clan technology and extinct during that year

#### Scenario: Reintroduced equipment

- **WHEN** the unit year changes to 3037
- **THEN** Inner Sphere ER PPC is available again
- **AND** the filter context describes availability in 3037

### Requirement: Catalog-compatible Ammunition Visibility

The Equipment Browser SHALL hide ammunition with no compatible catalog weapon under the same technology, year, prototype, and one-shot restrictions. It SHALL use the ammunition compatibility owner. Search, category, weight, and critical-slot restrictions SHALL apply to the displayed ammunition independently; they SHALL NOT require its weapon to match those presentation restrictions. The mounted-weapon ammunition toggle SHALL remain an additional independent restriction. Equipment data SHALL NOT be deleted.

#### Scenario: Orphan ammunition

- **WHEN** AC/15 ammunition has no compatible weapon in the catalog
- **THEN** it is hidden even with the mounted-weapon ammunition toggle off
- **AND** AC/10 ammunition remains visible if AC/10 is available

#### Scenario: Historical weapon gap

- **WHEN** ammunition is introduced but every compatible weapon is extinct, too new, or excluded by tech base
- **THEN** that ammunition is hidden
- **AND** it returns when a compatible weapon becomes available

#### Scenario: Ammunition-only browsing

- **WHEN** the user searches for ammunition or selects only the ammunition category
- **THEN** compatible ammunition remains visible even though its weapon does not match the search or category
