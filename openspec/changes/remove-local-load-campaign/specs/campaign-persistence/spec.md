## ADDED Requirements

### Requirement: Local Campaign Reload Is The Store Rehydrate

The campaign store SHALL NOT expose a local `loadCampaign` that reads the `campaign-<id>` record. A restarted app SHALL reload its campaign through the persisted campaign-store blob, and the server-backed `useCampaignPersistenceStore.loadCampaign` SHALL remain the only load action. A day interrupted after any of its storage writes SHALL leave the campaign consistent on reload: a contract settled by that day SHALL be settled and paid exactly once, never settled without its payment and never paid twice.

#### Scenario: The campaign store has no local load

- **GIVEN** a campaign store
- **WHEN** its state is inspected
- **THEN** it SHALL have no `loadCampaign` action

#### Scenario: A crash during a day does not tear the campaign

- **GIVEN** a day in which a won battle settles an ACTIVE contract and pays its closure
- **WHEN** storage stops accepting writes after any one of the day's writes and the app is restarted
- **THEN** the reloaded campaign SHALL show the contract either still ACTIVE and unpaid, or SUCCESS with the closure credited
- **AND** after further days the contract SHALL be SUCCESS with the credit paid exactly once
