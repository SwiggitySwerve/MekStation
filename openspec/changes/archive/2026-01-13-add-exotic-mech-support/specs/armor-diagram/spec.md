## MODIFIED Requirements

### Requirement: SVG-Based Mech Diagram
The system SHALL display an SVG diagram showing all mech armor locations for the current configuration.

#### Scenario: Biped diagram rendering
- **WHEN** the armor diagram renders for BIPED configuration
- **THEN** all 8 locations are displayed (HD, CT, LT, RT, LA, RA, LL, RL)
- **AND** torso locations show both front and rear armor sections
- **AND** diagram scales responsively within container

#### Scenario: Quad diagram rendering
- **WHEN** the armor diagram renders for QUAD configuration
- **THEN** all 8 locations are displayed (HD, CT, LT, RT, FLL, FRL, RLL, RRL)
- **AND** diagram shows 4-legged mech silhouette
- **AND** front legs are positioned forward of torso
- **AND** rear legs are positioned behind torso
- **AND** torso locations show both front and rear armor sections

#### Scenario: Tripod diagram rendering
- **WHEN** the armor diagram renders for TRIPOD configuration
- **THEN** all 9 locations are displayed (HD, CT, LT, RT, LA, RA, LL, RL, CL)
- **AND** diagram shows humanoid silhouette with center leg
- **AND** center leg is positioned centrally below torso
- **AND** torso locations show both front and rear armor sections

#### Scenario: LAM diagram rendering
- **WHEN** the armor diagram renders for LAM configuration
- **THEN** diagram shows biped silhouette by default (Mech mode)
- **AND** mode toggle control is displayed
- **AND** switching to Fighter mode shows aerospace armor mapping overlay

### Requirement: Location Click Interaction
The system SHALL support clicking locations to select them for editing based on configuration.

#### Scenario: Location selection
- **WHEN** user clicks a location
- **THEN** the location is visually highlighted (blue)
- **AND** the side panel editor shows that location's controls
- **AND** previous selection is cleared

#### Scenario: Configuration-appropriate click targets
- **WHEN** user clicks on a diagram region
- **THEN** click target SHALL correspond to valid locations for current configuration
- **AND** clicking quad front leg SHALL select FRONT_LEFT_LEG or FRONT_RIGHT_LEG
- **AND** clicking tripod center leg SHALL select CENTER_LEG

## ADDED Requirements

### Requirement: Configuration-Specific Diagram Components
The system SHALL render different diagram components based on mech configuration.

#### Scenario: Diagram component selection
- **WHEN** armor diagram is rendered
- **THEN** system SHALL select diagram component based on unit configuration
- **AND** BIPED SHALL use BipedArmorDiagram
- **AND** QUAD SHALL use QuadArmorDiagram
- **AND** TRIPOD SHALL use TripodArmorDiagram
- **AND** LAM SHALL use LAMArmorDiagram
- **AND** QUADVEE SHALL use QuadVeeArmorDiagram

#### Scenario: Dynamic diagram switching
- **GIVEN** user is editing a unit in customizer
- **WHEN** configuration is changed (e.g., BIPED to QUAD)
- **THEN** armor diagram SHALL switch to the appropriate component
- **AND** location selections SHALL be cleared
- **AND** armor values SHALL be preserved where locations map

### Requirement: Quad Armor Diagram
The system SHALL display a quad mech-specific armor diagram.

#### Scenario: Quad silhouette
- **WHEN** QuadArmorDiagram renders
- **THEN** diagram SHALL show 4-legged mech body
- **AND** head SHALL be positioned forward on torso
- **AND** no arm silhouettes SHALL be shown

#### Scenario: Quad location regions
- **WHEN** QuadArmorDiagram renders
- **THEN** clickable regions SHALL exist for HEAD, CT, LT, RT, FLL, FRL, RLL, RRL
- **AND** each region SHALL display current armor value
- **AND** torso regions SHALL show front and rear values

#### Scenario: Quad armor pip layout
- **WHEN** armor pips are displayed on quad diagram
- **THEN** pip positions SHALL match quad location geometry
- **AND** leg locations SHALL accommodate higher armor values (12 slots vs 6)

### Requirement: Tripod Armor Diagram
The system SHALL display a tripod mech-specific armor diagram.

#### Scenario: Tripod silhouette
- **WHEN** TripodArmorDiagram renders
- **THEN** diagram SHALL show humanoid mech with 3 legs
- **AND** center leg SHALL be positioned centrally
- **AND** arms SHALL be displayed normally

#### Scenario: Tripod location regions
- **WHEN** TripodArmorDiagram renders
- **THEN** clickable regions SHALL exist for all 9 locations
- **AND** CENTER_LEG region SHALL be clearly distinguishable

### Requirement: LAM Armor Diagram
The system SHALL display a LAM-specific armor diagram with mode toggle.

#### Scenario: LAM mode toggle
- **WHEN** LAMArmorDiagram renders
- **THEN** mode toggle control SHALL be visible
- **AND** control SHALL allow switching between MECH, AIRMECH, FIGHTER modes
- **AND** current mode SHALL be clearly indicated

#### Scenario: LAM Mech mode view
- **WHEN** LAM is in MECH mode
- **THEN** diagram SHALL display standard biped silhouette
- **AND** all 8 mech locations SHALL be shown

#### Scenario: LAM Fighter mode view
- **WHEN** LAM is in FIGHTER mode
- **THEN** diagram SHALL show fighter armor mapping
- **AND** armor values SHALL be mapped from mech locations to fighter locations
- **AND** NOSE SHALL show combined HEAD + CT armor
- **AND** LEFT_WING and RIGHT_WING SHALL show LT and RT armor
- **AND** AFT SHALL show rear torso armor

#### Scenario: LAM AirMech mode view
- **WHEN** LAM is in AIRMECH mode
- **THEN** diagram SHALL display biped silhouette with VTOL indicators
- **AND** movement stats SHALL reflect VTOL capabilities

### Requirement: QuadVee Armor Diagram
The system SHALL display a QuadVee-specific armor diagram with mode toggle.

#### Scenario: QuadVee Mech mode
- **WHEN** QuadVee is in MECH mode
- **THEN** diagram SHALL display quad mech silhouette
- **AND** all quad locations SHALL be shown

#### Scenario: QuadVee Vehicle mode
- **WHEN** QuadVee is in VEHICLE mode
- **THEN** diagram SHALL display vehicle representation
- **AND** armor SHALL be shown for Front, Left, Right, Rear, Turret
