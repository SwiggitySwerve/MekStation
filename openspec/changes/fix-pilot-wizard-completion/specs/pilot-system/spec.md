## ADDED Requirements

### Requirement: Pilot Wizard Creation Completion

The pilot wizard SHALL submit at most once per open session and SHALL remain pending until its creation action settles. A null persistent creation result SHALL show the store error, suppress success and completion navigation, block another create, and offer Return to roster. The wizard SHALL NOT imply that a null result proves no pilot was saved.

#### Scenario: Pilot saved but roster refresh fails

- **GIVEN** a persistent pilot creation returns null with a saved-but-refresh-failed store error
- **WHEN** creation settles
- **THEN** the wizard SHALL display that error without a success toast or completion callback
- **AND** another create SHALL be blocked in the current wizard session
- **AND** Return to roster SHALL close the wizard and navigate to the roster once

#### Scenario: Creation fails before confirmation

- **GIVEN** creation returns null with an ordinary store error or throws
- **WHEN** creation settles
- **THEN** the wizard SHALL display the error and offer roster recovery without automatically navigating or resubmitting

#### Scenario: Repeated submission before React renders

- **GIVEN** a creation action is pending
- **WHEN** another submit occurs before a render or while the store loading flag changes
- **THEN** only one creation action SHALL execute

#### Scenario: Successful persistent creation

- **GIVEN** creation returns a persisted pilot ID
- **WHEN** the creation page handles completion
- **THEN** it SHALL close the wizard and navigate once to that pilot's detail page in creation flow

#### Scenario: Successful statblock creation

- **GIVEN** a temporary statblock pilot is created
- **WHEN** the wizard handles completion
- **THEN** it SHALL call onCreated with null and the creation page SHALL navigate once to the roster
- **AND** it SHALL NOT navigate to a detail page for a temporary ID

### Requirement: Reviewed Random Pilot Skills

Random pilot creation SHALL accept optional reviewed skills and persist those exact values after validation. The wizard SHALL submit the skills displayed at final review. Omitted skills SHALL retain legacy random generation, and the existing server SPA roll SHALL remain available in both paths.

#### Scenario: Reroll then confirm

- **GIVEN** the user rerolls random skills and reviews the resulting values
- **WHEN** the wizard submits random creation
- **THEN** those values SHALL pass through the store and API to persistence without another skill roll
- **AND** the existing SPA roll SHALL still execute

#### Scenario: Legacy random request

- **GIVEN** a random creation caller omits reviewed skills
- **WHEN** creation executes
- **THEN** the service SHALL generate skills and roll for an SPA as before

#### Scenario: Invalid reviewed skills

- **GIVEN** supplied skills have an invalid shape or values outside the pilot skill contract
- **WHEN** random creation is requested
- **THEN** the request SHALL fail before persistence
