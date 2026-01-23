# app-navigation Delta

## ADDED Requirements

### Requirement: History Navigation Section

The sidebar SHALL include a History section for timeline and audit features.

#### Scenario: History section display

- **WHEN** the sidebar is rendered
- **THEN** a "History" section appears between Gameplay and Settings
- **AND** the section contains a Timeline navigation item

#### Scenario: Navigate to Timeline

- **WHEN** the user clicks the "Timeline" navigation item
- **THEN** navigation proceeds to `/audit/timeline`
- **AND** the Timeline item is highlighted as active

#### Scenario: Timeline active on nested routes

- **WHEN** the current route is `/audit/timeline` or any nested audit route
- **THEN** the Timeline navigation item is highlighted as active

#### Scenario: Collapsed sidebar Timeline

- **WHEN** the sidebar is in collapsed (icon-only) mode
- **THEN** the Timeline icon is displayed
- **AND** hovering shows a tooltip with "Timeline"
