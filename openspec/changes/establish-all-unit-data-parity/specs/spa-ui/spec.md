## MODIFIED Requirements

### Requirement: Picker Embedding in Pilot Editor

The SPA picker SHALL be embeddable inside the pilot detail page's
Abilities section as a modal, configured with the pilot's current
ability ids as `excludedIds`.

#### Scenario: Modal opens with excluded ids set

- **GIVEN** a pilot already owns `iron_man` and `weapon_specialist`
- **WHEN** the Abilities section opens the add-ability modal
- **THEN** the `SPAPicker` SHALL mount with `excludedIds = ["iron_man",
  "weapon_specialist"]`
- **AND** those two entries SHALL render disabled with an "Already owned"
  label

#### Scenario: Picker filter mode respects creation flow

- **GIVEN** a pilot is on the detail page outside the creation flow
- **WHEN** the add-ability modal opens
- **THEN** the `SPAPicker` SHALL mount with `filterMode = "purchase-only"`
- **AND** origin-only entries SHALL render disabled

#### Scenario: Picker filter mode in creation flow

- **GIVEN** a pilot is on the creation page (`/gameplay/pilots/create`)
- **WHEN** the add-ability modal opens
- **THEN** the `SPAPicker` SHALL mount with `filterMode = "all"`
- **AND** origin-only and flaw entries SHALL render enabled

#### Scenario: Origin-only implant without an XP price during creation

- **GIVEN** the Abilities panel is in creation flow and the canonical SPA
  catalog defines an origin-only implant with a null XP cost
- **WHEN** the player opens the picker and selects the implant
- **THEN** the panel SHALL include that implant through the picker's existing
  browse mode and submit the canonical id with `isCreationFlow = true`
- **AND** the pilot service SHALL remain responsible for purchase validation
- **AND** the ordinary post-creation purchase picker SHALL keep its existing
  affordability filtering

## ADDED Requirements

### Requirement: Canonical owned SPA exclusion

The SPA picker SHALL consume the SPA domain's canonical identity projection
for its `excludedIds`, including stored compatibility aliases. It SHALL NOT
maintain a separate alias table or mutate the supplied ids.

#### Scenario: Saved alias disables the canonical row

- **GIVEN** `excludedIds` includes `iron-man`, `iron-will` or `iron_will`
- **WHEN** the picker renders the canonical `iron_man` entry
- **THEN** it SHALL show a disabled "Already owned" button
- **AND** activating that disabled button SHALL NOT emit a selection
- **AND** unrelated unowned entries SHALL remain selectable
- **AND** unknown saved ids SHALL NOT exclude unrelated known entries
