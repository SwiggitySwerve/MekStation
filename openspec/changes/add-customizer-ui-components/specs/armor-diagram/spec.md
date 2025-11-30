## ADDED Requirements

### Requirement: SVG-Based Mech Diagram
The system SHALL display an SVG diagram showing all mech armor locations.

#### Scenario: Diagram rendering
- **WHEN** the armor diagram renders
- **THEN** all 8 locations are displayed (HD, CT, LT, RT, LA, RA, LL, RL)
- **AND** torso locations show both front and rear armor sections
- **AND** diagram scales responsively within container

### Requirement: Location Click Interaction
The system SHALL support clicking locations to select them for editing.

#### Scenario: Location selection
- **WHEN** user clicks a location
- **THEN** the location is visually highlighted (blue)
- **AND** the side panel editor shows that location's controls
- **AND** previous selection is cleared

### Requirement: Real-Time Armor Value Display
The system SHALL display current armor values directly on the diagram.

#### Scenario: Armor value display
- **WHEN** armor is allocated to a location
- **THEN** front armor value is displayed on the main section
- **AND** rear armor value is displayed on the rear section (for CT, LT, RT)
- **AND** values update immediately when changed

### Requirement: Location Color Coding
The system SHALL use color coding to distinguish location types.

#### Scenario: Location colors
- **WHEN** a location is displayed
- **THEN** Head is green (bg-green-600)
- **AND** Torso/Limbs are amber (bg-amber-600)
- **AND** Rear armor sections are darker amber (bg-amber-800)
- **AND** Selected location is blue (bg-blue-600)

### Requirement: Hover Feedback
The system SHALL provide visual feedback when hovering over locations.

#### Scenario: Hover effect
- **WHEN** user hovers over a location
- **THEN** the location shows hover state (brighter color)
- **AND** cursor changes to pointer
- **AND** transition is smooth

### Requirement: Auto-Allocate Integration
The system SHALL include an auto-allocate button within the diagram section.

#### Scenario: Auto-allocate button
- **WHEN** armor diagram is displayed
- **THEN** Auto-Allocate button is shown below the title
- **AND** button shows unallocated points count
- **AND** button color indicates over-allocation status

### Requirement: Diagram Legend
The system SHALL include a legend explaining color coding.

#### Scenario: Legend display
- **WHEN** diagram is rendered
- **THEN** legend shows color indicators for Head, Torso/Limbs, Rear, Selected
- **AND** instruction text explains click interaction

