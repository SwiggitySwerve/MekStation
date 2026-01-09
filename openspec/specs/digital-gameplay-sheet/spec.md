# digital-gameplay-sheet Specification

## Purpose
Implement interactive digital record sheet for BattleTech gameplay, enabling players to track game state without physical record sheets through clickable armor pips, heat tracking, ammo consumption, and game state management.

## Requirements

### Requirement: Interactive Armor Pips
The system SHALL provide clickable armor pips for damage tracking.

#### Scenario: Armor pip display
- **GIVEN** unit with allocated armor
- **WHEN** gameplay sheet renders
- **THEN** each armor point SHALL be displayed as pip
- **AND** pips SHALL be arranged in groups
- **AND** pips SHALL be visually distinct (filled/empty)
- **AND** pips SHALL be tappable

#### Scenario: Armor pip marking
- **GIVEN** undamaged armor location
- **WHEN** user taps armor pip
- **THEN** pip SHALL change to damaged state
- **AND** visual feedback SHALL be immediate
- **AND** haptic feedback SHALL trigger
- **AND** damage SHALL be recorded in game state

#### Scenario: Armor pip unmarking
- **GIVEN** damaged armor pip
- **WHEN** user taps damaged pip
- **THEN** pip SHALL revert to undamaged state
- **AND** feedback SHALL confirm correction
- **AND** game state SHALL update
- **AND** undo stack SHALL be updated

#### Scenario: Cluster damage handling
- **GIVEN** weapon causes 5-point cluster damage
- **WHEN** user applies damage
- **THEN** system SHALL highlight 5 pips
- **AND** user SHALL tap each pip to confirm
- **OR** user SHALL tap "Apply All" button
- **AND** damage SHALL be applied atomically

#### Scenario: Internal structure damage
- **GIVEN** all armor in location is destroyed
- **WHEN** additional damage is applied
- **THEN** system SHALL warn of critical hit
- **AND** internal structure SHALL be highlighted
- **AND** critical hit roll SHALL be prompted
- **AND** damage SHALL transfer to structure

#### Scenario: Through armor critical
- **GIVEN** armor critical hit occurs
- **WHEN** user confirms critical
- **THEN** affected pips SHALL be marked
- **AND** bypassed pips SHALL remain intact
- **AND** visual indication SHALL show bypass
- **AND** game state SHALL reflect special damage

### Requirement: Heat Tracking
The system SHALL provide interactive heat sink tracking.

#### Scenario: Heat scale display
- **GIVEN** unit with heat sinks
- **WHEN** gameplay sheet renders
- **THEN** heat scale SHALL be displayed
- **AND** current heat SHALL be highlighted
- **AND** movement modifiers SHALL be shown
- **AND** firing penalties SHALL be indicated

#### Scenario: Heat addition
- **GIVEN** current heat level
- **WHEN** user adds heat (from weapon fire, etc.)
- **THEN** heat SHALL increase by specified amount
- **AND** new heat level SHALL be highlighted
- **AND** modifiers SHALL update if threshold crossed
- **AND** haptic feedback SHALL trigger if shutdown threshold crossed

#### Scenario: Heat dissipation
- **GIVEN** current heat level
- **WHEN** user ends turn
- **THEN** heat SHALL decrease by heat sink capacity
- **AND** cooling animation SHALL play
- **AND** new heat level SHALL be shown
- **AND** modifiers SHALL update

#### Scenario: Clickable heat sinks
- **ALTERNATIVELY GIVEN** heat sink tracking is interactive
- **WHEN** user taps heat sink
- **THEN** heat sink SHALL be marked as used
- **AND** heat capacity SHALL decrease
- **AND** visual feedback SHALL show depletion
- **AND** tap SHALL toggle state

#### Scenario: Heat threshold warnings
- **GIVEN** heat approaches critical levels
- **WHEN** heat crosses threshold
- **THEN** warning SHALL be displayed
- **AND** warning SHALL indicate consequence
- **AND** ammo explosion risk SHALL be shown at threshold
- **AND** shutdown risk SHALL be shown at threshold

#### Scenario: Overheat mechanics
- **GIVEN** heat exceeds capacity
- **WHEN** user continues to add heat
- **THEN** shutdown roll SHALL be required
- **AND** automatic shutdown warning SHALL appear
- **AND** ammo explosion risk SHALL increase
- **AND** effects SHALL be clearly indicated

### Requirement: Ammo Consumption Tracking
The system SHALL track ammunition usage during gameplay.

#### Scenario: Ammo bin display
- **GIVEN** unit with ammunition
- **WHEN** gameplay sheet renders
- **THEN** each ammo bin SHALL be displayed
- **AND** remaining shots SHALL be shown
- **AND** bin location SHALL be indicated
- **AND** weapon using ammo SHALL be linked

#### Scenario: Ammo expenditure
- **GIVEN** weapon is fired
- **WHEN** user records weapon fire
- **THEN** ammo SHALL decrease by shots fired
- **AND** remaining count SHALL update
- **AND** bin SHALL be highlighted if low
- **AND** empty indication SHALL show when depleted

#### Scenario: Ammo bin depletion
- **GIVEN** ammo bin reaches 0 shots
- **WHEN** weapon attempts to fire
- **THEN** system SHALL prevent firing
- **AND** out of ammo warning SHALL display
- **AND** affected weapons SHALL be highlighted
- **AND** user SHALL be prompted to reload or switch

#### Scenario: Ammo explosion tracking
- **GIVEN** ammo bin takes critical hit
- **WHEN** critical destroys ammo
- **THEN** system SHALL prompt for explosion check
- **AND** explosion damage SHALL be calculated
- **AND** damage SHALL be applied to location
- **AND** bin SHALL be marked as destroyed

#### Scenario: Half-ammo loads
- **GIVEN** unit with half-ammo per ton
- **WHEN** ammo is configured
- **THEN** system SHALL display correct shot count
- **AND** shots per ton SHALL match construction
- **AND** tracking SHALL account for half loads
- **AND** display SHALL indicate half ammo

### Requirement: Critical Hit Tracking
The system SHALL track critical hits and component status.

#### Scenario: Critical slot display
- **GIVEN** unit critical slots
- **WHEN** gameplay sheet renders
- **THEN** slots SHALL show component status
- **AND** operational slots SHALL be normal
- **AND** damaged slots SHALL be marked
- **AND** destroyed slots SHALL be struck through

#### Scenario: Critical hit marker
- **GIVEN** location takes critical hit
- **WHEN** user rolls critical hit
- **THEN** system SHALL display critical hit table
- **AND** user SHALL select hit result
- **AND** affected slot SHALL be marked
- **AND** component effects SHALL be shown

#### Scenario: Multiple critical hits
- **GIVEN** location with existing damage
- **WHEN** additional critical hit occurs
- **THEN** system SHALL show undamaged slots only
- **OR** system SHALL allow reroll if all slots damaged
- **AND** roll shall respect existing damage
- **AND** system SHALL prevent duplicate hits

#### Scenario: Critical hit effects
- **GIVEN** component is critically hit
- **WHEN** damage is applied
- **THEN** system SHALL calculate effect
- **AND** weapon destruction SHALL remove from firing list
- **AND** engine hit SHALL increase heat
- **AND** gyro hit SHALL affect piloting
- **AND** ammo hit SHALL trigger explosion check

#### Scenario: Critical hit repair
- **GIVEN** critically hit component
- **WHEN** repair is attempted
- **THEN** system SHALL check repair rules
- **AND** appropriate roll shall be required
- **AND** success SHALL restore component
- **AND** failure SHALL maintain damage

### Requirement: Game State Persistence
The system SHALL save and load game state.

#### Scenario: Game state saving
- **GIVEN** game is in progress
- **WHEN** user saves game
- **THEN** current state SHALL be saved
- **AND** timestamp SHALL be recorded
- **AND** unit state SHALL be preserved
- **AND** game ID SHALL be generated

#### Scenario: Game state loading
- **GIVEN** saved game exists
- **WHEN** user loads game
- **THEN** saved state SHALL be restored
- **AND** damage SHALL be as saved
- **AND** heat SHALL be as saved
- **AND** turn counter SHALL be restored

#### Scenario: Auto-save
- **GIVEN** game is in progress
- **WHEN** significant action occurs
- **THEN** system SHALL auto-save state
- **AND** auto-save SHALL be silent
- **AND** recovery SHALL be possible on crash
- **AND** multiple auto-saves SHALL be kept

#### Scenario: Multiple game slots
- **GIVEN** player plays multiple games
- **WHEN** saving games
- **THEN** system SHALL support multiple save slots
- **AND** each slot SHALL have unit and timestamp
- **AND** player SHALL name save
- **AND** saves SHALL be manageable

### Requirement: State Sharing
The system SHALL enable sharing unit game state.

#### Scenario: JSON export
- **GIVEN** game in progress
- **WHEN** user exports state
- **THEN** system SHALL generate JSON
- **AND** JSON SHALL contain all game state
- **AND** JSON SHALL include unit configuration
- **AND** JSON SHALL be downloadable

#### Scenario: JSON import
- **GIVEN** exported game state JSON
- **WHEN** user imports file
- **THEN** system SHALL validate JSON structure
- **AND** state SHALL be restored
- **AND** unit SHALL match configuration
- **AND** game SHALL continue from saved point

#### Scenario: State sharing via link
- **ALTERNATIVELY GIVEN** cloud sync is available
- **WHEN** user shares game state
- **THEN** system SHALL generate shareable link
- **AND** link SHALL encode state in URL
- **AND** receiving player SHALL import via link
- **AND** state SHALL be validated on import

### Requirement: Turn Tracking
The system SHALL track game turns and initiative.

#### Scenario: Turn counter
- **GIVEN** game begins
- **WHEN** turn starts
- **THEN** turn number SHALL be displayed
- **AND** counter SHALL increment each turn
- **AND** player SHALL be able to manually adjust
- **AND** turn SHALL be saved in state

#### Scenario: Initiative tracking
- **GIVEN** multiple units in play
- **WHEN** initiative is rolled
- **THEN** player SHALL record initiative
- **AND** move order SHALL be displayed
- **AND** current unit SHALL be highlighted
- **AND** turn SHALL pass to next unit

#### Scenario: Phase tracking
- **GIVEN** turn in progress
- **WHEN** user moves through phases
- **THEN** system SHALL track phases (Move, Fire, Physical, End)
- **AND** current phase SHALL be highlighted
- **AND** phase-specific actions SHALL be enabled
- **AND** phase SHALL advance manually

### Requirement: Undo/Redo
The system SHALL support undo and redo for game actions.

#### Scenario: Undo stack
- **GIVEN** game action is performed
- **WHEN** user undoes action
- **THEN** previous state SHALL be restored
- **AND** action SHALL be reversible
- **AND** undo stack SHALL be maintained
- **AND** multiple undos SHALL be possible

#### Scenario: Redo after undo
- **GIVEN** action has been undone
- **WHEN** user redoes action
- **THEN** undone action SHALL be reapplied
- **AND** state SHALL move forward
- **AND** redo stack SHALL be maintained
- **AND** redos SHALL be cleared on new action

#### Scenario: Action confirmation
- **GIVEN** destructive action
- **WHEN** action would be hard to undo
- **THEN** system SHALL warn user
- **AND** confirmation SHALL be required
- **AND** user SHALL be informed of consequences
- **AND** action SHALL be cancelable

### Requirement: Reset Between Games
The system SHALL support resetting unit for new game.

#### Scenario: Full reset
- **GIVEN** game is complete
- **WHEN** user resets unit
- **THEN** all damage SHALL be cleared
- **AND** heat SHALL return to 0
- **AND** ammo SHALL be restored
- **AND** critical hits SHALL be removed

#### Scenario: Reset confirmation
- **GIVEN** reset is requested
- **WHEN** game has progress
- **THEN** system SHALL confirm reset
- **THEN** warning SHALL explain data loss
- **AND** user SHALL explicitly confirm
- **AND** reset SHALL be cancelable

#### Scenario: Reset while preserving
- **GIVEN** player wants new game
- **WHEN** reset is performed
- **THEN** system SHALL offer to save current state
- **AND** save SHALL be auto-named
- **AND** reset SHALL proceed after save
- **AND** new game SHALL start fresh

### Requirement: Mobile Optimization
The system SHALL optimize gameplay sheet for mobile devices.

#### Scenario: Touch-friendly pips
- **GIVEN** mobile viewport
- **WHEN** armor pips display
- **THEN** each pip SHALL be 44x44px minimum
- **AND** pips SHALL be spaced for easy tapping
- **AND** tap SHALL register reliably
- **AND** haptic feedback SHALL confirm

#### Scenario: Swipe navigation
- **GIVEN** gameplay sheet on mobile
- **WHEN** user swipes between sections
- **THEN** sections SHALL slide smoothly
- **AND** gesture threshold SHALL be 50px
- **AND** swipe SHALL be responsive
- **AND** animation SHALL be 60fps

#### Scenario: Compact mode
- **GIVEN** small mobile screen
- **WHEN** sheet renders
- **THEN** system SHALL use compact layout
- **AND** sections SHALL be collapsible
- **AND** critical info SHALL be prioritized
- **AND** detail view SHALL be available on tap

### Requirement: Offline Gameplay
The system SHALL support offline gameplay.

#### Scenario: Offline state management
- **GIVEN** device is offline
- **WHEN** gameplay sheet is used
- **THEN** all features SHALL work offline
- **AND** state SHALL be saved locally
- **AND** no network dependency SHALL exist
- **AND** gameplay SHALL not be interrupted

#### Scenario: Sync when online
- **GIVEN** offline game state
- **WHEN** device reconnects
- **THEN** system SHALL offer to sync
- **AND** saves SHALL upload to cloud
- **AND** conflicts SHALL be resolved
- **AND** user SHALL be prompted

### Requirement: Visual Feedback
The system SHALL provide clear visual feedback for all actions.

#### Scenario: Damage animation
- **GIVEN** armor pip is marked
- **WHEN** damage occurs
- **THEN** visual effect SHALL play
- **AND** effect SHALL be red/orange flash
- **AND** animation SHALL be 200ms
- **AND** feedback SHALL be clear

#### Scenario: Critical hit effect
- **GIVEN** critical hit occurs
- **WHEN** hit is applied
- **THEN** slot SHALL highlight
- **AND** effect SHALL be dramatic
- **AND** sound/haptic MAY play
- **AND** impact SHALL be felt

#### Scenario: Heat color coding
- **GIVEN** heat scale is displayed
- **WHEN** heat increases
- **THEN** color SHALL shift (green → yellow → orange → red)
- **AND** transition SHALL be smooth
- **AND** danger SHALL be visually apparent
- **AND** accessibility SHALL be maintained

### Requirement: Cross-Platform Sync
The system SHALL sync gameplay across devices.

#### Scenario: Desktop to mobile
- **GIVEN** game started on desktop
- **WHEN** user opens on mobile
- **THEN** state SHALL be synced
- **AND** layout SHALL adapt
- **AND** progress SHALL be preserved
- **AND** gameplay SHALL continue

#### Scenario: Real-time sync
- **GIVEN** cloud sync enabled
- **WHEN** action is performed
- **THEN** state SHALL sync immediately
- **AND** other devices SHALL update
- **AND** conflict resolution SHALL handle concurrent edits
- **AND** last-write-wins with warning MAY be used
