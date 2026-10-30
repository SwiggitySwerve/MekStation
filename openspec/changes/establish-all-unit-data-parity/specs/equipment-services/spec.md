## ADDED Requirements

### Requirement: Clan identity in equipment pattern resolution

The existing equipment BV resolver SHALL prefer an available Clan catalog
candidate when a pattern-derived ID comes from an explicit CL-prefixed name.
It SHALL use the same Clan-prefix owner as compact-ID resolution. Canonical
IDs and explicit alias/name mappings SHALL retain their existing precedence;
other fallback behavior SHALL remain unchanged.

#### Scenario: Native Clan LB-X, Streak, Gauss and Ultra weapons

- **GIVEN** native CLLBXAC2/5/10/20, CLStreakSRM2/4/6, CLGaussRifle or CLUltraAC2/5/10/20 names
- **WHEN** their exact, lower-case or upper-case spellings are resolved
- **THEN** the canonical entry SHALL retain Clan technology and native weapon identity
- **AND** its type BV SHALL match the pinned MegaMek registry
- **AND** CLLBXAC2 SHALL give 47 and CLStreakSRM2 SHALL give 40

#### Scenario: Preserve explicit identities and unresolved diagnostics

- **GIVEN** an explicit Inner Sphere canonical ID or an existing direct alias
- **WHEN** the resolver selects its catalog entry
- **THEN** the existing direct resolution SHALL retain precedence over patterns
- **WHEN** no candidate exists
- **THEN** the existing unresolved result SHALL remain explicit rather than inventing an entry

#### Scenario: Bounded cross-family verification

- **WHEN** this shared resolver correction is verified
- **THEN** every changed captured name SHALL be listed and native-accepted changes SHALL be compared with actual pinned registry observations
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
