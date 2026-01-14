## ADDED Requirements

### Requirement: Toast Provider Architecture

The toast system SHALL use a React context provider pattern for app-wide availability.

#### Scenario: Provider mounting

- **WHEN** ToastProvider wraps the application
- **THEN** useToast hook is available in all child components
- **AND** toast container renders at bottom-right of viewport

#### Scenario: Hook usage

- **WHEN** component calls useToast()
- **THEN** showToast, dismissToast, and dismissAll functions are returned
- **AND** calling showToast displays a new toast notification

#### Scenario: Missing provider

- **WHEN** useToast is called outside ToastProvider
- **THEN** error is thrown with helpful message

### Requirement: Toast Variants

The toast system SHALL support four semantic variants with distinct styling.

#### Scenario: Success toast

- **WHEN** showToast is called with variant "success"
- **THEN** toast displays with green background (bg-green-900/90)
- **AND** green border and checkmark icon
- **AND** appropriate for confirming completed actions

#### Scenario: Error toast

- **WHEN** showToast is called with variant "error"
- **THEN** toast displays with red background (bg-red-900/90)
- **AND** red border and X icon
- **AND** appropriate for reporting failures

#### Scenario: Warning toast

- **WHEN** showToast is called with variant "warning"
- **THEN** toast displays with amber background (bg-amber-900/90)
- **AND** amber border and warning triangle icon
- **AND** appropriate for cautionary messages

#### Scenario: Info toast

- **WHEN** showToast is called with variant "info"
- **THEN** toast displays with blue background (bg-blue-900/90)
- **AND** blue border and info circle icon
- **AND** appropriate for neutral information

### Requirement: Auto-Dismiss Behavior

Toasts SHALL automatically dismiss after a configurable duration.

#### Scenario: Default auto-dismiss

- **WHEN** toast is displayed without custom duration
- **THEN** toast auto-dismisses after 3000ms (3 seconds)

#### Scenario: Custom duration

- **WHEN** showToast is called with duration parameter
- **THEN** toast auto-dismisses after specified milliseconds

#### Scenario: Persistent toast

- **WHEN** showToast is called with duration of 0
- **THEN** toast remains until manually dismissed

### Requirement: Manual Dismissal

Users SHALL be able to manually dismiss toasts.

#### Scenario: Dismiss button

- **WHEN** toast is displayed
- **THEN** X button appears on right side of toast
- **AND** clicking X immediately dismisses the toast

#### Scenario: Dismiss animation

- **WHEN** toast is dismissed (manually or auto)
- **THEN** toast fades out and slides right over 200ms
- **AND** toast is removed from DOM after animation

### Requirement: Action Buttons

Toasts SHALL optionally support action buttons.

#### Scenario: Action button display

- **WHEN** showToast is called with action config
- **THEN** action button appears between message and dismiss button
- **AND** button displays provided label text

#### Scenario: Action button click

- **WHEN** user clicks the action button
- **THEN** provided onClick callback is executed
- **AND** toast is dismissed

### Requirement: Toast Stacking

Multiple toasts SHALL stack vertically.

#### Scenario: Multiple toasts

- **WHEN** multiple toasts are displayed simultaneously
- **THEN** toasts stack vertically with 8px gap
- **AND** newest toast appears at bottom
- **AND** each toast can be dismissed independently

### Requirement: Accessibility

Toasts SHALL be accessible to screen readers.

#### Scenario: ARIA attributes

- **WHEN** toast is displayed
- **THEN** toast has role="alert"
- **AND** aria-live="polite" for non-intrusive announcements

#### Scenario: Dismiss button accessibility

- **WHEN** dismiss button is rendered
- **THEN** button has aria-label="Dismiss notification"
