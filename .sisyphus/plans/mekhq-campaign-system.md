# MekHQ Campaign System - MekStation Integration

> **IMPORTANT**: Copy this file to `E:\Projects\mekstation\.sisyphus\plans\mekhq-campaign-system.md` before running `/start-work`

## Context

### Original Request
Add MekHQ-style campaign management to MekStation. Extend MekStation from a unit builder into a full campaign manager that can run BattleTech campaigns similar to MekHQ.

### Interview Summary
**Key Discussions**:
- MekStation already has unit construction, equipment, and pilot management
- Add campaign layer on top of existing functionality
- Reference MekHQ Java code for domain model patterns (in E:\Projects\mekhq)
- Use existing MekStation architecture (Zustand, IndexedDB, React)
- ACAR combat first, tactical later
- Fresh save format (no MekHQ import compatibility needed)
- UI improvements are welcome

**Research Findings (from MekHQ analysis)**:
- Campaign is root aggregate owning all entities
- Person has 100+ attributes, complex skill/ability system
- Unit integrates with MegaMek Entity (MekStation has unit types already)
- Force is hierarchical tree (Lance→Company→Battalion)
- Mission/Contract/Scenario is 3-level hierarchy
- Event system uses central EventBus pattern
- 200+ campaign options (we'll implement subset)

### Metis Review
**Identified Gaps** (addressed):
- MVP scope defined → 20 TODOs across 7 phases
- Part subset not needed → MekStation already has units
- MegaMek data → MekStation has equipment database
- Integration with existing stores → References provided

---

## MekStation Existing Assets

### Already Built (leverage these):
| Asset | Location | Use For |
|-------|----------|---------|
| Unit stores | `src/stores/useUnitStore.ts` | Unit management in campaign |
| Unit types | `src/types/construction/` | Unit data models |
| Equipment DB | `src/data/equipment/` | Combat calculations |
| Pilot store | `src/stores/usePilotStore.ts` | Expand to Person |
| Store patterns | `src/stores/utils/` | New campaign stores |
| IndexedDB | y-indexeddb + Zustand persist | Campaign persistence |
| BV calculations | `src/utils/` | Combat resolution |

### To Build:
- Campaign aggregate layer
- Personnel expansion (from Pilot to full Person)
- Force hierarchy entity
- Mission/Contract/Scenario system
- Combat resolution (ACAR)
- Day progression
- Financial system
- Campaign UI pages

---

## Work Objectives

### Core Objective
Extend MekStation into a campaign manager that can run basic MekHQ-style campaigns: manage personnel, units, forces, take contracts, resolve battles, and progress day-by-day.

### Concrete Deliverables
- `src/types/campaign/` - Campaign domain types
- `src/stores/campaign/` - Campaign stores
- `src/lib/campaign/` - Campaign logic
- `src/lib/combat/` - ACAR combat resolution
- `src/lib/finances/` - Financial system
- `src/app/campaign/` - Campaign UI routes

### Definition of Done
- [ ] Create new campaign with name, faction, date
- [ ] Expand pilots to full personnel with skills/attributes
- [ ] Organize units into force hierarchy
- [ ] Accept contracts from generated market
- [ ] Deploy forces to scenarios
- [ ] Resolve combat via ACAR
- [ ] Process battle results (damage, casualties)
- [ ] Advance day and process maintenance/healing
- [ ] Persist campaign to IndexedDB

### Must Have
- Campaign aggregate tying together existing entities
- Person (expanded from Pilot) with skills and roles
- Force hierarchy with unit assignments
- Mission/Contract/Scenario entities
- ACAR combat resolution
- Day advancement with maintenance
- Basic finances (transactions, balance)
- Campaign UI shell

### Must NOT Have (Guardrails)
- StratCon system (defer to v2)
- Story Arc system (defer to v2)
- Random events system (defer to v2)
- Full genealogy/family (defer to v2)
- Education/academy (defer entirely)
- All 76 MekHQ event types (limit to 20 essential)
- All 200+ campaign options (limit to 40 essential)
- MekHQ save file import
- Tactical combat (ACAR only for MVP)
- Part system (units are already built, no repair detail)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Jest already configured in MekStation)
- **User wants tests**: TDD for core logic, existing patterns for UI
- **Framework**: Jest + React Testing Library

---

## TODOs

### PHASE 1: Campaign Domain Types

- [x] 1.1 Define Campaign Enums

  **What to do**:
  - Create `src/types/campaign/enums/` directory
  - Define essential enums:
    - PersonnelStatus (ACTIVE, MIA, KIA, RETIRED, WOUNDED, etc.)
    - CampaignPersonnelRole (expand beyond PilotRole - add TECH, DOCTOR, ADMIN)
    - MissionStatus (ACTIVE, SUCCESS, PARTIAL, FAILED, BREACH)
    - ScenarioStatus (CURRENT, VICTORY, DEFEAT, DRAW variants)
    - ForceType (STANDARD, SUPPORT, CONVOY, SECURITY)
    - FormationLevel (LANCE, COMPANY, BATTALION, REGIMENT)
    - TransactionType (CONTRACT_PAYMENT, SALARY, MAINTENANCE, REPAIR)

  **Must NOT do**:
  - All 50+ MekHQ enums (prioritize 8-10 essential)

  **Parallelizable**: YES (with 1.2)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\enums\PersonnelStatus.java` - Status values
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\enums\PersonnelRole.java` - Role definitions
  - MekStation existing: `src/types/enums/` - Existing enum patterns to follow

  **Acceptance Criteria**:
  - [ ] All 10 campaign enums defined
  - [ ] Each enum has displayName() helper
  - [ ] Enums follow existing MekStation patterns
  - [ ] `npm test` passes

  **Commit**: YES
  - Message: `feat(campaign): add campaign enums`

---

- [x] 1.2 Define Money and Financial Types

  **What to do**:
  - Create `src/types/campaign/Money.ts`
  - Immutable Money class:
    - Internal storage as cents (number, not bigint for simplicity)
    - add(), subtract(), multiply(), divide()
    - format() → "1,234.56 C-bills"
    - ZERO constant
  - Create `src/types/campaign/Transaction.ts`
  - Create `src/types/campaign/IFinances.ts` interface

  **Parallelizable**: YES (with 1.1)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\finances\Money.java:1-200` - Money implementation
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\finances\Transaction.java` - Transaction record

  **Acceptance Criteria**:
  - [ ] Money arithmetic works correctly
  - [ ] No floating point errors
  - [ ] Transaction records type, date, amount, description
  - [ ] Tests verify edge cases

  **Commit**: YES
  - Message: `feat(campaign): add Money and financial types`

---

- [x] 1.3 Expand Skill System for Campaign

  **What to do**:
  - Review existing pilot skills in `src/stores/usePilotStore.ts`
  - Create `src/types/campaign/skills/ISkill.ts`:
    - level: number (0-10)
    - bonus: number
    - xpProgress: number
    - typeId: string (reference to skill type)
  - Create `src/types/campaign/skills/ISkillType.ts`:
    - id, name, target number
    - costs per level
    - linked attributes
  - Create `src/types/campaign/skills/IAttributes.ts`:
    - 7 core: STR, BOD, REF, DEX, INT, WIL, CHA (1-10)
    - Edge (0-10)
  - Create modifier calculation functions

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\skills\Skill.java`
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\skills\Attributes.java`
  - MekStation existing: `src/stores/usePilotStore.ts` - Current pilot/skill structure

  **Acceptance Criteria**:
  - [ ] Skill interface matches MekHQ conceptually
  - [ ] getSkillValue() calculation implemented
  - [ ] Experience level thresholds (Green→Elite)
  - [ ] Attribute modifier calculation (-4 to +5)
  - [ ] Backwards compatible with existing pilot skills

  **Commit**: YES
  - Message: `feat(campaign): expand skill system`

---

### PHASE 2: Personnel System

- [x] 2.1 Expand Pilot to Person Entity

  **What to do**:
  - Review existing pilot interface in MekStation
  - Create `src/types/campaign/Person.ts`:
    - Extend or wrap existing pilot concept
    - Add campaign fields:
      - status: PersonnelStatus
      - primaryRole, secondaryRole: CampaignPersonnelRole
      - rank: string
      - xp: number
      - hits: number (current wounds)
      - injuries: IInjury[] (tracking healing)
      - skills: ISkills
      - attributes: IAttributes
      - unitId?: string (assignment)
      - recruitmentDate: Date
      - deathDate?: Date
  - Keep backwards compatibility with existing pilots

  **Must NOT do**:
  - All 250+ MekHQ Person fields (40-50 MVP)
  - Genealogy system (defer)
  - Full personality traits (defer)
  - Education tracking (defer)

  **Parallelizable**: NO (depends on 1.3)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\personnel\Person.java:1-500`
  - `E:\Projects\mekhq\.sisyphus\drafts\domain-model-analysis.md`
  - MekStation existing: `src/stores/usePilotStore.ts`

  **Acceptance Criteria**:
  - [ ] IPerson interface covers 40-50 MVP fields
  - [ ] Existing pilots can upgrade to persons (migration path)
  - [ ] Status transitions work (ACTIVE→WOUNDED→KIA)
  - [ ] Unit assignment tracking works

  **Commit**: YES
  - Message: `feat(campaign): expand Pilot to Person entity`

---

- [x] 2.2 Create Personnel Store

  **What to do**:
  - Create `src/stores/campaign/usePersonnelStore.ts`
  - Follow existing MekStation store patterns:
    - createPersonnelStore() factory
    - Registry pattern if multiple campaigns
    - Persist to IndexedDB
  - CRUD operations: addPerson, removePerson, updatePerson
  - Query methods: getByStatus, getByRole, getByUnit
  - Integration with existing pilot store (migration or replacement)

  **References**:
  - MekStation existing: `src/stores/useUnitStore.ts` - Store factory pattern
  - MekStation existing: `src/stores/utils/clientSafeStorage.ts` - Persistence
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\Campaign.java:personnel methods`

  **Acceptance Criteria**:
  - [ ] Store persists to IndexedDB
  - [ ] CRUD operations work correctly
  - [ ] Query filters work (active personnel, by role)
  - [ ] Integration with existing data

  **Commit**: YES
  - Message: `feat(campaign): add personnel store`

---

### PHASE 3: Campaign Core

- [x] 3.1 Define Force Entity

  **What to do**:
  - Create `src/types/campaign/Force.ts`:
    - id: string
    - name: string
    - parentForceId?: string
    - subForceIds: string[]
    - unitIds: string[] (references to MekStation units)
    - forceType: ForceType
    - formationLevel: FormationLevel
    - commanderId?: string (reference to person)
  - Create tree traversal functions:
    - getAllParents(force, forceMap)
    - getAllSubForces(force, forceMap)
    - getAllUnits(force, forceMap)
    - getFullName(force, forceMap) → "Lance 1, Company A"
  - Integrate with existing MekStation force builder if present

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\force\Force.java:1-400`
  - `E:\Projects\mekhq\.sisyphus\drafts\domain-model-analysis.md`

  **Acceptance Criteria**:
  - [ ] Force tree can be arbitrarily deep
  - [ ] Unit IDs reference MekStation's existing units
  - [ ] getAllUnits() recursively collects from tree
  - [ ] getFullName() returns hierarchical path

  **Commit**: YES
  - Message: `feat(campaign): add Force entity`

---

- [x] 3.2 Create Campaign Aggregate

  **What to do**:
  - Create `src/types/campaign/Campaign.ts`:
    - id: string
    - name: string
    - currentDate: Date
    - factionId: string
    - personnel: Map<string, IPerson>
    - forces: Map<string, IForce>
    - rootForceId: string
    - missions: Map<string, IMission>
    - finances: IFinances
  - Reference existing MekStation units via their store (don't duplicate)
  - Campaign metadata and options (40 essential of 200+)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\Campaign.java:1-500`
  - MekStation existing: `src/stores/unitStoreRegistry.ts` - How to access units

  **Acceptance Criteria**:
  - [ ] Campaign aggregates personnel, forces, missions, finances
  - [ ] References MekStation unit stores (no duplication)
  - [ ] Date progression works
  - [ ] Faction assignment works

  **Commit**: YES
  - Message: `feat(campaign): add Campaign aggregate`

---

- [ ] 3.3 Create Campaign Store

  **What to do**:
  - Create `src/stores/campaign/useCampaignStore.ts`
  - Single campaign instance (extend to multiple later)
  - Actions:
    - createCampaign(options)
    - loadCampaign(id)
    - saveCampaign()
    - advanceDay()
  - Compose sub-stores (personnel, forces, missions)
  - Persist entire campaign state

  **References**:
  - MekStation existing: Store patterns in `src/stores/`

  **Acceptance Criteria**:
  - [ ] Campaign creates with defaults
  - [ ] Campaign persists to IndexedDB
  - [ ] Sub-stores accessible via campaign
  - [ ] advanceDay() increments date

  **Commit**: YES
  - Message: `feat(campaign): add campaign store`

---

### PHASE 4: Mission System

- [ ] 4.1 Define Mission/Contract/Scenario Entities

  **What to do**:
  - Create `src/types/campaign/Mission.ts`:
    - Mission: id, name, status, systemId, scenarioIds[]
    - Contract extends Mission: employer, startDate, endDate, paymentTerms
  - Create `src/types/campaign/Scenario.ts`:
    - id, name, status, missionId
    - deployedForceIds: string[]
    - objectives: IObjective[]
    - terrainType?: string
  - Create `src/types/campaign/PaymentTerms.ts`:
    - basePayment: Money
    - salvagePercent: number
    - commandRights: string
    - transportCompensation: Money

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\mission\Mission.java`
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\mission\Contract.java`
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\mission\Scenario.java`

  **Acceptance Criteria**:
  - [ ] Mission contains scenario references
  - [ ] Contract has financial terms
  - [ ] Status transitions (ACTIVE→SUCCESS/FAILED)
  - [ ] Force deployment tracked per scenario

  **Commit**: YES
  - Message: `feat(campaign): add Mission/Contract/Scenario entities`

---

- [ ] 4.2 Create Mission Store

  **What to do**:
  - Create `src/stores/campaign/useMissionStore.ts`
  - CRUD for missions/contracts
  - Query: getActiveMissions(), getCompletedMissions()
  - Scenario management within missions

  **Acceptance Criteria**:
  - [ ] Missions persist
  - [ ] Active contracts queryable
  - [ ] Scenarios managed within missions

  **Commit**: YES
  - Message: `feat(campaign): add mission store`

---

- [ ] 4.3 Implement Contract Market

  **What to do**:
  - Create `src/lib/campaign/contractMarket.ts`
  - generateContracts(campaign, count):
    - Random contract type selection
    - Random employer assignment
    - Payment calculation (based on force BV)
  - Contract acceptance flow

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\market\contractMarket\AbstractContractMarket.java:1-300`

  **Acceptance Criteria**:
  - [ ] Market generates 3-5 varied contracts
  - [ ] Payment scales with force size
  - [ ] Contract acceptance adds to campaign

  **Commit**: YES
  - Message: `feat(campaign): add contract market`

---

### PHASE 5: Combat Resolution

- [ ] 5.1 Implement ACAR Combat Resolution

  **What to do**:
  - Create `src/lib/combat/acar.ts`
  - Port ACAR logic:
    - calculateForceBV(unitIds) - use MekStation's BV calculations
    - calculateVictoryProbability(playerBV, opponentBV)
    - distributeDamage(units, severity)
    - determineCasualties(personnel, battleIntensity)
  - Create ResolveScenarioResult type:
    - outcome: 'victory' | 'defeat' | 'draw'
    - unitDamage: Map<unitId, damagePercent>
    - personnelCasualties: Map<personId, status>
    - salvage: ISalvageItem[]

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\autoResolve/` - Auto-resolve classes
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\ResolveScenarioTracker.java`
  - MekStation existing: BV calculations in `src/utils/`

  **Acceptance Criteria**:
  - [ ] ACAR produces win/loss/draw
  - [ ] Higher BV = higher win probability
  - [ ] Unit damage proportional to battle intensity
  - [ ] Personnel casualties occur in losses

  **Commit**: YES
  - Message: `feat(combat): add ACAR resolution`

---

- [ ] 5.2 Implement Battle Result Processing

  **What to do**:
  - Create `src/lib/combat/resolveScenario.ts`
  - processScenarioResult(campaign, scenario, result):
    - Update unit states (damage tracking or status flags)
    - Apply injuries to personnel
    - Process casualties (update PersonnelStatus to KIA/MIA)
    - Add salvage to campaign
    - Update scenario status
    - Record transaction for salvage value

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\ResolveScenarioTracker.java:processGame`

  **Acceptance Criteria**:
  - [ ] Unit damage persists after battle
  - [ ] Personnel injuries recorded
  - [ ] Killed personnel marked KIA
  - [ ] Salvage value added to finances
  - [ ] Scenario status updated

  **Commit**: YES
  - Message: `feat(combat): add battle result processing`

---

### PHASE 6: Day Progression

- [ ] 6.1 Implement Day Advancement

  **What to do**:
  - Create `src/lib/campaign/dayAdvancement.ts`
  - advanceDay(campaign):
    - Process personnel healing (reduce injury durations)
    - Process contracts (check expiration, scheduled payments)
    - Process finances (daily costs: salaries, maintenance)
    - Advance date by 1 day
    - Return day report (what happened)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\CampaignNewDayManager.java`

  **Acceptance Criteria**:
  - [ ] Date advances by one day
  - [ ] Injured personnel heal over time
  - [ ] Daily costs deducted from balance
  - [ ] Contract payments credited on schedule
  - [ ] Day report returned

  **Commit**: YES
  - Message: `feat(campaign): add day advancement`

---

- [ ] 6.2 Implement Basic Financial Processing

  **What to do**:
  - Create `src/lib/finances/FinanceService.ts`
  - Transaction recording: recordTransaction(finances, tx)
  - Balance calculation: getBalance(finances)
  - Daily costs: calculateDailyCosts(campaign)
    - Salary per active personnel
    - Basic maintenance per unit
  - Contract payments: processContractPayment(campaign, contract)

  **References**:
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\finances\Finances.java:1-300`
  - `E:\Projects\mekhq\MekHQ\src\mekhq\campaign\finances\Accountant.java`

  **Acceptance Criteria**:
  - [ ] Transactions recorded with type/date/amount
  - [ ] Balance reflects all transactions
  - [ ] Daily costs calculated reasonably
  - [ ] Contract payments credited correctly

  **Commit**: YES
  - Message: `feat(finances): add financial processing`

---

### PHASE 7: Campaign UI

- [ ] 7.1 Create Campaign Shell

  **What to do**:
  - Add campaign routes: `src/app/campaign/`
  - Create campaign layout with navigation tabs:
    - Dashboard
    - Personnel
    - Forces (TO&E)
    - Missions
    - Finances
  - Add to main MekStation navigation (or separate mode)
  - Add date display and "Advance Day" button in header

  **References**:
  - MekStation existing: App layout patterns
  - `E:\Projects\mekhq\MekHQ\src\mekhq\gui\CampaignGUI.java`

  **Acceptance Criteria**:
  - [ ] Campaign routes accessible
  - [ ] Tab navigation works
  - [ ] Date displayed prominently
  - [ ] Advance Day button works
  - [ ] Integrates with existing MekStation style

  **Commit**: YES
  - Message: `feat(ui): add campaign shell`

---

- [ ] 7.2 Create Personnel Page

  **What to do**:
  - Create `src/app/campaign/personnel/page.tsx`
  - Personnel list with:
    - Columns: name, role, status, unit assignment
    - Filter by status and role
    - Sort by name, role
  - Personnel detail panel:
    - Campaign-specific fields
    - Skills and attributes
    - Unit assignment
  - Actions: add, remove, edit personnel

  **References**:
  - MekStation existing: Pilot management UI patterns

  **Acceptance Criteria**:
  - [ ] List displays all personnel
  - [ ] Filters work correctly
  - [ ] Details show all MVP fields
  - [ ] CRUD operations work

  **Commit**: YES
  - Message: `feat(ui): add personnel page`

---

- [ ] 7.3 Create TO&E (Forces) Page

  **What to do**:
  - Create `src/app/campaign/forces/page.tsx`
  - Force tree visualization (collapsible hierarchy)
  - Drag-drop to reorganize forces
  - Create/delete forces
  - Assign units to forces
  - Display formation level and commander

  **References**:
  - MekStation existing: Force builder if present
  - `E:\Projects\mekhq\MekHQ\src\mekhq\gui\TOETab.java`

  **Acceptance Criteria**:
  - [ ] Tree displays force hierarchy
  - [ ] Can create sub-forces
  - [ ] Can assign units via drag-drop
  - [ ] Names and levels editable

  **Commit**: YES
  - Message: `feat(ui): add TO&E page`

---

- [ ] 7.4 Create Mission Page

  **What to do**:
  - Create `src/app/campaign/missions/page.tsx`
  - Active contracts list with details
  - Scenario list per contract
  - Force deployment interface:
    - Select forces to deploy
    - Confirm deployment
  - Resolve Battle button (triggers ACAR)
  - Battle results display (damage, casualties, salvage)

  **Acceptance Criteria**:
  - [ ] Active contracts displayed
  - [ ] Forces deployable to scenarios
  - [ ] ACAR resolution triggered from UI
  - [ ] Results displayed clearly

  **Commit**: YES
  - Message: `feat(ui): add mission page`

---

- [ ] 7.5 Create Campaign Dashboard

  **What to do**:
  - Create `src/app/campaign/page.tsx` (dashboard)
  - Quick stats cards:
    - Personnel count (active/wounded/total)
    - Unit count (operational/damaged)
    - Current balance
    - Active contracts
  - Recent events/reports list
  - Prominent "Advance Day" control
  - Campaign settings access

  **Acceptance Criteria**:
  - [ ] Stats accurate and update
  - [ ] Active contracts summarized
  - [ ] Day advancement prominent
  - [ ] Useful overview at a glance

  **Commit**: YES
  - Message: `feat(ui): add campaign dashboard`

---

## Commit Strategy

| After Task | Message | Verification |
|------------|---------|--------------|
| 1.1-1.3 | `feat(campaign): add foundation types` | `npm test` passes |
| 2.1-2.2 | `feat(campaign): add personnel system` | Tests pass |
| 3.1-3.3 | `feat(campaign): add campaign core` | Integration works |
| 4.1-4.3 | `feat(campaign): add mission system` | Tests pass |
| 5.1-5.2 | `feat(combat): add ACAR` | Combat works |
| 6.1-6.2 | `feat(campaign): add day progression` | Day advance works |
| 7.1-7.5 | `feat(ui): add campaign UI` | Manual verification |

---

## Success Criteria

### Verification Commands
```bash
cd E:\Projects\mekstation
npm test                    # All tests pass
npm run build              # Build succeeds  
npm run dev                # Dev server starts
```

### Final Checklist
- [ ] Campaign creates and persists
- [ ] Personnel manage with campaign fields
- [ ] Forces organize MekStation units
- [ ] Contracts generate and accept
- [ ] Combat resolves via ACAR
- [ ] Day advances with effects
- [ ] UI allows full campaign loop

---

## Timeline Estimate

| Phase | Duration | Notes |
|-------|----------|-------|
| Phase 1 | 3 days | Foundation types |
| Phase 2 | 3 days | Personnel (extend pilots) |
| Phase 3 | 4 days | Campaign core |
| Phase 4 | 4 days | Mission system |
| Phase 5 | 4 days | Combat resolution |
| Phase 6 | 3 days | Day progression |
| Phase 7 | 5 days | Campaign UI |
| **Total** | **~4-5 weeks** | MVP |

---

## Integration Notes

### MekStation Assets to Leverage
| Asset | Location | Use For |
|-------|----------|---------|
| Unit stores | `src/stores/useUnitStore.ts` | Reference units in campaigns |
| Vehicle stores | `src/stores/useVehicleStore.ts` | Reference vehicles |
| Unit types | `src/types/construction/` | Type definitions |
| Equipment DB | `src/data/equipment/` | Combat calculations |
| Pilot store | `src/stores/usePilotStore.ts` | Extend to Person |
| Store patterns | `src/stores/utils/` | Pattern for campaign stores |
| Tab manager | `src/stores/useTabManagerStore.ts` | Campaign tabs |
| y-indexeddb | Package.json | Persistence |
| BV calculations | `src/utils/` | Combat resolution |

### MekHQ Reference Files (Read-Only)
Located in `E:\Projects\mekhq\`:
- `MekHQ/src/mekhq/campaign/Campaign.java` - Root aggregate pattern
- `MekHQ/src/mekhq/campaign/personnel/Person.java` - Person fields
- `MekHQ/src/mekhq/campaign/force/Force.java` - Force tree
- `MekHQ/src/mekhq/campaign/mission/` - Mission/Contract/Scenario
- `MekHQ/src/mekhq/campaign/finances/` - Financial system
- `MekHQ/src/mekhq/campaign/autoResolve/` - ACAR logic
- `.sisyphus/drafts/domain-model-analysis.md` - Entity relationships

---

## Future Phases (v2+)

Deferred features for future versions:
- StratCon system
- Story Arc engine
- Advanced medical system
- Genealogy/family
- Education/academies
- Full random events
- Faction standing
- All 76 event types
- All 200+ campaign options
- Tactical combat
- MekHQ save file import
- Multiplayer sync

---

*Plan generated by Prometheus.*

## To Execute This Plan

1. Copy this file to MekStation:
   ```bash
   mkdir -p E:\Projects\mekstation\.sisyphus\plans
   cp E:\Projects\mekhq\.sisyphus\plans\mekhq-campaign-system.md E:\Projects\mekstation\.sisyphus\plans\
   ```

2. Open a session in MekStation:
   ```bash
   cd E:\Projects\mekstation
   ```

3. Run `/start-work` to begin execution.
