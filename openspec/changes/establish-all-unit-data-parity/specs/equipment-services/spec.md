## ADDED Requirements

### Requirement: Distinct native ProtoMek SRM catalog identities

The existing equipment catalog and name mappings SHALL distinguish native
ProtoMek SRM 1, 3 and 5 launchers from battle-armor entries. Native names SHALL
select clan-srm-1, clan-srm-3 and clan-srm-5; explicit existing battle-armor IDs
SHALL retain their stored definitions. Consumers SHALL use the same catalog
and mappings without another normalization algorithm.

#### Scenario: Native launcher identities and fields

- **GIVEN** CLSRM1/3/5, Clan SRM 1/3/5, Clan SRM-1/3/5 or SRM 1/3/5
- **WHEN** the existing resolver or MTF mapping receives any case variant
- **THEN** it SHALL select the corresponding distinct ProtoMek catalog entry
- **AND** type BV SHALL equal 15/30/47 and heat SHALL equal zero
- **AND** the catalog SHALL retain pinned native weight, cost, ranges and critical-slot values
- **AND** Java's no-minimum and cluster-damage sentinels SHALL be represented by the existing catalog's zero-minimum and 2/missile conventions

#### Scenario: Supported unit types and legacy definitions

- **WHEN** the official equipment loader reads these entries
- **THEN** they SHALL pass the existing weapon schema and be available for ProtoMechs only through unit-type filtering
- **AND** BattleMech, vehicle, aerospace and battle-armor filters SHALL exclude them
- **AND** explicit basrm1, basrm3 and basrm5 IDs SHALL retain their previous definitions and values
- **AND** one-shot, ammunition and other catalog records SHALL remain unchanged
- **AND** the equipment index counts SHALL be regenerated from its listed catalog files and pass check mode

#### Scenario: Source effects and evidence limits

- **WHEN** this catalog correction is validated
- **THEN** native-accepted changed lookups SHALL be checked against actual pinned Java identities and type BV
- **AND** changed source weapon subtotals and final BVs SHALL be recorded separately from unchanged source fields, serialization and costs
- **AND** compatibility spellings rejected by Java SHALL receive no native-parity credit
- **AND** contextual native lookup, battle-armor catalog defects, ammunition, complete BV, mount legality and production workflows SHALL remain open

### Requirement: Clan identity in equipment pattern resolution

The existing equipment BV resolver SHALL prefer an available Clan catalog
candidate when a pattern-derived ID comes from an explicit CL-prefixed name.
It SHALL use the same Clan-prefix owner as compact-ID resolution. Canonical
IDs and explicit alias/name mappings SHALL retain their existing precedence;
other fallback behavior SHALL remain unchanged.

#### Scenario: Native Clan LB-X, Streak, Gauss, Ultra and Rotary weapons

- **GIVEN** native CLLBXAC2/5/10/20, CLStreakSRM2/4/6, CLGaussRifle CLUltraAC2/5/10/20 or CLRotaryAC2/5 names
- **WHEN** their exact, lower-case or upper-case spellings are resolved
- **THEN** the canonical entry SHALL retain Clan technology and native weapon identity
- **AND** its type BV SHALL match the pinned MegaMek registry
- **AND** CLLBXAC2 SHALL give 47 and CLStreakSRM2 SHALL give 40, and CLRotaryAC2/5 SHALL give 161/345

#### Scenario: Preserve explicit identities and unresolved diagnostics

- **GIVEN** an explicit Inner Sphere canonical ID or an existing direct alias
- **WHEN** the resolver selects its catalog entry
- **THEN** the existing direct resolution SHALL retain precedence over patterns
- **WHEN** no candidate exists
- **THEN** the existing unresolved result SHALL remain explicit rather than inventing an entry

#### Scenario: Bounded cross-family verification

- **WHEN** this shared resolver correction is verified
- **THEN** the capture SHALL include source-derived MTF/BLK and all-family unit JSON strings, explicitly state its extraction/input-set limits, list every changed captured name and compare native-accepted changes with actual pinned registry observations
- **AND** shared MTF, unit-loader and simulation normalization consumers SHALL be acknowledged as receiving the changed identities
- **AND** native-rejected compatibility spellings SHALL receive no native-parity credit
- **AND** all 86 ProtoMek source records, serialization and costs SHALL be preserved while BV changes are recorded separately
- **AND** full equipment/mount identity, ammunition, catalog defects, full numerical parity and production browser workflows SHALL remain open

#### Scenario: Clan LB-X ammunition compatibility survives identity correction

- **GIVEN** CLLBXAC2 or CLLBXAC5 and ordinary lb-2-x-ammo or lb-5-x-ammo catalog bins
- **WHEN** a vehicle calculates offensive BV through the shared ammunition owner
- **THEN** weapon BV SHALL be 47 or 93 and one bin SHALL retain 6 or 12 BV respectively
- **AND** the existing ammunition aliases SHALL also participate in the Clan-prefix fallback
- **AND** exact weapon keys, exact aliases, original-family fallback precedence, rack separation and excessive-ammunition caps SHALL be preserved
- **AND** the ammunition audit SHALL call the same matching owner, without a copied alias table or matcher
- **AND** this compatibility repair SHALL NOT claim complete native ammunition or mixed-technology cap parity
