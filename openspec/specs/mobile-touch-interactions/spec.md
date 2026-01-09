# mobile-touch-interactions Specification

## Purpose
Implement touch-first interaction patterns that replace desktop hover/drag patterns with mobile-optimized tap, swipe, and long-press interactions while maintaining dual-mode support for devices with both input types.

## Requirements

### Requirement: Dual-Mode Interaction System
The system SHALL automatically detect input type and switch interaction patterns.

#### Scenario: Mouse detection
- **GIVEN** device with mouse input
- **WHEN** media query (hover: hover) matches
- **THEN** system SHALL enable desktop interaction patterns
- **AND** hover states SHALL be active
- **AND** react-dnd drag-and-drop SHALL be enabled
- **AND** tooltips SHALL be available

#### Scenario: Touch detection
- **GIVEN** device with touch input
- **WHEN** 'ontouchstart' exists in window
- **THEN** system SHALL enable mobile interaction patterns
- **AND** hover states SHALL be disabled
- **AND** tap-to-place SHALL replace drag-and-drop
- **AND** tooltips SHALL be disabled

#### Scenario: Pointer type detection
- **GIVEN** device with both mouse and touch
- **WHEN** user interaction occurs
- **THEN** system SHALL detect pointer type on each interaction
- **AND** touch interactions SHALL use touch patterns
- **AND** mouse interactions SHALL use mouse patterns
- **AND** patterns SHALL switch dynamically

#### Scenario: Desktop touchscreen behavior
- **GIVEN** desktop device with touchscreen
- **WHEN** user touches screen
- **THEN** touch patterns SHALL activate
- **AND** tap targets SHALL be 44x44px minimum
- **AND** system SHALL NOT assume hover capability

### Requirement: EquipmentAssignmentAdapter Component
The system SHALL provide an adapter component that switches between drag-and-drop and tap-to-place.

#### Scenario: Desktop drag-and-drop mode
- **GIVEN** mouse device detected
- **WHEN** user drags equipment item
- **THEN** system SHALL use react-dnd HTML5Backend
- **AND** drag preview SHALL be visible
- **AND** drop targets SHALL highlight
- **AND** hover states SHALL show valid slots

#### Scenario: Mobile tap-to-place mode
- **GIVEN** touch device detected
- **WHEN** user taps equipment item
- **THEN** system SHALL enter placement mode
- **AND** equipment item SHALL be highlighted
- **AND** valid slots SHALL be highlighted
- **AND** tap SHALL NOT trigger drag

#### Scenario: Tap-to-place completion
- **GIVEN** placement mode is active
- **WHEN** user taps valid slot
- **THEN** equipment SHALL be assigned to slot
- **AND** placement mode SHALL exit
- **AND** success feedback SHALL be shown
- **AND** haptic pulse SHALL trigger (Vibration API)

#### Scenario: Tap-to-place cancellation
- **GIVEN** placement mode is active
- **WHEN** user taps outside slot or cancel button
- **THEN** placement mode SHALL exit
- **AND** equipment SHALL NOT be assigned
- **AND** highlights SHALL be removed
- **AND** UI SHALL return to normal state

#### Scenario: Invalid slot feedback
- **GIVEN** placement mode is active
- **WHEN** user taps invalid slot
- **THEN** system SHALL show error indication
- **AND** placement mode SHALL remain active
- **AND** haptic error pulse SHALL trigger
- **AND** message SHALL explain why invalid

### Requirement: Touch Target Sizing
The system SHALL ensure all interactive elements meet minimum touch target size.

#### Scenario: useTouchTarget hook
- **GIVEN** interactive component
- **WHEN** component needs touch target sizing
- **THEN** hook SHALL add padding without affecting layout
- **AND** final size SHALL be 44x44px minimum
- **AND** visual size SHALL remain unchanged
- **AND** hit area SHALL expand invisibly

#### Scenario: Button touch targets
- **GIVEN** mobile viewport
- **WHEN** button renders
- **THEN** button SHALL have min-height: 44px
- **AND** button SHALL have min-width: 44px
- **AND** padding SHALL ensure 44px if smaller
- **AND** touch SHALL register anywhere in 44px area

#### Scenario: Link touch targets
- **GIVEN** mobile viewport
- **WHEN** link renders
- **THEN** link SHALL have min-height: 44px
- **AND** link SHALL have min-width: 44px
- **AND** tap SHALL register on icon or text
- **AND** hit area SHALL extend beyond visual bounds

#### Scenario: Small control expansion
- **GIVEN** small control (e.g., checkbox, radio)
- **WHEN** control renders on mobile
- **THEN** visual size MAY be smaller than 44px
- **AND** hit area SHALL be 44x44px minimum
- **AND** invisible padding SHALL expand hit area
- **AND** tap SHALL register on padding

### Requirement: Haptic Feedback
The system SHALL provide haptic feedback for touch interactions using Vibration API.

#### Scenario: Equipment assigned feedback
- **GIVEN** equipment assigned successfully
- **WHEN** assignment completes
- **THEN** system SHALL trigger short vibration pulse
- **AND** vibration duration SHALL be 50ms
- **AND** vibration SHALL be subtle acknowledgment

#### Scenario: Save complete feedback
- **GIVEN** user saves unit
- **WHEN** save operation succeeds
- **THEN** system SHALL trigger confirmation vibration
- **AND** vibration pattern SHALL be 100ms on, 50ms off, 100ms on
- **AND** pattern SHALL indicate success

#### Scenario: Error feedback
- **GIVEN** invalid operation attempted
- **WHEN** validation fails
- **THEN** system SHALL trigger error pulse
- **AND** vibration SHALL be 200ms duration
- **AND** pattern SHALL be distinctive from success

#### Scenario: Haptic fallback
- **GIVEN** device without vibration support
- **WHEN** haptic feedback is triggered
- **THEN** system SHALL check navigator.vibrate exists
- **AND** system SHALL gracefully skip if unavailable
- **AND** UI feedback SHALL still be provided

### Requirement: Swipe Gestures
The system SHALL support swipe gestures for navigation.

#### Scenario: Tab navigation swipe
- **GIVEN** editor tabs visible on mobile
- **WHEN** user swipes left or right
- **THEN** system SHALL detect swipe direction
- **AND** adjacent tab SHALL become active
- **AND** transition SHALL follow swipe direction
- **AND** gesture threshold SHALL be 50px

#### Scenario: Panel back swipe
- **GIVEN** panel stack has history
- **WHEN** user swipes from left edge
- **THEN** system SHALL detect back gesture
- **AND** previous panel SHALL slide in
- **AND** gesture threshold SHALL be 100px
- **AND** swipe SHALL follow iOS convention

#### Scenario: Swipe gesture detection
- **GIVEN** touch start is recorded
- **WHEN** touch moves
- **THEN** system SHALL calculate delta X and Y
- **AND** system SHALL distinguish swipe from scroll
- **AND** horizontal movement SHALL trigger navigation
- **AND** vertical movement SHALL scroll content

#### Scenario: Swipe cancellation
- **GIVEN** swipe gesture in progress
- **WHEN** user changes direction or lifts early
- **THEN** system SHALL cancel swipe
- **AND** panel SHALL return to original position
- **AND** navigation SHALL NOT occur

### Requirement: Long-Press Context Menus
The system SHALL support long-press for secondary actions on mobile.

#### Scenario: Equipment long-press
- **GIVEN** equipment item in list
- **WHEN** user long-presses (500ms+)
- **THEN** context menu SHALL appear
- **AND** menu SHALL show secondary actions (e.g., details, compare)
- **AND** menu SHALL be positioned near touch
- **AND** tap outside SHALL dismiss menu

#### Scenario: Unit long-press
- **GIVEN** unit in catalog
- **WHEN** user long-presses
- **THEN** context menu SHALL appear
- **AND** menu SHALL show actions (edit, duplicate, delete)
- **AND** menu SHALL respect canonical protection
- **AND** destructive actions SHALL require confirmation

#### Scenario: Long-press feedback
- **GIVEN** user begins long-press
- **WHEN** 300ms elapses
- **THEN** visual feedback SHALL be shown
- **AND** haptic feedback SHALL trigger
- **AND** item SHALL highlight or scale
- **AND** user SHALL know menu is coming

#### Scenario: Long-press vs tap
- **GIVEN** item supports both actions
- **WHEN** user taps (<500ms)
- **THEN** primary action SHALL execute
- **AND** context menu SHALL NOT appear
- **AND** timing SHALL distinguish gestures

### Requirement: Modal Sheets and Drawers
The system SHALL use bottom sheets and drawers for secondary content on mobile.

#### Scenario: Bottom sheet display
- **GIVEN** secondary content needed
- **WHEN** sheet is triggered
- **THEN** sheet SHALL slide up from bottom
- **AND** sheet SHALL occupy 80% of screen height
- **AND** dimmed overlay SHALL appear behind
- **AND** tap on overlay SHALL dismiss sheet

#### Scenario: Filter drawer
- **GIVEN** equipment browser on mobile
- **WHEN** user taps filter button
- **THEN** filter drawer SHALL slide up
- **AND** drawer SHALL contain all filter controls
- **AND** filters SHALL be vertically stacked
- **AND** apply button SHALL be at bottom

#### Scenario: Collapsible drawer
- **GIVEN** drawer is open
- **WHEN** user swipes down on handle
- **THEN** drawer SHALL follow gesture
- **AND** drawer SHALL dismiss if swiped past threshold
- **AND** drawer SHALL snap back if threshold not met
- **AND** gesture SHALL feel physical

#### Scenario: Drawer safe area
- **GIVEN** bottom sheet is visible
- **WHEN** device has home indicator
- **THEN** sheet SHALL have safe-area padding at bottom
- **AND** controls SHALL not overlap home indicator
- **AND** dismiss handle SHALL be above safe area

### Requirement: Touch Action Manipulation
The system SHALL prevent unwanted browser zoom and scroll behaviors.

#### Scenario: Button touch action
- **GIVEN** button on mobile
- **WHEN** user taps button
- **THEN** touch-action SHALL be manipulation
- **AND** double-tap zoom SHALL be prevented
- **AND** tap delay SHALL be eliminated
- **AND** button SHALL activate immediately

#### Scenario: Slider touch action
- **GIVEN** range slider input
- **WHEN** user drags thumb
- **THEN** touch-action SHALL allow pan-x
- **AND** page scroll SHALL be disabled during drag
- **AND** slider SHALL respond to gesture
- **AND** value SHALL update smoothly

#### Scenario: Scrollable area touch
- **GIVEN** horizontally scrollable list
- **WHEN** user scrolls
- **THEN** touch-action SHALL allow pan-y
- **AND** vertical scroll SHALL work
- **AND** horizontal scroll SHALL work
- **AND** page scroll SHALL be isolated

### Requirement: Sticky Controls
The system SHALL keep primary actions visible during scroll.

#### Scenario: Bottom action bar
- **GIVEN** editor screen on mobile
- **WHEN** user scrolls content
- **THEN** Save/Export buttons SHALL remain visible
- **AND** bar SHALL be fixed at bottom
- **AND** bar SHALL have safe-area padding
- **AND** bar SHALL not cover content

#### Scenario: Sticky search bar
- **GIVEN** equipment browser on mobile
- **WHEN** user scrolls results
- **THEN** search bar SHALL remain at top
- **AND** bar SHALL use position: sticky
- **AND** bar SHALL have subtle shadow
- **AND** bar SHALL not overlap safe areas

#### Scenario: Collapsible sticky header
- **GIVEN** long scrollable list
- **WHEN** user scrolls down
- **THEN** header SHALL shrink or collapse
- **AND** header SHALL show minimal info
- **AND** scroll up SHALL expand header
- **AND** animation SHALL be smooth

### Requirement: Accessibility
The system SHALL maintain accessibility with touch interactions.

#### Scenario: Screen reader touch
- **GIVEN** screen reader is active
- **WHEN** user touches element
- **THEN** element SHALL be announced
- **AND** double-tap SHALL activate
- **AND** focus indicator SHALL be visible
- **AND** context SHALL be clear

#### Scenario: Keyboard touch alternative
- **GIVEN** external keyboard on mobile
- **WHEN** user uses keyboard
- **THEN** tab key SHALL navigate elements
- **AND** enter key SHALL activate
- **AND** escape key SHALL cancel/go back
- **AND** focus SHALL be visible

#### Scenario: Voice control compatibility
- **GIVEN** voice control is active
- **WHEN** user speaks command
- **THEN** tap-to-place SHALL have voice alternative
- **AND** commands SHALL be labeled
- **AND** actions SHALL be discoverable
- **AND** feedback SHALL be provided

### Requirement: Performance
The system SHALL maintain smooth touch interactions.

#### Scenario: Touch response time
- **GIVEN** user taps element
- **WHEN** touch is registered
- **THEN** visual feedback SHALL appear within 16ms (1 frame)
- **AND** activation SHALL be instant
- **AND** no lag SHALL be perceived

#### Scenario: Gesture frame rate
- **GIVEN** user swipes or drags
- **WHEN** gesture is in progress
- **THEN** UI SHALL update at 60fps
- **AND** frame drops SHALL be minimized
- **AND** gesture SHALL feel responsive

#### Scenario: Animation performance
- **GIVEN** touch-triggered animation
- **WHEN** animation plays
- **THEN** transform SHALL be GPU-accelerated
- **AND** layout SHALL not be recalculated
- **AND** animation SHALL be smooth
