## ADDED Requirements

### Requirement: Activity refresh preserves same-viewer history

The activity feed SHALL retain previously loaded authoritative entries on a network, HTTP, or malformed-body refresh error for the same campaign, session, and participant. Both activity surfaces SHALL display those entries beside a refresh warning explaining that they were previously loaded.

#### Scenario: Refresh fails and later recovers

- **GIVEN** a viewer has loaded authoritative activity entries
- **WHEN** a refresh fails
- **THEN** those entries and the server-resolved viewer seat SHALL remain available
- **AND** both activity surfaces SHALL show the failure beside the retained entries
- **WHEN** a later refresh succeeds
- **THEN** its entries SHALL replace the retained history and the warning SHALL clear

#### Scenario: No previous successful load

- **GIVEN** a viewer has not loaded authoritative activity
- **WHEN** its initial request fails
- **THEN** the error SHALL be shown without local FIFO fallback

#### Scenario: Access is forbidden or identity changes

- **GIVEN** authoritative entries were loaded for one campaign/session/participant key
- **WHEN** a refresh returns forbidden or the key changes
- **THEN** the previous entries SHALL NOT be shown
- **AND** a key change SHALL withhold previous entries from its first render
