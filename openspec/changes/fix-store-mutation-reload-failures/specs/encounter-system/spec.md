## ADDED Requirements

### Requirement: Encounter Mutation Refresh Outcome

Encounter store actions that reload the encounter list after a successful mutation SHALL return their existing failure value if that reload fails. This applies to creation, update, deletion, force assignment and clearing, template application, sample seeding, cloning, launch, session linking, and session completion. The store SHALL retain cached encounter data, clear loading, and store an error that explicitly states the change was saved but the list could not be refreshed and instructs the user to reload. The error SHALL preserve the reload failure detail. These actions SHALL NOT retry the server mutation automatically.

#### Scenario: Created encounter cannot be refreshed

- **GIVEN** the creation request succeeds and returns an encounter ID
- **WHEN** the list reload fails with an HTTP, network, or JSON error
- **THEN** createEncounter SHALL return null
- **AND** the error SHALL say "Encounter saved, but the list could not be refreshed. Reload to see it."
- **AND** the error SHALL include the reload failure detail
- **AND** the mutation SHALL be sent exactly once

#### Scenario: Other saved mutations cannot be refreshed

- **GIVEN** any other affected encounter mutation succeeds
- **WHEN** the list reload fails
- **THEN** the action SHALL return false, or null for ID/list-returning actions
- **AND** the store SHALL show the saved-change refresh error with loading cleared and cached encounter data retained
- **AND** deletion SHALL retain its existing selected-encounter clearing behavior

#### Scenario: Reload succeeds

- **GIVEN** an affected encounter mutation succeeds
- **WHEN** the subsequent list reload succeeds, including an empty list
- **THEN** the action SHALL return its existing success value and update the cached list with no error

#### Scenario: Mutation is rejected

- **GIVEN** the server rejects an encounter mutation
- **WHEN** the store handles the response
- **THEN** it SHALL return the existing failure value without reloading
- **AND** it SHALL preserve the mutation error without saying the change was saved

#### Scenario: Standalone loading fails

- **GIVEN** a caller loads the encounter list without a preceding mutation
- **WHEN** that load fails
- **THEN** the loader SHALL resolve without rejecting and retain its existing error behavior
- **AND** the error SHALL NOT claim a saved change
