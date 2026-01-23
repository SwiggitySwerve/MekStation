# Change: Add Campaign Unit/Pilot Instances

## Why

Units and pilots in the vault are *templates* or *designs* - they have version history for design changes but no gameplay history. When a unit is deployed into a campaign, it needs to become an *instance* that tracks:

- Damage taken per mission
- Repairs performed
- Pilot assignments over time
- Battle participation history
- Kills, XP earned, etc.

This separation follows the pattern used by MekHQ, XCOM, and other military campaign games where the library/hangar contains designs while campaigns contain persistent instances.

## What Changes

- Define `CampaignUnitInstance` entity (links to vault unit, tracks campaign-specific state)
- Define `CampaignPilotInstance` entity (links to pilot template, tracks career history)
- Add instance creation when units/pilots are assigned to a campaign force
- Track instance state changes via the event store
- Add instance-specific Timeline views

## Impact

- Affected specs: New `campaign-instances` capability
- Related specs: `campaign-system`, `force-management`, `event-store`, `audit-timeline`
- Affected code:
  - `src/types/campaign/` (new instance types)
  - `src/stores/useCampaignStore.ts`
  - `src/services/campaign/`
  - Database schema updates

## Dependencies

- `campaign-system` spec (existing)
- `force-management` spec (existing)
- `event-store` spec (existing)

## Sequencing

This is a foundational data model change. Should be implemented after basic campaign/force UI works but before gameplay history features.
