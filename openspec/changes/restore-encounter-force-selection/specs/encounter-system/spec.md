## ADDED Requirements

### Requirement: Encounter Force Selection Recovery Route
The encounter system SHALL provide
`/gameplay/encounters/[id]/select-force?type=<side>` for the closed side values
`player` and `opponent`. The route SHALL resolve the concrete encounter identity,
load the requested encounter and existing forces, identify the requested slot
without inference, and preserve recognized campaign and mission linkage when it
returns to encounter detail.

#### Scenario: Player selection link resolves
- **WHEN** a user follows an encounter's `Select Player Force` link
- **THEN** the route SHALL show existing force candidates for the player slot of that concrete encounter
- **AND** the route SHALL expose a return path to the same encounter

#### Scenario: Opponent selection link resolves
- **WHEN** a user follows an encounter's `Select Opponent Force` link
- **THEN** the route SHALL show existing force candidates for the opponent slot of that concrete encounter
- **AND** it SHALL NOT treat the request as a player-slot selection

#### Scenario: Invalid side fails without mutation
- **WHEN** `type` is missing, repeated ambiguously, or has a value other than `player` or `opponent`
- **THEN** the route SHALL render a recoverable invalid-link state
- **AND** it SHALL NOT call an encounter assignment API or mutate either force slot

#### Scenario: Missing encounter stays recoverable
- **WHEN** the resolved encounter id does not identify a stored encounter
- **THEN** the route SHALL render an encounter-not-found state with a link to the encounter list
- **AND** it SHALL NOT claim that force loading or assignment succeeded

### Requirement: Force Assignment Preserves Encounter Slots
Selecting a force SHALL use the existing side-specific encounter API/store
action, update only the requested slot, reload the authoritative encounter,
revalidate it, and then return to that encounter. A rejected or failed request
SHALL remain on the selection route with an actionable error and retry controls.

#### Scenario: Player assignment preserves opponent slot
- **WHEN** the user selects force `P2` for the player slot of an encounter whose opponent slot references `O1`
- **THEN** the system SHALL persist `P2` through the player-force API
- **AND** the reloaded encounter SHALL still reference `O1` in the opponent slot

#### Scenario: Opponent assignment preserves player slot
- **WHEN** the user selects force `O2` for the opponent slot of an encounter whose player slot references `P1`
- **THEN** the system SHALL persist `O2` through the opponent-force API
- **AND** the reloaded encounter SHALL still reference `P1` in the player slot

#### Scenario: Save failure does not navigate or show false success
- **WHEN** the side-specific force assignment request fails
- **THEN** the selection route SHALL remain visible with the candidate list and an actionable error
- **AND** it SHALL NOT navigate to encounter detail or report the force as persisted

#### Scenario: Cold reload preserves both assignments
- **WHEN** both sides have been assigned and the encounter detail route is cold reloaded
- **THEN** the raw encounter API SHALL retain the selected player and opponent force ids
- **AND** the hydrated encounter SHALL render both matching force summaries

### Requirement: Force Selection States Are Visible and Accessible
The force-selection route SHALL distinguish loading, populated, empty, load
failure, assignment-pending, and assignment-failure states. Candidate controls
SHALL be keyboard operable, visibly focused, expose their force name and target
slot, meet a minimum 44 CSS pixel target height, and remain usable without
horizontal page overflow at supported narrow and desktop viewports.

#### Scenario: Populated force list exposes useful choice information
- **WHEN** existing forces load successfully
- **THEN** each candidate SHALL show its name, status, assigned unit count, total Battle Value, and readiness information
- **AND** each candidate SHALL provide one semantic control for assigning that force to the requested slot

#### Scenario: No forces offers creation recovery
- **WHEN** the force API returns no candidates
- **THEN** the route SHALL explain that no existing force can be selected
- **AND** it SHALL provide links to create a force and return to the encounter without claiming assignment success

#### Scenario: Assignment pending prevents duplicate writes
- **WHEN** a force assignment request is in flight
- **THEN** candidate assignment controls SHALL be disabled and the pending state SHALL be announced
- **AND** repeated activation SHALL NOT issue a second assignment request

#### Scenario: Narrow-screen and keyboard operation remain playable
- **WHEN** the route is used at a supported narrow viewport or without a pointer
- **THEN** the content SHALL remain within the viewport and every candidate SHALL be reachable and operable in a logical focus order
- **AND** status or error feedback SHALL not depend on color alone
