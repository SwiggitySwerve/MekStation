## ADDED Requirements

### Requirement: Drafts belong to the current tactical context

The gameplay store SHALL clear movement intent, planned movement, attack intent, attack plan and stale target selections when the session identity, phase or selected unit changes. Cleanup SHALL preserve unrelated UI preferences and freshly derived overlays for the newly selected unit. Same-unit reselection and same-phase updates within the same session SHALL preserve drafts.

#### Scenario: Select another unit

- **GIVEN** an active unit has movement or attack composition
- **WHEN** another unit is selected through the store or map selection path
- **THEN** the former unit's drafts and target selections are empty
- **AND** the new unit remains selected with its newly derived overlays

#### Scenario: Advance or replace the session

- **GIVEN** the store holds nonempty drafts
- **WHEN** a phase changes or a session with a different identity is adopted
- **THEN** the drafts and stale previews are empty before another declaration can use them

#### Scenario: Refresh the current context

- **GIVEN** the store holds nonempty drafts
- **WHEN** the same unit is selected or the same session is refreshed without a phase change
- **THEN** the drafts remain unchanged

### Requirement: Cancel abandons only local composition

Movement Cancel SHALL discard composer drafts without undoing events, resolving actions, changing unit locks or emitting network intents. The selected unit SHALL remain available for recomposition. Existing command availability gates SHALL continue to apply.

#### Scenario: Cancel a movement draft

- **GIVEN** a selected unit has a draft and the session has committed events
- **WHEN** the player activates Cancel in the dock
- **THEN** the draft and target previews are cleared
- **AND** the session, event history and selected unit are preserved
- **AND** no undo is dispatched

### Requirement: Successful attacks share cleanup

Planned attacks, composed volleys, legacy fire and Hold Fire SHALL continue to use finishCommit and its shared attack cleanup. Failed or refused declarations SHALL preserve their draft unless a tactical context boundary changes.

#### Scenario: Complete an attack

- **GIVEN** a valid attack draft
- **WHEN** its declaration succeeds
- **THEN** finishCommit adopts the resulting session and clears attack drafts, targeting and selection

#### Scenario: Declaration fails

- **GIVEN** an attack draft in an unchanged tactical context
- **WHEN** its declaration throws or is refused
- **THEN** the draft is preserved
