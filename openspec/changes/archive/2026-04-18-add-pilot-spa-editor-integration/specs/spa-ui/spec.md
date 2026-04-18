# spa-ui Specification Delta

## ADDED Requirements

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
- **THEN** the `SPAPicker` SHALL mount with `filterMode =
"purchase-only"`
- **AND** origin-only entries SHALL render disabled

#### Scenario: Picker filter mode in creation flow

- **GIVEN** a pilot is on the creation page (`/gameplay/pilots/create`)
- **WHEN** the add-ability modal opens
- **THEN** the `SPAPicker` SHALL mount with `filterMode = "all"`
- **AND** origin-only and flaw entries SHALL render enabled

### Requirement: Editor Reacts to Picker Selection

The Abilities editor SHALL receive picker selections and route them
through the purchase or flaw-grant flow.

#### Scenario: Picker selection triggers purchase

- **GIVEN** the add-ability modal is open and the player confirms an
  entry with a designation
- **WHEN** the picker emits
  `onSelect({ spa, designation })`
- **THEN** the editor SHALL invoke `PilotService.purchaseSPA` (for
  non-flaws) or the flaw-grant path (for flaws)
- **AND** the modal SHALL close on success

#### Scenario: Purchase failure keeps modal open

- **GIVEN** the player selects an entry whose purchase fails (e.g.
  insufficient XP)
- **WHEN** `PilotService.purchaseSPA` rejects
- **THEN** the modal SHALL remain open with the picker state intact
- **AND** a toast SHALL surface the rejection message
