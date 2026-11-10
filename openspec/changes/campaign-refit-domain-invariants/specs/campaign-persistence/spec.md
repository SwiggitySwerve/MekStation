## ADDED Requirements

### Requirement: Shared refit status owner
The refit package SHALL own pure predicates for active and open orders, open counts and conflict detection. Open SHALL mean proposed or in-progress; extraction SHALL preserve existing client admission and processor behavior and facade exports.

#### Scenario: Terminal history
- **GIVEN** completed or cancelled history and one proposed order
- **WHEN** admission and duplicate detection inspect the orders
- **THEN** only the proposed order counts as open

### Requirement: Campaign save refit ratchet
Client-envelope writes SHALL reject only introduced or worsened per-unit duplicate open refits, in the SQLite transaction after authorization, fence and version checks and before any row or journal write. A rejection SHALL return HTTP 422 with kind refused, code CAMPAIGN_INVARIANT_VIOLATION, reason, error, currentVersion and violations. Only the refit invariant SHALL be registered initially.

#### Scenario: New duplicate
- **WHEN** a current-version authorized PUT raises a unit from one open order to two
- **THEN** it returns 422 and changes neither the row, version nor journal

#### Scenario: Legacy ratchet
- **GIVEN** two open orders already stored for a unit
- **WHEN** a save keeps two or reduces the count
- **THEN** it succeeds, including unrelated edits

#### Scenario: Worsening legacy duplicates
- **GIVEN** two open orders already stored
- **WHEN** a save raises the count to three
- **THEN** it returns 422 without storing anything

#### Scenario: Precedence
- **WHEN** an unauthorized or stale write also contains duplicate refits
- **THEN** existing authorization or 409 conflict responses take precedence

### Requirement: Legacy and journal tolerance
Adoption SHALL tolerate and log legacy duplicates. Journal-written server rows SHALL monitor and log duplicate refits without refusing or changing the committed result.

#### Scenario: Adopt legacy duplicates
- **WHEN** a browser copy with duplicate refits is adopted
- **THEN** adoption succeeds and logs the violations without choosing a winner

#### Scenario: Journal materialization
- **WHEN** the journal rewrites a record containing duplicates
- **THEN** the row is written and violations are logged only

### Requirement: Invariant save refusal parsing
The client SHALL parse typed 422 save refusals, show the server error and retain dirty unsaved state.

#### Scenario: Refused save
- **WHEN** a PUT returns the typed invariant refusal on 422
- **THEN** the save enters error with the server reason and remains dirty
