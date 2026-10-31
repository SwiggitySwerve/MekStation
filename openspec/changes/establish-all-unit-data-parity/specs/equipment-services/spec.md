## ADDED Requirements

### Requirement: Ammunition context in BV catalog resolution

The existing BV catalog owner SHALL resolve ammunition only from ammunition
catalog records. A shared ID SHALL select the ammunition record for ammo BV
while generic equipment and MTF lookup retain their existing precedence.
The existing normalizer SHALL remain the single compatibility lookup algorithm.

#### Scenario: Distinguish ammunition from a colliding weapon

- **GIVEN** distinct ammunition and weapon records with the same local ID
- **WHEN** ammunition BV is requested
- **THEN** the ammunition record's BV SHALL be returned
- **AND** generic equipment BV, normalized IDs and MTF output SHALL remain unchanged
- **AND** a weapon-only ID SHALL remain unresolved as ammunition, including in the battle-armor consumer
- **AND** explicit battle-armor BV overrides SHALL retain their existing behavior

#### Scenario: Custom catalogs and reset retain context boundaries

- **GIVEN** a custom catalog initialized with explicitly separate ammunition entries
- **WHEN** a record or alias is resolved
- **THEN** ammunition lookup SHALL use only the supplied ammunition entries and generic entries SHALL retain precedence on shared IDs
- **AND** replacing the custom catalog SHALL replace its ammunition and supplied alias caches without leaking bundled entries
- **WHEN** the catalog cache is reset
- **THEN** both contexts SHALL reload their bundled records

#### Scenario: Bound the identity correction

- **WHEN** the context correction is verified
- **THEN** source-derived lookup captures SHALL account for every changed ammunition result and preserve generic/MTF output
- **AND** the critical-slot validator's pattern-first policy SHALL remain unchanged while its resolver fallback observes ammunition context
- **AND** native aliases, quantities, grouping, mount semantics and complete source BV SHALL remain separate proof obligations

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

### Requirement: Native Clan laser and light weapon catalog identities

The existing catalog and name-mapping owners SHALL resolve pinned native names
for the Clan ER Micro Laser, three chemical lasers, three improved heavy lasers,
Light Machine Gun and Light TAG to distinct correct Clan records. They SHALL
use actual pinned registry identities, including display-name collisions, and
SHALL NOT reinterpret explicit battle-armor or Inner Sphere identities as Clan.

#### Scenario: Native identities and catalog fields

- **GIVEN** a registered internal, lookup or display name for one of these nine types
- **WHEN** BV resolution or MTF normalization receives that name or its case variant
- **THEN** the existing catalog/mapping contract SHALL select its native identity
- **AND** catalog BV, heat, damage, weight, cost, slots, represented ranges, introduction and static rules level SHALL match pinned Java observations
- **AND** Java's no-minimum sentinel SHALL use the existing minimum-zero convention
- **AND** Light TAG SHALL keep the electronics contract, without inventing weapon-only fields

#### Scenario: Shared consumers and preserved source data

- **GIVEN** the corrected catalog and native internal names
- **WHEN** the official loader, ProtoMech BV or combat weapon-data adapter consumes them
- **THEN** the official loader SHALL preserve the represented catalog fields and ProtoMech BV SHALL receive native type BV
- **AND** the combat adapter SHALL receive native identity, damage and heat for the eight weapon-catalog internal names; Light TAG SHALL retain its electronics contract
- **AND** source strings, mount provenance, existing serialization and source costs SHALL remain unchanged
- **AND** captured ammunition results SHALL retain every previously positive contribution
- **AND** legacy local IDs, contextual legality, full ammunition, combat alias/range propagation, combat mechanics and complete source BV SHALL remain separately accounted for

### Requirement: Native ProtoMek LRM catalog identities

The existing catalog and mapping owners SHALL distinguish ProtoMek LRM racks
1-4 from battle-armor entries using clan-lrm-1/2/3/4, and SHALL correct the
existing lrm6/7/8/9/11/12/13/14/16/17/18/19 records without renaming their IDs.
Native name corrections SHALL use pinned-native-accepted names. The four local
catalog names LRM 1-4 (Clan) SHALL also resolve to their own ProtoMek records as
local compatibility, without native-name parity credit. Existing battle-armor,
one-shot, Streak and ordinary LRM 5/10/15/20 records SHALL remain unchanged.

#### Scenario: Identity and represented native fields

- **GIVEN** a native internal or unambiguous display name for one of these sixteen types
- **WHEN** BV resolution or MTF normalization receives it or an ASCII case variant
- **THEN** the existing catalog/mapping boundary SHALL select the native ProtoMek identity and type BV with zero heat
- **AND** represented mass, cost, slots, ranges, introduction and static rules level SHALL match pinned runtime observations
- **AND** the native cluster-damage and no-minimum sentinels SHALL use the existing 1/missile and minimum-zero conventions
- **AND** official equipment filtering SHALL make these entries available only to ProtoMechs

#### Scenario: Local catalog names and store writers

- **GIVEN** official catalog records for balrm1-4 and clan-lrm-1/2/3/4
- **WHEN** the equipment lookup service supplies the battle-armor and ProtoMech stores
- **THEN** battle-armor mounts SHALL retain their explicit balrm IDs and plain LRM N names
- **AND** ProtoMech mounts SHALL retain their clan-lrm IDs and LRM N (Clan) names
- **AND** BV, MTF and combat lookup of each ProtoMech catalog name and its ASCII case variants SHALL agree on that ProtoMech identity
- **AND** native rejection of these decorated names SHALL remain explicit, with no native-name or BLK-export parity credit

#### Scenario: Consumer effects and compatibility boundaries

- **WHEN** combat and simulation receive native CLLRM names
- **THEN** their existing data adapters SHALL supply rack-sized nominal damage and short/medium/long ranges 7/14/21
- **AND** the official loader SHALL retain extreme range 28 without claiming combat option enforcement
- **AND** source strings, provenance, existing serialization, costs and local BLK reload results SHALL remain unchanged
- **AND** captured ammo-BV contributions SHALL retain previously positive values
- **AND** the twenty remaining resolved-name disagreements and 56 compatibility spellings with combat data but unresolved BV SHALL receive no parity credit
- **AND** legacy explicit IDs, unresolved alias differences, ammo quantities, mount legality, full combat/BV and production workflows SHALL remain separately accounted for
