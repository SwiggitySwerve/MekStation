## ADDED Requirements

### Requirement: Family-aware confirmed save consumers

Every editable customizer family SHALL read library status from its own store
through the shared save-state owner. A library save completion SHALL compare
current draft content with the submitted content, independently of metadata-only
or reference-only updates, and SHALL retain the confirmed submitted receipt.

#### Scenario: No-op during a deferred save

- **GIVEN** a save is pending for an editable family
- **WHEN** an empty setState or timestamp-only change occurs before valid success
- **THEN** the confirmed content is marked clean and save-and-close can finish

#### Scenario: Actual later edits

- **GIVEN** a save is pending for an editable family
- **WHEN** nested persisted content changes before success
- **THEN** that content remains modified, the submitted receipt is recorded, and the tab remains open

#### Scenario: Replaced or missing target

- **WHEN** the source store is replaced or its tab disappears during a save
- **THEN** the completion does not rename, mutate or close a replacement target

#### Scenario: Invalid response

- **WHEN** success omits a nonblank identity or positive safe integer revision
- **THEN** no confirmed receipt, clean state or close is invented and the dialog remains retryable

#### Scenario: Browser write failure after library success

- **WHEN** the library confirms success but the browser draft write fails
- **THEN** the library receipt remains available in memory, browser failure stays visible and the tab remains open
- **AND** Retry persists the correct family draft without another library request

#### Scenario: Family-specific status

- **GIVEN** different families can use the same editor ID
- **WHEN** status is read or subscribed to for one family
- **THEN** its library identity/version and content determine the displayed status, independently of another family's store
