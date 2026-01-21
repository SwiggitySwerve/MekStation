# System Test Setup Guide

## Overview

This document outlines all E2E tests organized by system, with required setup, fixtures, and test data for each.

---

## Test Infrastructure Requirements

### 1. Store Exposure for Test Injection

**File**: `src/lib/testUtils.ts`

```typescript
// Expose stores globally in E2E mode
if (process.env.NEXT_PUBLIC_E2E_MODE === 'true') {
  window.__ZUSTAND_STORES__ = {
    campaign: useCampaignStore,
    encounter: useEncounterStore,
    force: useForceStore,
    pilot: usePilotStore,
    gameplay: useGameplayStore,
    repair: useRepairStore,
    award: useAwardStore,
    unit: useUnitStore,
    vehicle: useVehicleStore,
    aerospace: useAerospaceStore,
  };
}
```

### 2. Test Data Factories

**Directory**: `e2e/fixtures/`

| Factory | Purpose | Dependencies |
|---------|---------|--------------|
| `campaign.ts` | Create test campaigns | None |
| `pilot.ts` | Create test pilots | None |
| `unit.ts` | Create/load test units | Unit catalog |
| `force.ts` | Create forces with units | `pilot.ts`, `unit.ts` |
| `encounter.ts` | Create encounters | `force.ts` |
| `game.ts` | Create game sessions | `encounter.ts` |

### 3. Page Object Models

**Directory**: `e2e/pages/`

| Page Object | Routes Covered |
|-------------|----------------|
| `campaign.page.ts` | `/gameplay/campaigns/*` |
| `encounter.page.ts` | `/gameplay/encounters/*` |
| `force.page.ts` | `/gameplay/forces/*` |
| `game.page.ts` | `/gameplay/games/*` |
| `pilot.page.ts` | `/gameplay/pilots/*` |
| `repair.page.ts` | `/gameplay/repair` |
| `customizer.page.ts` | `/customizer/*` |
| `compendium.page.ts` | `/compendium/*` |

---

## System 1: Campaign Management

### Routes
- `/gameplay/campaigns` - List
- `/gameplay/campaigns/create` - Create
- `/gameplay/campaigns/[id]` - Detail (Overview + Audit tabs)

### Store
`useCampaignStore`

### Required Test Data
```typescript
interface TestCampaign {
  name: string;
  description: string;
  difficulty: 'easy' | 'normal' | 'hard';
  rosterUnits: string[];  // Unit IDs from catalog
  rosterPilots: string[]; // Pilot IDs
}
```

### Tests

| Test ID | Test Name | Setup Required | Assertions |
|---------|-----------|----------------|------------|
| CAM-001 | Navigate to campaigns list | None | Page loads, title visible |
| CAM-002 | Create campaign | None | Form submits, redirects to detail |
| CAM-003 | View campaign detail | 1 campaign | Name, status, resources display |
| CAM-004 | View mission tree | 1 campaign with missions | Missions render in tree |
| CAM-005 | Start mission | 1 campaign, available mission | Status changes to in-progress |
| CAM-006 | View audit timeline tab | 1 campaign with events | Events display chronologically |
| CAM-007 | Filter audit events | 1 campaign with events | Filtered list updates |
| CAM-008 | Delete campaign | 1 campaign | Confirmation, removed from list |
| CAM-009 | Campaign resources display | 1 campaign | C-Bills, supplies, morale show |
| CAM-010 | Empty campaigns state | None | Empty state message shown |

### Fixture: `e2e/fixtures/campaign.ts`
```typescript
export async function createTestCampaign(page: Page, options?: Partial<TestCampaign>): Promise<string>;
export async function createCampaignWithMissions(page: Page, missionCount: number): Promise<string>;
export async function createCampaignWithEvents(page: Page, eventCount: number): Promise<string>;
```

---

## System 2: Encounter Configuration

### Routes
- `/gameplay/encounters` - List
- `/gameplay/encounters/create` - Create
- `/gameplay/encounters/[id]` - Detail

### Store
`useEncounterStore`

### Required Test Data
```typescript
interface TestEncounter {
  name: string;
  playerForceId: string;
  opponentForceId: string;
  mapSize: { width: number; height: number };
}
```

### Tests

| Test ID | Test Name | Setup Required | Assertions |
|---------|-----------|----------------|------------|
| ENC-001 | Navigate to encounters list | None | Page loads |
| ENC-002 | Create encounter | None | Form submits, redirects |
| ENC-003 | View encounter detail | 1 encounter | Details display |
| ENC-004 | Assign player force | 1 encounter, 1 force | Force shown in player slot |
| ENC-005 | Assign opponent force | 1 encounter, 1 force | Force shown in opponent slot |
| ENC-006 | Validate encounter | Complete encounter | Validation passes |
| ENC-007 | Launch encounter | Valid encounter | Redirects to game page |
| ENC-008 | Clone encounter | 1 encounter | New encounter created |
| ENC-009 | Invalid encounter warning | Incomplete encounter | Validation errors shown |

### Fixture: `e2e/fixtures/encounter.ts`
```typescript
export async function createTestEncounter(page: Page): Promise<string>;
export async function createValidEncounter(page: Page): Promise<string>; // With forces assigned
```

---

## System 3: Force Management

### Routes
- `/gameplay/forces` - List
- `/gameplay/forces/create` - Create
- `/gameplay/forces/[id]` - Detail

### Store
`useForceStore`

### Required Test Data
```typescript
interface TestForce {
  name: string;
  units: Array<{ unitId: string; pilotId?: string }>;
}
```

### Tests

| Test ID | Test Name | Setup Required | Assertions |
|---------|-----------|----------------|------------|
| FRC-001 | Navigate to forces list | None | Page loads |
| FRC-002 | Create empty force | None | Force created |
| FRC-003 | Add unit to force | 1 force | Unit appears in force |
| FRC-004 | Remove unit from force | 1 force with unit | Unit removed |
| FRC-005 | Assign pilot to unit | 1 force with unit, 1 pilot | Pilot assigned |
| FRC-006 | Unassign pilot | 1 force with assigned pilot | Pilot unassigned |
| FRC-007 | BV calculation updates | 1 force | BV shown and updates |
| FRC-008 | Clone force | 1 force | New force created |
| FRC-009 | Delete force | 1 force | Force removed |
| FRC-010 | Force validation | Invalid force | Errors shown |

### Fixture: `e2e/fixtures/force.ts`
```typescript
export async function createTestForce(page: Page, unitCount?: number): Promise<string>;
export async function createForceWithPilots(page: Page): Promise<string>;
```

---

## System 4: Pilot Management

### Routes
- `/gameplay/pilots` - List
- `/gameplay/pilots/create` - Create
- `/gameplay/pilots/[id]` - Detail (Stats + Career tabs)

### Store
`usePilotStore`

### Tests

| Test ID | Test Name | Setup Required | Assertions |
|---------|-----------|----------------|------------|
| PLT-001 | Navigate to pilots list | None | Page loads |
| PLT-002 | Create pilot | None | Pilot created |
| PLT-003 | View pilot detail | 1 pilot | Stats display |
| PLT-004 | View career history tab | 1 pilot with events | Events display |
| PLT-005 | Improve gunnery skill | 1 pilot with XP | Skill improves |
| PLT-006 | Improve piloting skill | 1 pilot with XP | Skill improves |
| PLT-007 | Purchase ability | 1 pilot with XP | Ability added |
| PLT-008 | View pilot awards | 1 pilot with awards | Awards display |
| PLT-009 | Delete pilot | 1 pilot | Pilot removed |

### Fixture: `e2e/fixtures/pilot.ts`
```typescript
export async function createTestPilot(page: Page, options?: { xp?: number }): Promise<string>;
export async function createVeteranPilot(page: Page): Promise<string>; // With XP and abilities
```

---

## System 5: Game Session & Combat

### Routes
- `/gameplay/games` - List
- `/gameplay/games/[id]` - Active game
- `/gameplay/games/[id]/replay` - Replay mode

### Store
`useGameplayStore`

### Required Test Data
```typescript
interface TestGame {
  encounterId: string;
  phase: 'deployment' | 'movement' | 'combat' | 'end';
  turn: number;
}
```

### Tests

| Test ID | Test Name | Setup Required | Assertions |
|---------|-----------|----------------|------------|
| GAM-001 | Navigate to games list | None | Page loads |
| GAM-002 | Game page loads | 1 active game | Hex grid renders |
| GAM-003 | Unit deployment | Game in deployment | Units placeable |
| GAM-004 | Select unit | Game with units | Unit selected, info shown |
| GAM-005 | Move unit | Game in movement | Unit moves to hex |
| GAM-006 | Invalid move blocked | Game in movement | Error shown for invalid move |
| GAM-007 | Select attack target | Game in combat | Target highlighted |
| GAM-008 | Execute attack | Game in combat | Damage applied |
| GAM-009 | Heat accumulates | After firing | Heat increases |
| GAM-010 | End turn | Any phase | Turn advances |
| GAM-011 | View replay | Completed game | Replay page loads |
| GAM-012 | Replay controls | Replay page | Play/pause/step work |

### Fixture: `e2e/fixtures/game.ts`
```typescript
export async function createActiveGame(page: Page, phase?: string): Promise<string>;
export async function createCompletedGame(page: Page): Promise<string>;
```

---

## System 6: Combat Resolution

### Store
`useGameplayStore` (combat subsystem)

### Tests

| Test ID | Test Name | Setup Required | Assertions |
|---------|-----------|----------------|------------|
| CMB-001 | Attack roll display | Game in combat | Roll shown with modifiers |
| CMB-002 | Hit location | Successful hit | Location determined |
| CMB-003 | Armor damage | Hit on armored location | Armor reduced |
| CMB-004 | Internal damage | Armor breached | Internals damaged |
| CMB-005 | Critical hit | Internal damage | Crit rolled |
| CMB-006 | Ammo explosion | Ammo crit | Explosion damage |
| CMB-007 | Unit destruction | All internals gone | Unit marked destroyed |
| CMB-008 | Heat effects | High heat | Movement/accuracy penalties |
| CMB-009 | Shutdown check | Extreme heat | Shutdown possible |

---

## System 7: Repair System

### Routes
- `/gameplay/repair` - Repair bay

### Store
`useRepairStore`

### Tests

| Test ID | Test Name | Setup Required | Assertions |
|---------|-----------|----------------|------------|
| REP-001 | Navigate to repair bay | None | Page loads |
| REP-002 | View damaged units | Damaged unit in roster | Unit listed |
| REP-003 | View repair options | 1 damaged unit | Options shown |
| REP-004 | Repair cost display | 1 damaged unit | Cost calculated |
| REP-005 | Queue repair | 1 damaged unit | Repair queued |
| REP-006 | Repair progress | Repair in progress | Progress shown |

### Fixture: `e2e/fixtures/repair.ts`
```typescript
export async function createDamagedUnit(page: Page): Promise<string>;
```

---

## System 8: Awards System

### Store
`useAwardStore`

### Tests

| Test ID | Test Name | Setup Required | Assertions |
|---------|-----------|----------------|------------|
| AWD-001 | View available awards | None | Awards list shown |
| AWD-002 | View pilot awards | Pilot with awards | Awards displayed |
| AWD-003 | Award unlock | Meet criteria | Award granted |
| AWD-004 | Award progress | Partial progress | Progress shown |
| AWD-005 | Multiple awards | Pilot with many | All display |

### Fixture: `e2e/fixtures/award.ts`
```typescript
export async function grantAward(page: Page, pilotId: string, awardId: string): Promise<void>;
```

---

## System 9: Customizer - Mech

### Routes
- `/customizer/[[...slug]]` - Multi-tab customizer

### Store
`useUnitStore`, `useMultiUnitStore`

### Tests

| Test ID | Test Name | Setup Required | Assertions |
|---------|-----------|----------------|------------|
| CUS-001 | Load mech in customizer | None | Mech loads |
| CUS-002 | Change engine | Loaded mech | Engine updates |
| CUS-003 | Adjust armor | Loaded mech | Armor values change |
| CUS-004 | Add weapon | Loaded mech | Weapon in loadout |
| CUS-005 | Remove equipment | Mech with equipment | Equipment removed |
| CUS-006 | Validation errors | Invalid config | Errors shown |
| CUS-007 | Save custom variant | Valid mech | Variant saved |
| CUS-008 | OmniMech pods | OmniMech loaded | Pod config works |

---

## System 10: Customizer - Aerospace

### Store
`useAerospaceStore`

### Tests

| Test ID | Test Name | Setup Required | Assertions |
|---------|-----------|----------------|------------|
| AER-001 | Load aerospace unit | None | Unit loads |
| AER-002 | Configure armor | Loaded unit | Armor updates |
| AER-003 | Add weapons | Loaded unit | Weapons added |
| AER-004 | Fuel configuration | Loaded unit | Fuel shown |
| AER-005 | Validate aerospace | Invalid config | Errors shown |
| AER-006 | Save aerospace | Valid unit | Unit saved |

---

## System 11: Customizer - Vehicle

### Store
`useVehicleStore`

### Tests

| Test ID | Test Name | Setup Required | Assertions |
|---------|-----------|----------------|------------|
| VEH-001 | Load vehicle | None | Vehicle loads |
| VEH-002 | Configure armor | Loaded vehicle | Armor updates |
| VEH-003 | Add weapons | Loaded vehicle | Weapons added |
| VEH-004 | Turret configuration | Turreted vehicle | Turret works |
| VEH-005 | Validate vehicle | Invalid config | Errors shown |
| VEH-006 | Save vehicle | Valid vehicle | Vehicle saved |

---

## System 12: Compendium

### Routes
- `/compendium` - Landing
- `/compendium/units` - Unit browser
- `/compendium/units/[id]` - Unit detail
- `/compendium/equipment` - Equipment browser
- `/compendium/equipment/[id]` - Equipment detail
- `/compendium/rules/[id]` - Rules reference

### Tests

| Test ID | Test Name | Setup Required | Assertions |
|---------|-----------|----------------|------------|
| CMP-001 | Navigate to compendium | None | Page loads |
| CMP-002 | Browse units | None | Units listed |
| CMP-003 | Search units | None | Results filter |
| CMP-004 | Filter by weight | None | Filter works |
| CMP-005 | View unit detail | None | Detail page loads |
| CMP-006 | Browse equipment | None | Equipment listed |
| CMP-007 | Search equipment | None | Results filter |
| CMP-008 | View equipment detail | None | Detail page loads |
| CMP-009 | View rules reference | None | Rules display |

---

## System 13: P2P Vault Sync (Enhanced)

### Routes
- `/e2e/sync-test` - Test harness

### Tests

| Test ID | Test Name | Setup Required | Assertions |
|---------|-----------|----------------|------------|
| P2P-001 | Create sync room | None | Room code generated |
| P2P-002 | Join with code | Active room | Connection established |
| P2P-003 | Sync item add | 2 connected peers | Item syncs |
| P2P-004 | Sync item delete | 2 peers, shared item | Deletion syncs |
| P2P-005 | Offline queue | Disconnected state | Operations queued |
| P2P-006 | Reconnect sync | Queued operations | Queue processes |

---

## System 14: Audit Timeline

### Routes
- `/audit/timeline` - Global timeline
- Campaign/Pilot detail tabs

### Store
`EventStoreService`

### Tests

| Test ID | Test Name | Setup Required | Assertions |
|---------|-----------|----------------|------------|
| AUD-001 | Global timeline loads | None | Page loads |
| AUD-002 | Filter by category | Events exist | Filter works |
| AUD-003 | Search events | Events exist | Search works |
| AUD-004 | Event detail | Events exist | Detail shown on click |
| AUD-005 | Export events | Events exist | JSON downloads |

---

## Integration Flow Tests

### Full Campaign Flow
```
Create Campaign -> Add Units/Pilots -> Start Mission -> 
Create Encounter -> Configure Forces -> Launch Game ->
Combat Resolution -> Complete Mission -> Repair Units ->
Check Awards
```

### Setup Required
- Clean state
- Test runs full flow sequentially

### Test ID: INT-001

---

## Test Execution Strategy

### Smoke Tests (`@smoke`)
- CAM-001, CAM-002
- ENC-001, ENC-007
- FRC-001, FRC-002
- GAM-001, GAM-002
- CMP-001, CMP-002

### Full Suite
- All tests

### CI Configuration
```yaml
# PR: Smoke only
- run: npx playwright test --grep @smoke

# Merge to main: Full suite  
- run: npx playwright test
```

---

## Data-testid Requirements

Add these to components:

```typescript
// Campaigns
data-testid="campaign-list"
data-testid="campaign-card-{id}"
data-testid="campaign-create-btn"
data-testid="campaign-delete-btn"
data-testid="campaign-mission-tree"
data-testid="campaign-audit-tab"

// Encounters
data-testid="encounter-list"
data-testid="encounter-card-{id}"
data-testid="encounter-launch-btn"
data-testid="encounter-player-force"
data-testid="encounter-opponent-force"

// Forces
data-testid="force-list"
data-testid="force-card-{id}"
data-testid="force-unit-slot-{index}"
data-testid="force-bv-total"

// Games
data-testid="game-hex-grid"
data-testid="game-unit-{id}"
data-testid="game-phase-indicator"
data-testid="game-end-turn-btn"

// Combat
data-testid="combat-attack-btn"
data-testid="combat-target-selector"
data-testid="combat-damage-result"

// Compendium
data-testid="compendium-search"
data-testid="compendium-filter-weight"
data-testid="compendium-unit-card-{id}"
```
