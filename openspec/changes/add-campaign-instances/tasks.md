# Tasks: Add Campaign Unit/Pilot Instances

## 1. Type Definitions

- [x] 1.1 Define `ICampaignUnitInstance` interface:
  - `id: string` (instance ID)
  - `campaignId: string`
  - `vaultUnitId: string` (reference to vault design)
  - `vaultUnitVersion: number` (snapshot of design version at assignment)
  - `damageState: IUnitDamageState`
  - `status: CampaignUnitStatus` (operational, damaged, destroyed, repairing, salvage)
  - `assignedPilotInstanceId?: string`
  - `forceId?: string`, `forceSlot?: number`
  - `totalKills`, `missionsParticipated`, `estimatedRepairCost`, `estimatedRepairTime`
  - `createdAt: string`, `updatedAt: string`
  - **Implemented in:** `src/types/campaign/CampaignInstanceInterfaces.ts`

- [x] 1.2 Define `ICampaignPilotInstance` interface:
  - `id: string` (instance ID)
  - `campaignId: string`
  - `vaultPilotId: string | null` (reference to pilot template, null for statblock pilots)
  - `statblockData: IPilotStatblock | null` (inline pilot data if no vault reference)
  - `currentXP: number`, `campaignXPEarned: number`
  - `currentSkills: IPilotSkills`
  - `wounds: number`
  - `status: CampaignPilotStatus` (active, wounded, critical, mia, kia)
  - `killCount: number`, `missionsParticipated: number`
  - `recoveryTime: number`
  - `createdAt: string`, `updatedAt: string`
  - **Implemented in:** `src/types/campaign/CampaignInstanceInterfaces.ts`

- [x] 1.3 Define `IUnitDamageState` interface for tracking damage
  - `ILocationDamageState` for per-location armor/structure/components
  - `IComponentDamage` with `ComponentStatus` enum
  - Engine/gyro/sensor/life-support hits tracking
  - Ammo expenditure and heat tracking
  - **Implemented in:** `src/types/campaign/CampaignInstanceInterfaces.ts`

## 2. Database Schema

- [x] 2.1 Add `campaign_unit_instances` table
  - **IndexedDB:** Added store in `src/services/persistence/IndexedDBService.ts` (DB_VERSION 4)
  - **SQLite:** Added table in migration 3 in `src/services/persistence/SQLiteService.ts`
- [x] 2.2 Add `campaign_pilot_instances` table
  - **IndexedDB:** Added store in `src/services/persistence/IndexedDBService.ts`
  - **SQLite:** Added table in migration 3 with XOR constraint for vault_pilot_id/statblock_data
- [x] 2.3 Add foreign keys to campaigns and vault entities
  - SQLite schema includes foreign keys to `pilots` table and between instances
- [x] 2.4 Create migration script
  - SQLite migration 3: `campaign_instances_schema` with indexes for common queries

## 3. Instance Creation

- [x] 3.1 Create instance when unit is assigned to campaign force
  - **Implemented in:** `CampaignInstanceService.createUnitInstance()`
- [x] 3.2 Snapshot vault unit version at assignment time
  - `vaultUnitVersion` parameter captured at creation time
- [x] 3.3 Create pilot instance when pilot is assigned
  - **Implemented in:** `CampaignInstanceService.createPilotInstanceFromVault()`
- [x] 3.4 Handle statblock pilots (inline data, no vault reference)
  - **Implemented in:** `CampaignInstanceService.createPilotInstanceFromStatblock()`

## 4. State Updates

- [ ] 4.1 Update instance damage after battle (from game events)
- [ ] 4.2 Update instance status based on damage level
- [ ] 4.3 Update pilot XP/wounds from mission events
- [ ] 4.4 Track pilot assignment changes on instance

## 5. Event Integration

- [ ] 5.1 Emit events for instance state changes
- [ ] 5.2 Link instance events to campaign/game context
- [ ] 5.3 Support causality tracking (damage_applied -> status_changed)

## 6. API & Store

- [x] 6.1 Add campaign instance queries to store
  - **Implemented in:** `CampaignInstanceService.listUnitInstances()`, `listPilotInstances()` with filters
- [x] 6.2 Add instance CRUD operations
  - **Implemented in:** `src/services/persistence/CampaignInstanceService.ts`
  - Unit: create, get, update, delete, list
  - Pilot: create from vault, create from statblock, get, update, delete, list
  - Assignments: assignPilotToUnit, unassignPilot (bidirectional)
  - Bulk: deleteInstancesForCampaign
- [ ] 6.3 Add instance-filtered Timeline queries

## 7. Testing

- [x] 7.1 Unit tests for instance creation
  - **Implemented in:** `src/types/campaign/__tests__/CampaignInstanceInterfaces.test.ts`
  - 42 tests covering type guards, factory functions, damage calculations, availability checks
- [x] 7.2 Unit tests for damage state updates
  - `calculateDamagePercentage` and `determineUnitStatus` tests included
- [x] 7.3 Service layer tests
  - **Implemented in:** `src/services/persistence/__tests__/CampaignInstanceService.test.ts`
  - 21 tests covering CRUD operations, filtering, assignments, bulk operations
- [ ] 7.4 Integration tests for event chain
