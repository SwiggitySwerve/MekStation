## ADDED Requirements

### Requirement: Pilot Mutation Refresh Outcome

Persisted pilot store mutations SHALL return their existing failure value if the list reload after server success fails. This applies to full, template, and random creation, update, deletion, skill improvement, wounds and healing through update, and ability/SPA purchase or removal. The store SHALL retain cached pilot data, clear loading, and store an error that explicitly states the change was saved but the list could not be refreshed and instructs the user to reload. The error SHALL preserve the reload failure detail. These actions SHALL NOT retry the server mutation automatically. In-memory statblock creation SHALL remain unchanged.

#### Scenario: Created pilot cannot be refreshed

- **GIVEN** full, template, or random pilot creation succeeds and returns a pilot ID
- **WHEN** the list reload fails with an HTTP, network, or JSON error
- **THEN** the creation action SHALL return null
- **AND** selectedPilotId SHALL retain its previous value
- **AND** the error SHALL say "Pilot saved, but the list could not be refreshed. Reload to see it."
- **AND** the error SHALL include the reload failure detail
- **AND** the mutation SHALL be sent exactly once

#### Scenario: Other saved pilot mutations cannot be refreshed

- **GIVEN** any other persisted pilot mutation succeeds
- **WHEN** the list reload fails
- **THEN** the action SHALL return false
- **AND** the store SHALL show the saved-change refresh error with loading cleared and cached pilot data retained
- **AND** deletion SHALL retain its existing selected-pilot clearing behavior

#### Scenario: Reload succeeds

- **GIVEN** a persisted pilot mutation succeeds
- **WHEN** the subsequent list reload succeeds, including an empty list
- **THEN** the action SHALL return its existing success value and replace the cached list with no error
- **AND** creation SHALL select the new pilot only after that reload succeeds

#### Scenario: Mutation is rejected

- **GIVEN** the server rejects a pilot mutation
- **WHEN** the store handles the response
- **THEN** it SHALL return the existing failure value without reloading
- **AND** it SHALL preserve the mutation error without saying the change was saved

#### Scenario: Standalone loading fails

- **GIVEN** a caller loads the pilot list without a preceding mutation
- **WHEN** that load fails
- **THEN** the loader SHALL resolve without rejecting and retain its existing error behavior
- **AND** the error SHALL NOT claim a saved change
