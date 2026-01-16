## MODIFIED Requirements

### Requirement: Mobile Loadout Status Bar

The mobile loadout SHALL display a compact status bar when collapsed with integrated navigation access.

#### Scenario: Collapsed status bar display
- **WHEN** the loadout tray is in collapsed state
- **THEN** a fixed status bar appears at the bottom of the screen
- **AND** displays Weight (used/max), Slots (used/max), Heat (generated/dissipation), and BV
- **AND** shows equipment count badge with expand indicator
- **AND** tapping the stats area expands to full-screen view

#### Scenario: Navigation menu button
- **WHEN** the loadout tray is displayed on mobile
- **THEN** a hamburger menu button appears on the right side of the status bar
- **AND** the button is separated from the stats area by a border
- **AND** tapping the button opens the main navigation sidebar

#### Scenario: Right-hand ergonomic positioning
- **WHEN** the status bar is rendered
- **THEN** the menu button is positioned on the far right
- **AND** the expand indicator is positioned between stats and menu button
- **AND** the menu button has minimum 44px touch target

#### Scenario: Weight overage indication
- **WHEN** weight used exceeds weight maximum
- **THEN** weight value displays in red color

#### Scenario: Slots overage indication
- **WHEN** slots used exceeds slots maximum
- **THEN** slots value displays in red color
