# Spec Delta: Campaign System

## ADDED Requirements

### Requirement: Current System Location

The campaign record SHALL carry an optional `currentSystemId: string` field tracking the player's "you are here" pin on the starmap. The field is optional for backward compatibility — a legacy persisted campaign without the field is treated as stationed at `'terra'` by all UI surfaces (the canonical default). The field is updated EXCLUSIVELY via the `useCampaignStore.travelToSystem` action so the activity-log entry and validation invariants are always enforced together.

**Priority**: High

#### Scenario: A new campaign defaults to Terra

**GIVEN** a brand-new campaign created via `createCampaign`
**WHEN** the campaign is persisted and re-loaded
**THEN** `campaign.currentSystemId` MAY be `undefined`
**AND** the starmap page SHALL display Terra as the selected system (the `?? 'terra'` UI default)

#### Scenario: A legacy persisted campaign without currentSystemId works unchanged

**GIVEN** a campaign persisted before this change (no `currentSystemId` field)
**WHEN** the operator opens the campaign and navigates to the starmap
**THEN** the page SHALL mount with Terra highlighted as the current system
**AND** the operator can travel to a new system, after which `currentSystemId` IS persisted on subsequent saves

#### Scenario: currentSystemId persists through zustand serialization

**GIVEN** a campaign that has just travelled to `'luthien'`
**WHEN** the page reloads (zustand re-hydrates from local storage)
**THEN** `campaign.currentSystemId` SHALL still be `'luthien'`
**AND** the starmap page SHALL re-render with Luthien as the selected system
