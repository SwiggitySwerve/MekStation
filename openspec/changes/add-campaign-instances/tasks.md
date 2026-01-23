# Tasks: Add Campaign Unit/Pilot Instances

## 1. Type Definitions

- [ ] 1.1 Define `ICampaignUnitInstance` interface:
  - `id: string` (instance ID)
  - `campaignId: string`
  - `vaultUnitId: string` (reference to vault design)
  - `vaultUnitVersion: number` (snapshot of design version at assignment)
  - `currentDamage: IUnitDamageState`
  - `status: 'operational' | 'damaged' | 'destroyed' | 'repairing'`
  - `assignedPilotInstanceId?: string`
  - `createdAt: string`
  - `updatedAt: string`

- [ ] 1.2 Define `ICampaignPilotInstance` interface:
  - `id: string` (instance ID)
  - `campaignId: string`
  - `vaultPilotId?: string` (reference to pilot template, optional for statblock pilots)
  - `statblockData?: IStatblockPilot` (inline pilot data if no vault reference)
  - `currentXP: number`
  - `currentSkills: IPilotSkills`
  - `wounds: number`
  - `status: 'active' | 'wounded' | 'incapacitated' | 'deceased'`
  - `killCount: number`
  - `missionsParticipated: number`
  - `createdAt: string`
  - `updatedAt: string`

- [ ] 1.3 Define `IUnitDamageState` interface for tracking damage

## 2. Database Schema

- [ ] 2.1 Add `campaign_unit_instances` table
- [ ] 2.2 Add `campaign_pilot_instances` table
- [ ] 2.3 Add foreign keys to campaigns and vault entities
- [ ] 2.4 Create migration script

## 3. Instance Creation

- [ ] 3.1 Create instance when unit is assigned to campaign force
- [ ] 3.2 Snapshot vault unit version at assignment time
- [ ] 3.3 Create pilot instance when pilot is assigned
- [ ] 3.4 Handle statblock pilots (inline data, no vault reference)

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

- [ ] 6.1 Add campaign instance queries to store
- [ ] 6.2 Add instance CRUD operations
- [ ] 6.3 Add instance-filtered Timeline queries

## 7. Testing

- [ ] 7.1 Unit tests for instance creation
- [ ] 7.2 Unit tests for damage state updates
- [ ] 7.3 Integration tests for event chain
