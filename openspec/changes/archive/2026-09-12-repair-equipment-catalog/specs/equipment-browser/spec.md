## MODIFIED Requirements

### Requirement: Combined "Other" Category

The system SHALL treat Other as the remaining utility categories while providing Electronics as an independent primary filter.

#### Scenario: Independent Electronics selection

- **WHEN** Electronics is selected
- **THEN** the list includes Electronics and its explicit secondary classifications
- **AND** ammunition visibility does not determine whether Electronics can be found

#### Scenario: Other and multiple selection

- **WHEN** Other is selected or combined with another category
- **THEN** utility equipment and explicit secondary classifications are included
- **AND** Electronics requires independent selection or explicit Other classification
- **AND** Show All clears legacy and multiple-category restrictions

## ADDED Requirements

### Requirement: Ammunition compatibility filtering

The catalog SHALL use declared compatible weapon identities, with conservative exact identity matching for imported records lacking declarations, and SHALL not use partial weapon-name matches.

#### Scenario: Compatible mounted weapon

- **GIVEN** a mounted SRM, LRM, Gauss or Clan weapon is declared compatible
- **WHEN** hiding ammunition without a compatible weapon
- **THEN** its ammunition remains available subject to independent availability filters
- **AND** AC/2 does not admit AC/20 ammunition

#### Scenario: Missing imported compatibility metadata

- **GIVEN** imported ammunition lacks compatibility declarations
- **WHEN** matching mounted equipment
- **THEN** only a conservative exact identity or full normalized weapon-name match admits it
- **AND** explicit declarations take precedence over fallback

#### Scenario: No weapons or no unit

- **WHEN** a unit has no compatible weapons and unmatched ammunition is hidden
- **THEN** no ammunition is shown
- **AND** non-ammunition remains unaffected
- **WHEN** browsing without a unit
- **THEN** the filter does not assume an empty loadout

### Requirement: Current catalog results

The visible list, result count and pages SHALL reflect the same current filter and active-unit context.

#### Scenario: Weapon edits and unit switching

- **WHEN** weapons are added, removed, undone, redone or the active unit changes
- **THEN** compatible ammo updates without another filter interaction
- **AND** pagination uses the same filtered result and resets appropriately

#### Scenario: Independent visibility constraints

- **WHEN** category, search, prototype, one-shot or availability controls change
- **THEN** enabled constraints apply consistently
- **AND** ammo compatibility does not hide unrelated categories
- **AND** Show All leaves no invisible legacy category restriction

### Requirement: Translucent catalog rows

The catalog SHALL use translucent category-colored row backgrounds with opaque readable content and controls.

#### Scenario: Desktop and mobile catalog

- **WHEN** rows render in supported themes and viewport sizes
- **THEN** category colors remain recognizable without fully opaque fills
- **AND** text, focus, selection, details and Add controls remain readable and operable
- **AND** desktop headings and matching name, type, numeric and action cells share one six-column grid with a sticky header in the same scrolling region
- **AND** ordinary collapsed desktop rows are no taller than 48px while Add keeps a 44px hit target around a smaller plus control

### Requirement: Add and place from catalog

The catalog SHALL offer optional Add and place with preview and validation through the existing Critical Slots authority.

#### Scenario: Valid placement

- **WHEN** that row's details are expanded and a legal location is confirmed
- **THEN** a new equipment instance is added and assigned legal slots
- **AND** weight and critical slots include variable-equipment calculations
- **AND** one Undo reverses the whole operation and Redo restores it
- **AND** the result survives browser-draft recovery

#### Scenario: Illegal, fixed or stale placement

- **WHEN** a location is restricted, occupied, lacks contiguous space, conflicts with configuration or changes before confirmation
- **THEN** the action explains the rejection
- **AND** no partial addition or history entry remains
- **AND** fixed OmniMech equipment is not moved or overwritten

#### Scenario: Cancellation, read-only and split allocation

- **WHEN** the chooser is cancelled or the unit is read-only
- **THEN** no edit occurs
- **WHEN** equipment requires split allocation unsupported by a single-location action
- **THEN** the catalog explains that Critical Slots is required
- **AND** no partial placement occurs

#### Scenario: Existing Add action

- **WHEN** Add is used without placement
- **THEN** a copy is added unassigned through the existing workflow
- **AND** the collapsed-row Add control is a plus that keeps the Add name accessible
- **AND** Add and place is not shown until that row's details are expanded
