# Tasks: Campaign System

## 1. Data Model

- [ ] 1.1 Define `ICampaign` interface (id, name, description, missions, roster)
- [ ] 1.2 Define `ICampaignMission` interface (encounter ref, status, outcomes)
- [ ] 1.3 Define `ICampaignRoster` interface (units, pilots, state per mission)
- [ ] 1.4 Define `ICampaignProgress` interface (current mission, resources)
- [ ] 1.5 Define `IMissionOutcome` interface (victory, casualties, salvage)
- [ ] 1.6 Add campaign-related types to `src/types/campaign/`

## 2. Campaign Store

- [ ] 2.1 Create `useCampaignStore` Zustand store
- [ ] 2.2 Implement CRUD operations for campaigns
- [ ] 2.3 Implement mission progression logic
- [ ] 2.4 Add roster state tracking per mission
- [ ] 2.5 Implement outcome recording and resource updates
- [ ] 2.6 Add persistence (localStorage initially)

## 3. Pilot Progression

- [ ] 3.1 Add XP field to pilot data model
- [ ] 3.2 Implement XP gain from mission participation
- [ ] 3.3 Implement skill improvement thresholds
- [ ] 3.4 Add special ability unlocks at milestones
- [ ] 3.5 Track pilot kills/assists for records

## 4. Mission Flow

- [ ] 4.1 Add "Start Mission" flow from campaign
- [ ] 4.2 Pass roster state to encounter setup
- [ ] 4.3 Capture mission outcome on completion
- [ ] 4.4 Update roster state based on outcome
- [ ] 4.5 Advance campaign to next mission
- [ ] 4.6 Handle mission branching based on outcomes

## 5. UI - Campaign Management

- [ ] 5.1 Create `CampaignListPage` - browse campaigns
- [ ] 5.2 Create `CampaignCreatePage` - new campaign wizard
- [ ] 5.3 Create `CampaignDetailPage` - current campaign status
- [ ] 5.4 Create `MissionTreeView` - visual mission progression
- [ ] 5.5 Create `RosterStateDisplay` - unit/pilot status per mission

## 6. UI - Mission Integration

- [ ] 6.1 Add campaign context to encounter pages
- [ ] 6.2 Show campaign roster in force selection
- [ ] 6.3 Add "Mission Complete" dialog with outcomes
- [ ] 6.4 Show XP gains and rewards

## 7. Templates

- [ ] 7.1 Create sample campaign template (3-mission arc)
- [ ] 7.2 Create branching campaign template
- [ ] 7.3 Add campaign template import/export

## 8. Testing

- [ ] 8.1 Unit tests for campaign store
- [ ] 8.2 Unit tests for progression logic
- [ ] 8.3 Integration tests for mission flow
- [ ] 8.4 E2E tests for campaign creation and completion
