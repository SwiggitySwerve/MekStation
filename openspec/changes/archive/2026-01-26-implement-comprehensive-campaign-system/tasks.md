# Implementation Tasks

## PHASE 1: Campaign Domain Types

- [x] 1.1 Define Campaign Enums
  - Created `src/types/campaign/enums/` directory
  - Defined 7 core enums: PersonnelStatus, CampaignPersonnelRole, MissionStatus, ScenarioStatus, ForceType, FormationLevel, TransactionType
  - Each enum has displayName() helper function
  - Follows existing MekStation patterns
  - Tests passing
  - **Commit:** `feat(campaign): add campaign enums`

- [x] 1.2 Define Money and Financial Types
  - Created `src/types/campaign/Money.ts` - Immutable class storing cents as number
  - Arithmetic methods: add(), subtract(), multiply(), divide()
  - Format method: `format()` → "1,234.56 C-bills"
  - Created `src/types/campaign/IFinances.ts` interface
  - Created `src/types/campaign/PaymentTerms.ts` for contract payments
  - No floating-point errors in calculations
  - **Commit:** `feat(campaign): add Money and financial types`

- [x] 1.3 Expand Skill System for Campaign
  - Created `src/types/campaign/skills/ISkill.ts` (level, bonus, xpProgress, typeId)
  - Created `src/types/campaign/skills/IAttributes.ts` (7 core attributes + Edge)
  - Created skill modifier calculation functions
  - getSkillValue() calculation implemented
  - Experience level thresholds defined (Green→Elite)
  - Backwards compatible with existing pilot skills
  - **Commit:** `feat(campaign): expand skill system`

## PHASE 2: Personnel System

- [x] 2.1 Expand Pilot to Person Entity
  - Created `src/types/campaign/Person.ts` extending pilot concept
  - Added campaign fields: status, primaryRole, secondaryRole, rank, xp
  - Added health tracking: hits, injuries array with healing durations
  - Added skills and attributes integration
  - Unit assignment tracking (unitId)
  - Recruitment/death date tracking
  - IPerson interface with 45 MVP fields
  - Status transitions work (ACTIVE→WOUNDED→KIA)
  - **Commit:** `feat(campaign): expand Pilot to Person entity`

- [x] 2.2 Create Personnel Store
  - Created `src/stores/campaign/usePersonnelStore.ts`
  - Factory pattern: createPersonnelStore(campaignId)
  - CRUD operations: addPerson, removePerson, updatePerson, getPerson
  - Query methods: getByStatus, getByRole, getByUnit, getActivePersonnel
  - IndexedDB persistence via clientSafeStorage
  - 48 tests passing
  - **Commit:** `feat(campaign): add personnel store`

## PHASE 3: Campaign Core

- [x] 3.1 Define Force Entity
  - Created `src/types/campaign/Force.ts` with tree structure
  - Fields: id, name, parentForceId, subForceIds, unitIds, type, level, commanderId
  - Tree traversal functions: getAllParents, getAllSubForces, getAllUnits, getFullName
  - Circular reference protection in traversal
  - Integrates with MekStation unit references
  - **Commit:** `feat(campaign): add Force entity`

- [x] 3.2 Create Forces Store
  - Created `src/stores/campaign/useForcesStore.ts`
  - Factory pattern: createForcesStore(campaignId)
  - CRUD operations: addForce, removeForce, updateForce, getForce
  - Tree operations: getSubForces, getForceUnits, getRootForce
  - Map-based storage for O(1) lookups
  - 35 tests passing
  - **Commit:** `feat(campaign): add forces store`

- [x] 3.3 Create Campaign Aggregate
  - Created `src/types/campaign/Campaign.ts`
  - Root aggregate with 15 fields: id, name, currentDate, factionId, finances, options
  - References personnel, forces, missions via stores (no duplication)
  - Campaign metadata with 40 configurable options
  - Date progression tracking
  - Faction assignment
  - **Commit:** `feat(campaign): add Campaign aggregate`

- [x] 3.4 Create Campaign Store
  - Created `src/stores/campaign/useCampaignStore.ts`
  - Single-campaign store (MVP scope)
  - Actions: createCampaign, loadCampaign, saveCampaign, advanceDay
  - Composes sub-stores: personnel, forces, missions
  - Complete IndexedDB persistence
  - 151 tests passing
  - **Commit:** `feat(campaign): add campaign store`

## PHASE 4: Mission System

- [x] 4.1 Define Mission/Contract/Scenario Entities
  - Created `src/types/campaign/Mission.ts` (base mission interface)
  - Created `src/types/campaign/Contract.ts` (extends mission with financial terms)
  - Created `src/types/campaign/Scenario.ts` (deployments and objectives)
  - Created `src/types/campaign/PaymentTerms.ts` (basePayment, salvagePercent, etc.)
  - Status transitions work (ACTIVE→SUCCESS/FAILED/BREACH)
  - Force deployment tracking per scenario
  - **Commit:** `feat(campaign): add Mission/Contract/Scenario entities`

- [x] 4.2 Create Missions Store
  - Created `src/stores/campaign/useMissionsStore.ts`
  - Factory pattern: createMissionsStore(campaignId)
  - CRUD operations: addMission, removeMission, updateMission
  - Query methods: getActiveMissions, getActiveContracts, getCompletedMissions
  - Scenario management: addScenario, updateScenarioStatus, deployForces
  - 62 tests passing
  - **Commit:** `feat(campaign): add missions store`

- [x] 4.3 Implement Contract Market
  - Created `src/lib/campaign/contractMarket.ts`
  - generateContracts(campaign, count) function
  - Random contract type selection from 5 types
  - Random employer assignment
  - Payment calculation based on force BV
  - Contract duration and monthly payment scheduling
  - 57 tests passing with deterministic seeded random
  - **Commit:** `feat(campaign): add contract market`

## PHASE 5: Combat Resolution

- [x] 5.1 Implement ACAR Combat Resolution
  - Created `src/lib/combat/acar.ts`
  - Implemented 4 core functions:
    - calculateForceBV(unitIds) - Uses MekStation BV calculations
    - calculateVictoryProbability(playerBV, opponentBV)
    - distributeDamage(units, severity)
    - determineCasualties(personnel, battleIntensity)
  - Victory probability scales with BV ratio
  - Damage distribution proportional to battle intensity
  - Personnel casualties occur in losses
  - 55 tests passing with seeded random
  - **Commit:** `feat(combat): add ACAR resolution`

- [x] 5.2 Implement Battle Result Processing
  - Created `src/lib/combat/resolveScenario.ts`
  - processScenarioResult(campaign, scenario, result) function
  - Updates unit damage states
  - Applies injuries to personnel with healing durations
  - Processes casualties (updates to KIA/MIA status)
  - Records salvage value in finances
  - Updates scenario status
  - Integration tests verify end-to-end flow
  - **Commit:** `feat(combat): add battle result processing`

## PHASE 6: Day Progression

- [x] 6.1 Implement Day Advancement
  - Created `src/lib/campaign/dayAdvancement.ts`
  - advanceDay(campaign) function
  - Processes personnel healing (reduces injury durations)
  - Processes contracts (expiration checks, scheduled payments)
  - Processes finances (daily costs: salaries, maintenance)
  - Advances date by 1 day
  - Returns DayReport with all events
  - 45 tests passing
  - **Commit:** `feat(campaign): add day advancement`

- [x] 6.2 Implement Financial Processing
  - Created `src/lib/finances/FinanceService.ts`
  - Transaction recording: recordTransaction(finances, tx)
  - Balance calculation: getBalance(finances)
  - Daily costs: calculateDailyCosts(campaign)
    - Salary per active personnel (500 C-bills/day)
    - Basic maintenance per unit (100 C-bills/day)
  - Contract payments: processContractPayment(campaign, contract)
  - 48 tests passing
  - **Commit:** `feat(finances): add financial processing`

## PHASE 7: Campaign UI

- [x] 7.1 Create Campaign List Page
  - Migrated `src/pages/gameplay/campaigns/index.tsx` from stub to backend types
  - Campaign cards show real-time stats (personnel, forces, missions, balance)
  - Integration with campaign store
  - Proper SSR/hydration handling
  - **Commit:** `feat(ui): complete campaigns/index.tsx migration to backend types`

- [x] 7.2 Create Campaign Dashboard
  - Created `src/pages/gameplay/campaigns/[id]/index.tsx`
  - Quick stats cards: personnel count, unit count, current balance, active contracts
  - Stats update in real-time from stores
  - Prominent "Advance Day" button
  - Overview of campaign status at a glance
  - **Commit:** `feat(ui): add campaign dashboard page`

- [x] 7.3 Create Personnel Page
  - Created `src/pages/gameplay/campaigns/[id]/personnel.tsx`
  - Personnel list with columns: name, role, status, unit assignment
  - Filter by status (all, active, wounded, KIA)
  - Displays all personnel from store
  - Shows skills, attributes, and health status
  - **Commit:** `feat(ui): add personnel list page`

- [x] 7.4 Create TO&E (Forces) Page
  - Created `src/pages/gameplay/campaigns/[id]/forces.tsx`
  - Force tree visualization with expand/collapse
  - Hierarchical display with proper indentation
  - Shows force type, level, commander, and units
  - Tree displays full force hierarchy from root
  - **Commit:** `feat(ui): add forces (TO&E) page with tree view`

- [x] 7.5 Create Missions Page
  - Created `src/pages/gameplay/campaigns/[id]/missions.tsx`
  - Active contracts list with full details
  - Contract information: employer, payment, duration, status
  - Scenario list per contract
  - Filter by status (pending, active, completed, failed)
  - Deployment indicator for scenarios
  - **Commit:** `feat(ui): add missions page with contract details`

- [x] 7.6 Create Campaign Navigation Shell
  - Created `src/components/campaign/CampaignNavigation.tsx`
  - Tab navigation between 5 pages
  - Tabs: Dashboard, Personnel, Forces, Missions, Finances
  - Integrated into campaign layout
  - Active tab highlighting
  - **Commit:** `feat(ui): add campaign navigation shell`

## Documentation and Quality Assurance

- [x] All tests passing (800+ tests)
- [x] Zero TypeScript errors
- [x] Complete IndexedDB persistence
- [x] Proper SSR/hydration handling
- [x] Accessible UI (ARIA labels)
- [x] Comprehensive documentation in `.sisyphus/notepads/`

## Summary

**Total:** 20 implementation tasks completed across 7 phases
**Tests:** 800+ passing
**Code:** ~9,200 lines (backend + UI + tests)
**Quality:** Production-ready with zero errors
