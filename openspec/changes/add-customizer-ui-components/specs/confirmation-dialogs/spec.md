## ADDED Requirements

### Requirement: Modal Overlay
Confirmation dialogs SHALL render as modal overlays blocking interaction with the main interface.

#### Scenario: Modal display
- **WHEN** dialog opens
- **THEN** semi-transparent black overlay covers screen
- **AND** dialog is centered vertically and horizontally
- **AND** z-index is above other elements

#### Scenario: Modal dismissal
- **WHEN** user clicks X button
- **THEN** dialog closes if no operation in progress

### Requirement: Reset Confirmation Dialog
The Reset Confirmation Dialog SHALL offer multiple reset options with detailed descriptions.

#### Scenario: Option presentation
- **WHEN** reset dialog opens
- **THEN** three options are displayed as selectable cards
- **AND** default selection is Reset Equipment Only

#### Scenario: Option card styling
- **WHEN** option is selected
- **THEN** card has blue border and blue background tint
- **WHEN** option is not selected
- **THEN** card has slate border with hover effect

### Requirement: Detailed Impact Preview
The dialog SHALL show what will be removed and preserved for each option.

#### Scenario: Impact grid display
- **WHEN** an option is selected
- **THEN** two-column grid appears below options
- **AND** left column shows What Gets Removed (red bullets)
- **AND** right column shows What Gets Preserved (green bullets)

### Requirement: Two-Step Confirmation
The dialog SHALL require explicit final confirmation before executing reset.

#### Scenario: First step buttons
- **WHEN** viewing options
- **THEN** Cancel and Continue with Reset buttons appear
- **AND** Continue with Reset has red background

#### Scenario: Final confirmation
- **WHEN** user clicks Continue with Reset
- **THEN** warning screen appears with warning icon
- **AND** message asks for final confirmation

### Requirement: Progress Tracking
The dialog SHALL display progress during reset operations.

#### Scenario: Progress display
- **WHEN** reset operation starts
- **THEN** progress bar appears with percentage
- **AND** current step description is shown
- **AND** close button is disabled

### Requirement: Result Feedback
The dialog SHALL display operation results with detailed feedback.

#### Scenario: Success display
- **WHEN** reset completes successfully
- **THEN** green success banner appears
- **AND** dialog auto-closes after 2 seconds

#### Scenario: Failure display
- **WHEN** reset fails
- **THEN** red error banner appears
- **AND** error list shows what failed
- **AND** dialog remains open for user to dismiss

### Requirement: Keyboard Accessibility
The dialog SHALL support keyboard navigation and shortcuts.

#### Scenario: Escape key
- **WHEN** user presses Escape
- **THEN** dialog closes if no operation in progress

#### Scenario: Focus management
- **WHEN** dialog opens
- **THEN** focus moves to dialog
- **AND** tab cycling stays within dialog

### Requirement: Prevent Interaction During Progress
The dialog SHALL prevent dismissal during active operations.

#### Scenario: Close prevention
- **WHEN** reset operation is in progress
- **THEN** close button is disabled
- **AND** overlay click does nothing

