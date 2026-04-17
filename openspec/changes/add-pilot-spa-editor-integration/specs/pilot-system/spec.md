# pilot-system Specification Delta

## ADDED Requirements

### Requirement: SPA Purchase from Pilot Detail

The pilot system SHALL allow players to purchase SPAs from the pilot
detail page by spending the pilot's XP.

#### Scenario: Sufficient XP completes purchase

- **GIVEN** a pilot with 150 XP and no ability with id `weapon_specialist`
- **WHEN** the player selects `weapon_specialist` (xpCost 100) with a
  `weapon_type` designation of "Medium Laser" and confirms
- **THEN** `PilotService.purchaseSPA(pilotId, "weapon_specialist",
{ type: "weapon_type", value: "Medium Laser" })` SHALL be called
- **AND** the pilot's XP SHALL decrease from 150 to 50
- **AND** the pilot's `abilities` array SHALL include the new reference

#### Scenario: Insufficient XP rejects purchase

- **GIVEN** a pilot with 50 XP
- **WHEN** the player attempts to purchase an SPA with xpCost 100
- **THEN** the purchase SHALL be rejected with error message
  "Insufficient XP"
- **AND** the pilot record SHALL remain unchanged

#### Scenario: Duplicate purchase rejected

- **GIVEN** a pilot that already owns `blood_stalker`
- **WHEN** the player attempts to purchase `blood_stalker` again
- **THEN** the SPA picker SHALL show the entry as disabled via
  `excludedIds`
- **AND** even if the purchase call bypasses the UI, the service SHALL
  reject it with error message "Ability already owned"

### Requirement: SPA Flaw XP Grant

The pilot system SHALL treat entries with `isFlaw === true` as XP-granting
during the creation flow and SHALL apply the negative `xpCost` as a credit.

#### Scenario: Taking a flaw grants XP

- **GIVEN** a pilot in the creation flow with 100 XP
- **WHEN** the player takes a flaw with `isFlaw === true` and
  `xpCost = -200`
- **THEN** the pilot's XP SHALL increase from 100 to 300
- **AND** the flaw SHALL be recorded in the pilot's `abilities` array

#### Scenario: Flaws outside creation flow are rejected

- **GIVEN** a pilot outside the creation flow
- **WHEN** the player attempts to take a flaw
- **THEN** the service SHALL reject the action with message "Flaws can
  only be taken during pilot creation"

### Requirement: Origin-Only Gating

The pilot system SHALL restrict entries with `isOriginOnly === true` to
the pilot creation flow.

#### Scenario: Origin-only entry offered during creation

- **GIVEN** a pilot in the creation flow
- **WHEN** the player opens the SPA picker
- **THEN** origin-only entries SHALL render enabled and purchasable at
  their listed `xpCost` (typically 0)

#### Scenario: Origin-only entry gated post-creation

- **GIVEN** a pilot outside the creation flow
- **WHEN** the player opens the SPA picker
- **THEN** origin-only entries SHALL render disabled
- **AND** if the `purchaseSPA` service method is called with an
  origin-only id anyway, it SHALL reject with message "Origin-only
  abilities cannot be acquired after creation"

### Requirement: SPA Removal Allowed Only in Creation

The pilot system SHALL allow SPA removal during pilot creation and SHALL
reject removal after creation.

#### Scenario: Remove ability during creation

- **GIVEN** a pilot in the creation flow that owns `iron_man` (xpCost 100)
- **WHEN** the player removes `iron_man`
- **THEN** `PilotService.removeSPA(pilotId, "iron_man")` SHALL be called
- **AND** the pilot's XP SHALL increase by 100 (refund)
- **AND** the ability SHALL be removed from the pilot's `abilities`
  array

#### Scenario: Remove ability after creation is rejected

- **GIVEN** a pilot outside the creation flow that owns `iron_man`
- **WHEN** the player attempts to remove `iron_man`
- **THEN** the Remove affordance SHALL render disabled
- **AND** a tooltip SHALL explain "Abilities cannot be removed after
  creation"
- **AND** if the service is called anyway, it SHALL reject with message
  "Abilities are permanent after creation"

### Requirement: Abilities Section on Pilot Detail Page

The pilot detail page SHALL expose the owned-abilities list and the
add-ability affordance as a cohesive section.

#### Scenario: Pilot with no abilities shows empty state

- **GIVEN** a pilot whose `abilities` array is empty
- **WHEN** the pilot detail page renders
- **THEN** the Abilities section SHALL display an empty state prompting
  "No special abilities — click Add Ability to purchase"
- **AND** the Add Ability button SHALL remain enabled if the pilot has
  XP or is in the creation flow

#### Scenario: Owned abilities render with designation

- **GIVEN** a pilot that owns `range_master` with designation
  `{ type: "range_bracket", value: "Medium" }`
- **WHEN** the Abilities section renders
- **THEN** the row SHALL display "Range Master (Medium)"
- **AND** the row SHALL show the Gunnery category color accent
- **AND** the row SHALL show the CamOps source badge
