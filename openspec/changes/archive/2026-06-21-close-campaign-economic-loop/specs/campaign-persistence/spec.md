# campaign-persistence Delta — close-campaign-economic-loop

## MODIFIED Requirements

### Requirement: Campaign Serialization Round-Trip

The system SHALL provide pure, total `serializeCampaign` and
`deserializeCampaignBody` functions that share a single field-map constant so
the two directions cannot drift, and a round-trip MUST reproduce the original
campaign. The battle-aftermath state — `repairQueue`, `salvageAllocations` (and
their reports), `pendingBattleOutcomes`, and `processedBattleIds` — SHALL be
included in the shared field-map so it survives a serialize/deserialize
round-trip on the server path and does not vanish on a server-fetch reload.

#### Scenario: Round-trip preserves the campaign

- **GIVEN** a fully-populated `ICampaign` with non-empty `missions`, `personnel`, and `forces` maps
- **WHEN** it is serialized and then deserialized
- **THEN** the result SHALL deep-equal the original `ICampaign`
- **AND** all `Map` fields SHALL be restored as `Map` instances
- **AND** all `Date` fields SHALL be restored as `Date` instances

#### Scenario: Field-map drift fails the build

- **GIVEN** an `ICampaign` field of type `Map` or `Date`
- **WHEN** that field is not listed in the shared field-map constant
- **THEN** a type-level test SHALL fail the build

#### Scenario: Battle-aftermath fields survive the round-trip

- **GIVEN** an `ICampaign` with a populated `repairQueue`, `salvageAllocations`,
  `pendingBattleOutcomes`, and `processedBattleIds`
- **WHEN** it is serialized and then deserialized
- **THEN** the deserialized campaign SHALL carry the same `repairQueue`,
  `salvageAllocations`, `pendingBattleOutcomes`, and `processedBattleIds`
- **AND** `processedBattleIds` SHALL be restored to its runtime dedup-guard shape from its
  serialized array form.
