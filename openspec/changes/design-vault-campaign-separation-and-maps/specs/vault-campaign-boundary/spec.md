# vault-campaign-boundary Delta

## ADDED Requirements

### Requirement: Vault templates are immutable and versioned
Personal-vault content (custom unit designs, pilots, player cards) SHALL be stored as immutable versioned templates: saving an edit to a vault entity SHALL publish a new version and SHALL NOT mutate any previously published version. The vault SHALL maintain a monotonic version counter per entity, and every published version SHALL remain resolvable by `(vaultId, version)` for as long as any campaign instance references it.

#### Scenario: Editing a design publishes a new version
- **WHEN** a player saves changes to a vault unit design that has published version N
- **THEN** the vault SHALL publish version N+1
- **AND** version N SHALL remain byte-identical and resolvable by `(vaultId, N)`

#### Scenario: Vault edits never propagate into campaigns
- **WHEN** a vault design referenced by an active campaign instance is edited
- **THEN** the campaign instance SHALL continue to resolve against its pinned `sourceVersion`
- **AND** no campaign state SHALL change as a result of the vault edit

### Requirement: Campaigns draw instance copies from the vault
Adding vault content to a campaign SHALL create a campaign-owned instance that records provenance — the vault reference (`unitRef` or `pilotId`), the source discriminator (`unitSource`: `canonical` or `custom`), and the pinned `sourceVersion` — without duplicating the template's serialized construction payload (per `add-saved-custom-unit-campaign-roster` D1). Each draw SHALL mint a new campaign-local instance id, so two instances of the same template have distinct campaign identities and identical provenance.

#### Scenario: Template becomes real
- **WHEN** a player adds a saved custom design to a campaign roster
- **THEN** a roster instance SHALL be created with a fresh campaign-local id, `unitRef` = the design's API id, `unitSource` = `custom`, and `sourceVersion` = the design's current published version
- **AND** the instance SHALL NOT embed the design's construction payload

#### Scenario: Campaign-local divergence stays on the instance
- **WHEN** a campaign instance takes damage, is refitted, or its pilot gains campaign XP or wounds
- **THEN** that divergence SHALL be recorded on campaign-owned state only
- **AND** the referenced vault template SHALL be unchanged

#### Scenario: Identity is never inferred from display fields
- **WHEN** any campaign system relates an instance to vault or catalog content
- **THEN** it SHALL use the recorded reference ids and source discriminator
- **AND** it SHALL NOT infer identity from names, tonnage, or id prefixes

### Requirement: Context ownership of screens
Personal-context surfaces (My Units, Pilots roster, Customizer, Compare, player cards/progression) SHALL operate exclusively on vault entities, and campaign-context surfaces (campaign dashboard, mech bay, contract market, missions, starmap) SHALL operate exclusively on campaign instances and campaign state. A campaign surface that displays vault-derived content SHALL present it through the instance's cached display fields and provenance, and the only vault interaction offered inside a campaign SHALL be the draw-from-vault flow.

#### Scenario: Campaign mech bay shows instances, not vault rows
- **WHEN** a player opens a campaign's mech bay
- **THEN** every listed unit SHALL be a campaign instance resolved by reference and pinned version
- **AND** editing the underlying vault design SHALL NOT be offered from this surface

#### Scenario: Vault surfaces show no campaign state
- **WHEN** a player opens My Units or the Pilots roster outside a campaign
- **THEN** no campaign-local divergence (damage, campaign XP, wounds) SHALL be displayed as if it were vault state
- **AND** lifetime records (for example pilot career totals) MAY be displayed as vault-side history

### Requirement: Version drift is surfaced, never auto-applied
When a vault template referenced by a campaign instance has a newer published version than the instance's pinned `sourceVersion`, campaign surfaces SHALL be able to surface the drift as an optional, player-visible affordance (for example a refit prompt), and applying it SHALL be an explicit campaign action that re-pins the instance to the newer version. Nothing SHALL re-pin automatically.

#### Scenario: Refit prompt on newer vault version
- **WHEN** a campaign mech bay lists an instance whose vault design has a newer version
- **THEN** the surface MAY display an update-available affordance naming both versions
- **AND** the instance SHALL remain on its pinned version until the player commits the campaign action

### Requirement: Cross-campaign progression is observational
Vault-side lifetime records (player cards, pilot career totals) SHALL accrue from campaign events as append-only history and SHALL NOT alter campaign simulation inputs at campaign start. Mechanical cross-campaign carry-over is out of scope for this capability and requires its own future specification.

#### Scenario: Career totals accrue without changing new campaigns
- **WHEN** a pilot's campaign instance earns kills and XP in a mission
- **THEN** the vault pilot's lifetime records MAY be updated with the historical totals
- **AND** starting a new campaign with that pilot SHALL initialize the new instance from the template's base values, not from lifetime totals
