## ADDED Requirements

### Requirement: Global Style Application

The system SHALL apply user settings to CSS custom properties on the document root.

#### Scenario: Accent color application

- **WHEN** user selects an accent color
- **THEN** `--accent-primary` CSS variable is set to the color's primary value
- **AND** `--accent-hover` is set to the darker hover variant
- **AND** `--accent-muted` is set to the 15% opacity variant
- **AND** changes apply immediately without page reload

#### Scenario: UI theme application

- **WHEN** user selects a UI theme
- **THEN** `theme-{name}` class is applied to document body
- **AND** previous theme class is removed
- **AND** theme-specific CSS rules take effect

#### Scenario: Font size application

- **WHEN** user selects a font size
- **THEN** `--font-size-base` CSS variable is updated
- **AND** components using the variable reflect the change

#### Scenario: Reduced motion application

- **WHEN** user enables reduce motion
- **THEN** `reduce-motion` class is applied to document body
- **AND** animations are disabled via CSS

### Requirement: GlobalStyleProvider Component

The system SHALL provide a GlobalStyleProvider component that connects settings to styles.

#### Scenario: Provider initialization

- **WHEN** app loads
- **THEN** GlobalStyleProvider reads current settings from store
- **AND** applies all CSS variables to document root
- **AND** applies theme class to body

#### Scenario: Provider reactivity

- **WHEN** any relevant setting changes
- **THEN** provider updates CSS variables within same render cycle
- **AND** no page reload is required

## MODIFIED Requirements

### Requirement: Settings Page

The system SHALL provide a dedicated settings page accessible from the sidebar.

#### Scenario: Settings page access

- **WHEN** user clicks Settings in the sidebar
- **THEN** the settings page is displayed at /settings
- **AND** settings are organized into logical sections
- **AND** current values are pre-populated from stored preferences

#### Scenario: Toggle component display

- **WHEN** toggle controls are rendered
- **THEN** they display with rectangular tactical styling
- **AND** track is 24px tall by 44px wide with rounded-md corners
- **AND** knob is 16px square with rounded-sm corners
- **AND** knob is vertically centered in track
- **AND** checked state uses accent color from CSS variable

### Requirement: Appearance Settings

The system SHALL provide appearance customization options.

#### Scenario: Accent color selection

- **WHEN** user views appearance settings
- **THEN** 6 accent color options are available:
  - Amber (default)
  - Cyan
  - Emerald
  - Rose
  - Violet
  - Blue
- **AND** clicking a color applies it immediately
- **AND** selection is visually indicated using the accent color itself

#### Scenario: UI theme selection

- **WHEN** user views appearance settings
- **THEN** 4 UI theme options are displayed in a 2x2 grid:
  - Default (clean slate design)
  - Neon (cyberpunk with glow effects)
  - Tactical (military HUD style)
  - Minimal (reduced visual noise)
- **AND** selecting a theme applies it immediately
- **AND** selection indicator uses accent color

#### Scenario: Font size selection

- **WHEN** user selects font size
- **THEN** options are: Small (14px), Medium (16px), Large (18px)
- **AND** selection applies to base font size across app

#### Scenario: Animation level

- **WHEN** user selects animation level
- **THEN** options are: Full, Reduced, None
- **AND** selection controls transition and animation behavior

#### Scenario: Compact mode

- **WHEN** user enables compact mode
- **THEN** spacing and padding are reduced throughout the app
- **AND** more information fits on screen
