# mobile-component-redesigns Specification

## Purpose
Redesign critical UI components (Armor Allocation, Equipment Browser, Critical Slots) with mobile-first responsive layouts using CSS Grid and modern patterns.

## Requirements

### Requirement: Armor Allocation CSS Grid Redesign
The system SHALL replace SVG-based armor diagram with CSS Grid component.

#### Scenario: Location component structure
- **GIVEN** armor allocation interface
- **WHEN** rendering armor location
- **THEN** component SHALL display location name label
- **AND** component SHALL show current/max armor display
- **AND** component SHALL provide interactive armor controls
- **AND** component SHALL use semantic HTML structure

#### Scenario: Desktop silhouette layout
- **GIVEN** viewport width 1024px+
- **WHEN** armor diagram renders
- **THEN** CSS Grid SHALL approximate human silhouette
- **AND** head SHALL be centered at top
- **AND** center torso SHALL be below head
- **AND** side torsos SHALL flank center torso
- **AND** arms SHALL be on sides
- **AND** legs SHALL be at bottom
- **AND** layout SHALL use CSS Grid areas

#### Scenario: Mobile vertical stack
- **GIVEN** viewport width <768px
- **WHEN** armor diagram renders
- **THEN** locations SHALL stack vertically
- **AND** order SHALL be: Head, Torso, Arms, Legs
- **AND** each location SHALL be expandable card
- **AND** card SHALL be full-width with padding

#### Scenario: Front/rear armor toggle
- **GIVEN** armor location component
- **WHEN** user toggles front/rear view
- **THEN** display SHALL switch between front and rear armor
- **AND** toggle SHALL be visible on mobile
- **AND** desktop MAY show split view
- **AND** current selection SHALL be clear

#### Scenario: Quick-add buttons
- **GIVEN** armor location is expanded
- **WHEN** user needs to add armor
- **THEN** quick-add buttons SHALL be visible
- **AND** buttons SHALL add +5, +10, +20, Max
- **AND** buttons SHALL be immediately actionable
- **AND** buttons SHALL respect max armor limit

#### Scenario: Fine-tune stepper controls
- **GIVEN** armor location is expanded
- **WHEN** user needs precise adjustment
- **THEN** stepper controls SHALL be visible
- **AND** [-] button SHALL decrease by 1
- **AND** [+] button SHALL increase by 1
- **AND** current value SHALL be displayed
- **AND** controls SHALL respect armor limits

#### Scenario: Auto-allocate dropdown
- **GIVEN** armor allocation interface
- **WHEN** user needs balanced armor
- **THEN** auto-allocate dropdown SHALL be available
- **AND** options SHALL include: Front-weighted, Rear-weighted, Even
- **AND** selection SHALL distribute armor automatically
- **AND** distribution SHALL match BattleTech rules

#### Scenario: Visual progress bars
- **GIVEN** armor location component
- **WHEN** armor is allocated
- **THEN** progress bar SHALL show percentage of max
- **AND** bar SHALL be colored (amber for partial, green for max)
- **AND** bar SHALL be animated
- **AND** bar SHALL be accessible (ARIA attributes)

#### Scenario: CSS Grid implementation
- **GIVEN** desktop armor diagram
- **WHEN** layout is rendered
- **THEN** display SHALL be grid
- **AND** grid-template-areas SHALL define silhouette
- **AND** gaps SHALL be consistent (0.5rem)
- **AND** areas SHALL be responsive to container size

#### Scenario: Armor pips display
- **GIVEN** armor location on mobile
- **WHEN** location renders
- **THEN** pips MAY be shown as compact numeric display
- **OR** pips MAY be interactive dots
- **AND** display SHALL fit mobile width
- **AND** tapping location SHALL expand details

### Requirement: Equipment Browser Master-Detail Pattern
The system SHALL implement master-detail pattern for equipment browser on mobile.

#### Scenario: Full-screen catalog list
- **GIVEN** mobile viewport in equipment browser
- **WHEN** browser loads
- **THEN** catalog SHALL occupy full screen
- **AND** list SHALL be scrollable
- **AND** search bar SHALL be sticky at top
- **AND** filters SHALL be in collapsible drawer

#### Scenario: Sticky search bar
- **GIVEN** equipment list on mobile
- **WHEN** user scrolls results
- **THEN** search bar SHALL remain visible
- **AND** bar SHALL use position: sticky
- **AND** bar SHALL have top: 0
- **AND** bar SHALL have safe-area padding

#### Scenario: List item sizing
- **GIVEN** equipment list on mobile
- **WHEN** items render
- **THEN** each item SHALL be 44px minimum height
- **AND** items SHALL be full-width
- **AND** items SHALL have padding (1rem)
- **AND** tap target SHALL be entire row

#### Scenario: Detail view transition
- **GIVEN** user is on catalog list
- **WHEN** user taps equipment item
- **THEN** detail view SHALL slide in from right
- **AND** transition SHALL be animated (300ms)
- **AND** back button SHALL be visible
- **AND** navigation SHALL add to history

#### Scenario: Detail view content
- **GIVEN** equipment detail view
- **WHEN** view renders
- **THEN** equipment name SHALL be prominent
- **AND** stats SHALL be in sections
- **AND** description SHALL be scrollable
- **AND** actions SHALL be at bottom

#### Scenario: Filter drawer
- **GIVEN** equipment browser on mobile
- **WHEN** user taps filter button
- **THEN** filter drawer SHALL slide up from bottom
- **AND** drawer SHALL be 80% screen height
- **AND** filters SHALL be vertically stacked
- **AND** apply button SHALL be at bottom with safe-area padding

#### Scenario: Filter state persistence
- **GIVEN** user has applied filters
- **WHEN** user navigates to detail and back
- **THEN** filters SHALL remain applied
- **AND** list SHALL not reset
- **AND** search SHALL be preserved
- **AND** scroll position SHALL be maintained

#### Scenario: Horizontal scrolling categories
- **GIVEN** equipment browser on mobile
- **WHEN** category filters are shown
- **THEN** categories SHALL be horizontally scrollable
- **AND** overflow-x SHALL be scroll
- **AND** snap-scrolling MAY be used
- **AND** active category SHALL be highlighted

### Requirement: Critical Slots Mobile View
The system SHALL adapt critical slot display for mobile devices.

#### Scenario: Location-by-location tabs
- **GIVEN** mobile viewport viewing critical slots
- **WHEN** slots display
- **THEN** tabs SHALL be shown for each location
- **AND** tabs SHALL be: Head, CT, LT, RT, LA, RA, LL, RL
- **AND** active tab SHALL show that location's slots
- **AND** tabs SHALL be horizontally scrollable

#### Scenario: Slot card layout
- **GIVEN** location tab is active
- **WHEN** slots render
- **THEN** slots SHALL be in vertical list
- **AND** each slot SHALL be card with padding
- **AND** equipment name SHALL be prominent
- **AND** remove button SHALL be visible on filled slots

#### Scenario: Empty slot display
- **GIVEN** location with empty slots
- **WHEN** slot renders
- **THEN** slot SHALL show "Empty" label
- **AND** slot SHALL be tappable for equipment assignment
- **AND** slot SHALL indicate slot number
- **AND** slot SHALL be visually distinct

#### Scenario: Filled slot display
- **GIVEN** location with equipment
- **WHEN** slot renders
- **THEN** slot SHALL show equipment name
- **AND** slot SHALL show equipment type icon
- **AND** remove button SHALL be available
- **AND** slot SHALL be visually prominent

#### Scenario: Horizontal scrolling alternative
- **ALTERNATIVELY GIVEN** horizontal scroll is preferred
- **WHEN** slots display
- **THEN** all locations SHALL be horizontal sections
- **AND** sections SHALL be full-width
- **AND** user SHALL scroll horizontally between locations
- **AND** active location SHALL be centered

#### Scenario: Desktop grid view
- **GIVEN** viewport width 1024px+
- **WHEN** slots display
- **THEN** full grid view SHALL be shown
- **AND** all locations SHALL be visible
- **AND** layout SHALL match existing design
- **AND** drag-and-drop SHALL be enabled

### Requirement: Responsive Container Behavior
The system SHALL provide ResponsiveContainer for consistent mobile layout.

#### Scenario: Safe area insets
- **GIVEN** ResponsiveContainer wraps content
- **WHEN** rendering on notched device
- **THEN** padding SHALL include safe-area-inset
- **AND** content SHALL not overlap notch
- **AND** content SHALL not overlap home indicator
- **AND** env() variables SHALL be used

#### Scenario: Breakpoint-aware layout
- **GIVEN** ResponsiveContainer wraps panel
- **WHEN** viewport crosses breakpoint
- **THEN** layout SHALL adapt automatically
- **AND** single-panel SHALL become multi-panel at 768px+
- **AND** transitions SHALL be smooth
- **AND** content SHALL reflow

#### Scenario: Scroll isolation
- **GIVEN** ResponsiveContainer with scrollable content
- **WHEN** user scrolls
- **THEN** container SHALL isolate scroll
- **AND** parent SHALL not scroll
- **AND** overflow SHALL be handled correctly
- **AND** momentum scroll SHALL work on iOS

### Requirement: Armor Allocation Touch Interactions
The system SHALL optimize armor allocation for touch input.

#### Scenario: Tap to expand location
- **GIVEN** stacked armor locations on mobile
- **WHEN** user taps location card
- **THEN** card SHALL expand to show controls
- **AND** expansion SHALL be animated
- **AND** tap outside SHALL collapse
- **AND** state SHALL persist until collapse

#### Scenario: Swipe to change front/rear
- **ALTERNATIVELY GIVEN** swipe gesture is preferred
- **WHEN** user swipes left/right on location
- **THEN** display SHALL toggle front/rear armor
- **AND** animation SHALL follow swipe direction
- **AND** current mode SHALL be clear
- **AND** tap SHALL still work

#### Scenario: Quick-add tap targets
- **GIVEN** expanded armor location
- **WHEN** quick-add buttons are shown
- **THEN** each button SHALL be 44px minimum
- **AND** buttons SHALL be spaced for easy tapping
- **AND** tap SHALL immediately add armor
- **AND** haptic feedback SHALL trigger

#### Scenario: Stepper accessibility
- **GIVEN** armor stepper controls
- **WHEN** user repeatedly taps [-] or [+]
- **THEN** value SHALL update on each tap
- **AND** tap delay SHALL be minimal
- **AND** buttons SHALL not trigger zoom
- **AND** limits SHALL be enforced

### Requirement: Equipment Browser Touch Interactions
The system SHALL optimize equipment browser for touch input.

#### Scenario: List item tap activation
- **GIVEN** equipment list on mobile
- **WHEN** user taps item
- **THEN** detail view SHALL open immediately
- **AND** tap feedback SHALL be instant
- **AND** hover state SHALL be skipped
- **AND** transition SHALL be smooth

#### Scenario: Pull to refresh
- **GIVEN** equipment list on mobile
- **WHEN** user pulls down from top
- **THEN** list SHALL show refresh indicator
- **AND** release SHALL trigger refresh
- **AND** data SHALL reload
- **AND** scroll position SHALL be restored

#### Scenario: Infinite scroll
- **GIVEN** equipment list with many items
- **WHEN** user scrolls to bottom
- **THEN** more items SHALL load automatically
- **AND** loading indicator SHALL be shown
- **AND** scroll SHALL continue smoothly
- **AND** performance SHALL be maintained

### Requirement: Critical Slots Touch Interactions
The system SHALL optimize critical slots for touch input.

#### Scenario: Tab switch with swipe
- **GIVEN** location tabs on mobile
- **WHEN** user swipes left/right
- **THEN** adjacent location tab SHALL activate
- **AND** content SHALL update
- **AND** animation SHALL follow swipe
- **AND** tabs SHALL be scrollable

#### Scenario: Slot removal confirmation
- **GIVEN** filled slot on mobile
- **WHEN** user taps remove button
- **THEN** confirmation dialog SHALL appear
- **AND** dialog SHALL be bottom sheet
- **AND** confirm SHALL remove equipment
- **AND** cancel SHALL dismiss

### Requirement: CSS Architecture
The system SHALL use Tailwind utilities for responsive design.

#### Scenario: Tailwind breakpoint usage
- **GIVEN** responsive component
- **WHEN** applying responsive styles
- **THEN** Tailwind prefixes SHALL be used (sm:, md:, lg:)
- **AND** custom breakpoints SHALL NOT be created
- **AND** utilities SHALL be consistent
- **AND** maintainability SHALL be high

#### Scenario: CSS Grid for layout
- **GIVEN** complex layout (armor diagram)
- **WHEN** layout is implemented
- **THEN** CSS Grid SHALL be used
- **AND** grid-template SHALL be responsive
- **AND** areas SHALL define structure
- **AND** Flexbox SHALL be used for alignment

#### Scenario: Animations with Tailwind
- **GIVEN** component transition
- **WHEN** animation is needed
- **THEN** Tailwind transition utilities SHALL be used
- **AND** duration SHALL be specified
- **AND** easing SHALL be specified
- **AND** performance SHALL be optimized (transform, opacity)

### Requirement: Accessibility
The system SHALL maintain accessibility in responsive redesigns.

#### Scenario: Semantic HTML
- **GIVEN** responsive component
- **WHEN** markup is rendered
- **THEN** semantic elements SHALL be used
- **AND** headings SHALL be hierarchical
- **AND** landmarks SHALL be present
- **AND** ARIA labels SHALL be provided

#### Scenario: Keyboard navigation
- **GIVEN** mobile layout with keyboard
- **WHEN** user uses keyboard
- **THEN** tab order SHALL be logical
- **AND** focus SHALL be visible
- **AND** enter/key SHALL activate
- **AND** escape SHALL cancel/close

#### Scenario: Screen reader support
- **GIVEN** screen reader is active
- **WHEN** user navigates
- **THEN** component changes SHALL be announced
- **AND** labels SHALL be descriptive
- **AND** state SHALL be communicated
- **AND** actions SHALL be clear
