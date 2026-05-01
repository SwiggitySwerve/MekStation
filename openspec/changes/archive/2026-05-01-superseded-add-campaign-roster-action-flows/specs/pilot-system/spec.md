## ADDED Requirements

### Requirement: Pilot Skill Improvement Spend Flow

The pilot system SHALL allow players to spend pilot XP to improve gunnery and piloting skills via the existing `PilotProgressionPanel` UI, calling the existing `/api/pilots/[id]/improve-gunnery` and `/api/pilots/[id]/improve-piloting` API routes through a typed client hook.

#### Scenario: Sufficient XP improves gunnery

- **GIVEN** a pilot with gunnery 4 and 50 XP
- **AND** `getGunneryImprovementCost(4)` returns 40
- **WHEN** the player clicks the "Improve Gunnery" button on `PilotProgressionPanel`
- **THEN** the client hook SHALL POST to `/api/pilots/<pilotId>/improve-gunnery`
- **AND** `PilotService.improveGunnery(pilotId)` SHALL be invoked server-side
- **AND** the pilot's gunnery SHALL change from 4 to 3
- **AND** the pilot's XP SHALL decrease from 50 to 10
- **AND** the panel SHALL re-render with the updated pilot record

#### Scenario: Sufficient XP improves piloting

- **GIVEN** a pilot with piloting 5 and 30 XP
- **AND** `getPilotingImprovementCost(5)` returns 25
- **WHEN** the player clicks the "Improve Piloting" button on `PilotProgressionPanel`
- **THEN** the client hook SHALL POST to `/api/pilots/<pilotId>/improve-piloting`
- **AND** the pilot's piloting SHALL change from 5 to 4
- **AND** the pilot's XP SHALL decrease from 30 to 5
- **AND** the panel SHALL re-render with the updated pilot record

#### Scenario: Insufficient XP disables improvement

- **GIVEN** a pilot with gunnery 4 and 10 XP
- **AND** `getGunneryImprovementCost(4)` returns 40
- **WHEN** the panel renders the "Improve Gunnery" `SkillUpgradeRow`
- **THEN** the button SHALL render disabled
- **AND** clicking the disabled button SHALL NOT trigger an API call

#### Scenario: API error surfaces in panel

- **GIVEN** a pilot eligible for improvement
- **WHEN** the player clicks "Improve Gunnery" and the API responds with HTTP 500
- **THEN** the panel SHALL display the error message returned by the API
- **AND** the pilot's gunnery and XP SHALL remain unchanged
- **AND** the button SHALL re-enable for retry

### Requirement: SPA Purchase Wire-Up

The pilot system SHALL connect the `PilotAbilitiesPanel` SPA picker `onUpdate` callback to the existing `/api/pilots/[id]/purchase-ability` API route through the same client hook used for skill improvement.

#### Scenario: Successful SPA purchase from abilities panel

- **GIVEN** a pilot with 150 XP rendered in `PilotAbilitiesPanel`
- **WHEN** the player selects `weapon_specialist` (xpCost 100) with a `weapon_type` designation of "Medium Laser" and confirms
- **THEN** the client hook SHALL POST to `/api/pilots/<pilotId>/purchase-ability` with body `{ spaId: "weapon_specialist", designation: { type: "weapon_type", value: "Medium Laser" }, isCreationFlow: false }`
- **AND** `PilotService.purchaseSPA` SHALL be invoked server-side (the route's SPA branch fires only when `body.spaId` is present; `body.abilityId` selects the legacy catalog path which does not carry designation/gating semantics)
- **AND** the API SHALL respond with `{ success: true, spaId: "weapon_specialist", xpRemaining: 50 }`
- **AND** the hook SHALL call `usePersonnelStore.updatePerson(pilotId, { xp: 50, specialAbilities: [...prior, "weapon_specialist"] })` to keep the campaign personnel record in sync
- **AND** the panel SHALL re-render reflecting the new ability and reduced XP

#### Scenario: Insufficient XP rejected by API surfaces in panel

- **GIVEN** a pilot with 50 XP
- **WHEN** the player attempts to purchase an SPA with xpCost 100 (the picker `canAfford` check fails to gate it)
- **THEN** the API SHALL respond with an "Insufficient XP" error
- **AND** the panel SHALL display the error message
- **AND** the pilot record SHALL remain unchanged
