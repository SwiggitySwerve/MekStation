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
