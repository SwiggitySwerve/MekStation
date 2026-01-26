# Learnings - MekHQ Campaign System

Convention discoveries, patterns, and best practices found during implementation.

---


## Enum Pattern Discovery (Task 1.1)

### MekStation Enum Convention
- Enums use SCREAMING_SNAKE_CASE for values (e.g., `INNER_SPHERE = 'Inner Sphere'`)
- Display values are human-readable strings (e.g., 'Inner Sphere')
- Each enum includes:
  - `ALL_*` constant array with Object.freeze() for immutability
  - `isValid*()` type guard function
  - `display*()` helper function for display names
  - TSDoc comments on enum and each value

### Campaign Enums Implementation
- Created 7 essential campaign enums (PersonnelStatus, CampaignPersonnelRole, MissionStatus, ScenarioStatus, ForceType, FormationLevel, TransactionType)
- Each enum has 8-10 values for MVP scope
- All enums follow TechBase.ts pattern exactly
- Barrel export (index.ts) re-exports all enums for clean imports

### MekHQ Reference Insights
- PersonnelStatus in MekHQ has 30+ values but MVP only needs 10 essential ones
- PersonnelRole in MekHQ has 300+ roles but campaign system only needs 10 core roles
- Simplified approach: focus on combat/support distinction rather than granular roles
- MekHQ uses complex metadata (severity, prisoner-suitable flags) - not needed for MVP

### TypeScript Best Practices Observed
- Object.freeze() on arrays prevents accidental mutations
- Type guard functions (isValid*) enable safe type narrowing
- Display functions separate enum values from UI representation
- Consistent naming: ALL_*, isValid*, display* pattern across all enums

## Money Class Implementation (Task 1.2)

### Immutable Value Object Pattern
- Money class stores internally as cents (number, not bigint) to avoid floating-point errors
- All arithmetic operations (add, subtract, multiply, divide) return NEW Money instances
- Original Money objects are never mutated - enables safe functional composition
- Constructor rounds to cents: `Math.round(amount * 100)` prevents 0.1 + 0.2 = 0.30000000000000004 issues

### Floating-Point Precision Strategy
- Store as cents internally: `private readonly cents: number`
- Convert to/from C-bills only at boundaries (constructor, getters, format)
- All arithmetic happens on integer cents: `(this.cents + other.cents) / 100`
- Rounding happens once at construction, not repeatedly in operations
- Tested with 82 test cases covering edge cases (0.1 + 0.2, large numbers, division rounding)

### Formatting Pattern
- `format()` returns "1,234.56 C-bills" with thousand separators
- Uses `toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`
- Always shows exactly 2 decimal places for consistency
- Handles negative amounts correctly

### Comparison and Predicate Methods
- `compareTo()` returns -1/0/1 for sorting and comparison chains
- Predicates: `isZero()`, `isPositive()`, `isNegative()`, `isPositiveOrZero()`
- `equals()` for value equality (not reference equality)
- `absolute()` returns new Money instance with absolute value

### Static Factory and Constants
- `Money.ZERO` constant for zero amounts (immutable singleton)
- `Money.fromCents(cents)` factory for creating from raw cents
- `toJSON()` returns amount as number for JSON serialization

### Test Coverage
- 82 tests covering: constructors, arithmetic, formatting, comparisons, predicates, edge cases
- All tests pass with zero floating-point errors
- Chained operations tested (add → multiply → subtract)
- Large transaction sequences tested (100 iterations)
- Division/multiplication round-trip tested

### Transaction and Finances Interfaces
- Transaction interface: id, type (enum), amount (Money), date, description
- TransactionType enum: Income, Expense, Repair, Maintenance, Salvage, Miscellaneous
- IFinances interface: transactions array, computed balance (Money)
- Follows MekHQ Transaction.java structure but simplified for MVP


## IAttributes Interface & Modifier Function (Task 1.3)

### Attribute System Design
- 7 core attributes (STR, BOD, REF, DEX, INT, WIL, CHA) + Edge
- Core attributes: range 1-10 (minimum 1, maximum 10)
- Edge attribute: range 0-10 (minimum 0, maximum 10)
- All attributes stored as readonly numbers in interface (immutable)
- Follows MekHQ Attributes.java structure but simplified for TypeScript

### Modifier Calculation Formula
- Formula: `modifier = value - 5`
- Produces range: -4 to +5 for values 1-10
- Mapping table:
  - 1 → -4, 2 → -3, 3 → -2, 4 → -1, 5 → 0
  - 6 → +1, 7 → +2, 8 → +3, 9 → +4, 10 → +5
- Simple linear calculation with no special cases
- Bounds checking: throws Error if value outside 1-10 range

### Implementation Pattern
- `IAttributes` interface with 8 readonly fields (7 core + Edge)
- `getAttributeModifier(value: number): number` pure function
- Comprehensive error handling with descriptive messages
- TSDoc comments with examples and mapping table
- No dependencies on other modules

### Test Coverage
- 31 comprehensive tests covering:
  - Interface structure (8 fields, valid ranges)
  - Modifier calculation (all 10 values 1-10)
  - Boundary values (min/max acceptance, out-of-range rejection)
  - Error handling (descriptive error messages)
  - Modifier range validation (-4 to +5)
  - Consistency (deterministic, repeatable results)
  - Integration with IAttributes interface
  - All attributes at min/max/default values
- All tests pass with zero failures
- Zero TypeScript errors on typecheck

### File Structure
- `src/types/campaign/skills/IAttributes.ts` - Interface + function
- `src/types/campaign/skills/__tests__/attributes.test.ts` - Test suite
- Follows existing MekStation pattern for type definitions
- Ready for future skill system expansion

### Key Insights
- Immutable interface design prevents accidental mutations
- Pure function (getAttributeModifier) enables easy testing and composition
- Error-first approach with validation at function boundary
- Test-driven approach ensures correctness before integration
- Simple formula (value - 5) matches MekHQ reference exactly

## ISkillType Interface (Task 1.4)

### Skill Type Metadata Design
- Single interface defining skill type properties
- 6 fields: id, name, description, targetNumber, costs, linkedAttribute
- All fields readonly (immutable metadata)
- Follows MekHQ SkillType pattern but simplified for TypeScript

### Field Specifications
- **id**: Unique identifier (lowercase with hyphens, e.g., "gunnery", "piloting-mech")
- **name**: Display name for UI and character sheets (e.g., "Gunnery")
- **description**: Narrative explanation of skill purpose and mechanical use
- **targetNumber**: Base difficulty for skill checks (typical range 2-6)
- **costs**: Array of 10 XP costs (index N = cost to reach level N+1)
- **linkedAttribute**: Type-safe reference to IAttributes field using `keyof IAttributes`

### Type Safety Pattern
- `linkedAttribute: keyof IAttributes` ensures only valid attribute names accepted
- Prevents typos and invalid attribute references at compile time
- Enables IDE autocomplete for attribute selection
- No string literals needed - full type safety

### Cost Array Design
- 10 elements for skill levels 0→1 through 9→10
- Costs typically increase with level (progressive difficulty)
- Example: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
- Allows flexible progression curves per skill type

### Documentation Pattern
- Comprehensive TSDoc with field-level comments
- Example usage showing typical skill type definition
- Attribute linking examples (DEX for Gunnery, INT for Hacking, CHA for Negotiation)
- Clear explanation of skill check mechanics

### Integration Points
- Imported IAttributes for type-safe attribute reference
- Ready for ISkill interface (will reference ISkillType by id)
- Ready for skill check calculation functions
- Supports skill progression and XP tracking

### File Structure
- `src/types/campaign/skills/ISkillType.ts` - Single interface file
- No tests (metadata interface, no logic to test)
- Zero TypeScript errors on typecheck
- Ready for immediate use in skill system

## Skill System Complete (Task 1.3 - Final)

### ISkill Interface Design
- 4 readonly fields: level (0-10), bonus (+/-), xpProgress, typeId
- Represents character's proficiency in a specific skill
- Combines skill type metadata with personal progression
- Immutable design prevents accidental mutations

### getSkillValue() Calculation Function
- Formula: `level + bonus + attributeModifier`
- Integrates three types: ISkill, ISkillType, IAttributes
- Validates skill level (0-10) with descriptive errors
- Validates linked attribute exists and is numeric
- Returns effective skill value for skill checks
- Supports all 8 attributes (STR, BOD, REF, DEX, INT, WIL, CHA, Edge)

### Experience Level System
- 4 levels: Green (0-999), Regular (1000-4999), Veteran (5000-11999), Elite (12000+)
- ExperienceLevel enum with string values
- EXPERIENCE_THRESHOLDS constant with min/max ranges
- getExperienceLevel(totalXP) function with validation
- Throws error for negative XP
- Supports unlimited Elite progression

### Test Coverage
- **56 comprehensive tests** in skillSystem.test.ts:
  - ISkill interface (5 tests)
  - ISkillType interface (5 tests)
  - getSkillValue() function (27 tests):
    - Basic calculation (4 tests)
    - Attribute modifier integration (5 tests)
    - All linked attributes (5 tests)
    - Edge cases (5 tests)
    - Validation/error handling (3 tests)
  - Experience levels (14 tests):
    - Enum structure (1 test)
    - Thresholds (4 tests)
    - getExperienceLevel() (9 tests)
  - Integration tests (5 tests)
- **87 total tests** across skill system (31 attributes + 56 skillSystem)
- All tests PASS with zero failures

### Integration Points
- ISkill references ISkillType by id (string)
- ISkillType uses `keyof IAttributes` for type-safe attribute linking
- getSkillValue() combines all three types seamlessly
- Experience levels independent of skill progression
- Backwards compatible with existing pilot skills (separate system)

### Key Insights
- Skill value calculation is pure function (no side effects)
- Attribute modifiers range -4 to +5 (from IAttributes)
- Skill levels 0-10 (0 = untrained, 1-10 = trained)
- Bonuses can be positive or negative (penalties)
- XP progress tracked separately from level
- Experience thresholds match MekHQ reference exactly

### File Structure
- `src/types/campaign/skills/ISkill.ts` - Interface + getSkillValue()
- `src/types/campaign/skills/experienceLevels.ts` - Enum + thresholds + function
- `src/types/campaign/skills/index.ts` - Barrel export
- `src/types/campaign/skills/__tests__/skillSystem.test.ts` - 56 tests
- `src/types/campaign/skills/__tests__/attributes.test.ts` - 31 tests (existing)

### Verification Results
- ✅ 87 tests pass (31 + 56)
- ✅ Zero TypeScript errors
- ✅ All edge cases covered
- ✅ Integration tests validate complete workflow
- ✅ Backwards compatible with existing systems

## IPerson Interface Implementation (Task 1.5)

### Interface Composition Pattern
- IPerson extends IPersonIdentity and IPersonBackground for clean separation
- Sub-interfaces (IPersonCareer, IPersonExperience, IPersonCombatState, IPersonAssignment) defined but fields inlined in IPerson for simplicity
- Total ~45 fields in IPerson (within 40-50 MVP target)
- All fields readonly for immutability

### IInjury Interface Design
- 10 fields: id, type, location, severity, daysToHeal, permanent, acquired, description, skillModifier, attributeModifier
- Severity range 1-5 (higher = more severe)
- Permanent injuries have daysToHeal = 0 and permanent = true
- Optional modifiers for skill/attribute penalties while injured

### Backwards Compatibility Strategy
- IPerson includes pilotSkills (IPilotSkills) separate from campaign skills
- pilotToPerson() migration helper converts IPilot to IPerson
- Status mapping: PilotStatus → PersonnelStatus (active→ACTIVE, injured→WOUNDED, etc.)
- Default attributes (all 5s, Edge 0) for pilots without campaign attributes
- Career data preserved (missions, kills, XP)

### Helper Functions Pattern
- Pure functions for status checks: isAlive(), isActive(), isAvailable(), isWounded()
- XP helpers: getTotalXP(), getAvailableXP()
- Injury helpers: hasPermanentInjuries(), getTotalHealingDays()
- Role helpers: isCombatRole(), isSupportRole()
- All functions take IPerson and return boolean/number (no side effects)

### Type Guards
- isInjury() validates all required fields and types
- isPerson() validates core fields (id, name, status, role, rank, xp, hits, etc.)
- Both return false for null/undefined/missing fields

### Factory Functions
- createDefaultAttributes() returns average attributes (all 5s, Edge 0)
- createInjury() creates injury with defaults (permanent=false, acquired=now)

### Test Coverage
- 89 comprehensive tests covering:
  - IInjury interface (4 tests)
  - IPerson interface (13 tests)
  - Helper functions (44 tests)
  - Migration helper (11 tests)
  - Type guards (9 tests)
  - Factory functions (3 tests)
  - Status transitions (4 tests)
  - XP accumulation (3 tests)
  - Unit assignment (4 tests)
- All tests PASS with zero failures
- Zero TypeScript errors on typecheck

### Key Insights
- Hits (wounds) range 0-6, with 6 being death threshold (matches MekHQ)
- Healing time calculated as max(daysToWaitForHealing, max injury days)
- Combat roles: PILOT, AEROSPACE_PILOT, VEHICLE_DRIVER, SOLDIER
- Support roles: TECH, DOCTOR, MEDIC, ADMIN, SUPPORT
- UNASSIGNED role for personnel without assignment

## Personnel Store Implementation (2026-01-26)

### Store Pattern
- Factory function `createPersonnelStore(campaignId)` creates isolated store instances
- Each campaign gets independent persistence via `personnel-${campaignId}` key
- Map<string, IPerson> for efficient O(1) lookups by ID
- Immutable updates: `new Map(state.personnel)` on every change

### CRUD Operations
- `addPerson`: Overwrites on duplicate ID (Map.set behavior)
- `updatePerson`: Auto-updates `updatedAt` timestamp, no-op for non-existent ID
- `removePerson`: No-op for non-existent ID (Map.delete behavior)
- `getPerson`: Returns undefined for non-existent (Map.get behavior)

### Query Methods
- All queries use `Array.from(map.values()).filter()`
- `getByRole`: Checks BOTH primaryRole AND secondaryRole
- `getByUnit`: Filters by unitId (handles undefined)
- `getActive`: Shortcut for `getByStatus(PersonnelStatus.ACTIVE)`
- Query results are arrays, never mutate store

### Persistence (IndexedDB via localStorage)
- **Map Serialization**: `partialize` converts Map → `Array.from(entries())`
- **Map Deserialization**: `merge` converts Array → `new Map(array)`
- **Date Serialization Issue**: Date objects become strings after JSON round-trip
  - `recruitmentDate: Date` → `recruitmentDate: string` after persistence
  - Tests must account for this (check string type, not Date equality)
- Storage key pattern: `personnel-${campaignId}`
- clientSafeStorage handles SSR (no window.localStorage on server)

### Test Coverage (48 tests)
- Store creation: 3 tests
- CRUD operations: 12 tests (add, remove, update, get, getAll, clear)
- Query methods: 12 tests (status, role, unit, active, independence)
- Persistence: 8 tests (serialization, deserialization, large sets)
- Edge cases: 5 tests (empty store, large sets, concurrent updates, complex data)

### Performance
- 1000 personnel: Add in <1s, query in <100ms
- Map provides O(1) lookups vs O(n) array search
- Query filters create new arrays (safe, no mutation)

### Gotchas
- **Timestamp precision**: Tests need 10ms delay for updatedAt to change
- **Date serialization**: Dates become strings after JSON round-trip
- **Map immutability**: Always create new Map, never mutate existing
- **Query independence**: Each query creates new array from Map.values()


## Force Tree Implementation (2026-01-26)

### IForce Interface Design
- Hierarchical tree structure with parent/child relationships
- 11 readonly fields: id, name, parentForceId, subForceIds, unitIds, forceType, formationLevel, commanderId, createdAt, updatedAt
- Optional parentForceId (undefined for root forces)
- Arrays for subForceIds and unitIds (empty arrays for leaf nodes)
- Follows MekHQ Force.java structure but simplified for TypeScript

### Tree Traversal Functions
- **getAllParents()**: Traverses up tree from force to root, returns array of parent forces
- **getAllSubForces()**: Traverses down tree recursively, returns all descendant forces (depth-first)
- **getAllUnits()**: Collects all unit IDs from force + all descendants
- **getFullName()**: Builds hierarchical name by joining force names with commas (child → parent → grandparent)

### Circular Reference Prevention
- All traversal functions use visited Set to prevent infinite loops
- Circular references detected and traversal stops gracefully
- No errors thrown, just stops at circular reference point
- Critical for user-editable force structures

### Test Coverage (32 tests)
- IForce interface structure (5 tests)
- getAllParents (6 tests): root, single parent, multiple parents, missing parent, circular refs, deep nesting
- getAllSubForces (7 tests): no children, single level, recursive, missing sub-force, circular refs, deep nesting, wide tree
- getAllUnits (5 tests): no units, force only, force + sub-forces, deep nesting, missing sub-forces
- getFullName (6 tests): root, single parent, deep nesting, missing parent, circular refs, very deep nesting
- Edge cases (3 tests): empty map, empty arrays, large tree (100+ forces)

### Performance Characteristics
- Map-based lookups: O(1) for force retrieval
- getAllParents: O(depth) time, O(depth) space
- getAllSubForces: O(n) time where n = total descendants, O(n) space
- getAllUnits: O(n) time where n = total descendants, O(u) space where u = total units
- getFullName: O(depth) time, O(depth) space
- Large tree test (111 forces, 100 units): completes in <10ms

### Key Insights
- Tree structure enables flexible military organization (lances → companies → battalions → regiments)
- Visited Set pattern prevents infinite loops without throwing errors
- Depth-first traversal for getAllSubForces matches MekHQ behavior
- getFullName builds comma-separated hierarchy (matches MekHQ getFullName())
- unitIds reference MekStation unit IDs (integration point with existing unit system)
- commanderId references IPerson (integration point with personnel system)

### Integration Points
- ForceType and FormationLevel enums from campaign/enums
- unitIds reference existing MekStation unit store
- commanderId references IPerson from personnel store
- Ready for force store implementation (separate task)

### Verification Results
- ✅ 32 tests pass (all edge cases covered)
- ✅ Zero TypeScript errors
- ✅ Circular reference handling verified
- ✅ Large tree performance verified (100+ forces)
- ✅ All traversal functions work correctly



## Campaign Aggregate Implementation (Task 3.2)

### ICampaign Interface Design
- Root aggregate entity owning all campaign entities
- Uses Map<string, T> for personnel, forces, and missions (O(1) lookups)
- References MekStation units via unitIds in forces (no duplication)
- Includes rootForceId to identify top of force hierarchy
- Timestamps use ISO 8601 strings (createdAt, updatedAt)
- currentDate is Date object for in-game date tracking

### ICampaignOptions Design (40 Essential Options)
- Organized into 5 categories:
  - Personnel options (10): healing, salaries, retirement, XP, medical
  - Financial options (10): costs, maintenance, loans, payments
  - Combat options (8): auto-resolve, injuries, death, ammunition
  - Force options (6): formation rules, commanders, combat teams
  - General options (6): date format, tech level, faction rules
- All fields readonly for immutability
- Sensible defaults in createDefaultCampaignOptions()
- Partial<ICampaignOptions> for custom overrides

### IMission Interface (Stub)
- Minimal interface for MVP: id, name, status, timestamps
- Optional fields: description, startDate, endDate, employerId, targetId
- Uses MissionStatus enum from campaign/enums
- Full mission system deferred to future task

### Helper Functions Pattern
- Pure functions taking ICampaign and returning computed values
- Personnel helpers: getTotalPersonnel, getActivePersonnel, getPersonnelByStatus
- Force helpers: getTotalForces, getAllUnits (traverses force tree)
- Mission helpers: getTotalMissions, getMissionsByStatus, getActiveMissions
- Finance helpers: getBalance (returns Money)
- Lookup helpers: getPersonById, getForceById, getMissionById, getRootForce
- getAllUnits uses Set to deduplicate unit IDs across force tree

### Type Guards
- isMission: validates required fields (id, name, status, timestamps)
- isCampaignOptions: validates key fields from each category
- isCampaign: validates all required fields including Map instances and Date

### Factory Functions
- createDefaultCampaignOptions(): returns ICampaignOptions with defaults
- createMission(): creates IMission with defaults (status=PENDING)
- createCampaign(): creates ICampaign with empty collections and options
- createCampaignWithData(): creates ICampaign from provided data (for loading)
- generateUniqueId(): timestamp + random component for unique IDs

### ID Generation Pattern
- `${prefix}-${Date.now()}-${random}` format
- Random component: Math.random().toString(36).substring(2, 9)
- Prevents collisions when creating multiple entities quickly
- Used for campaign IDs and root force IDs

### Test Coverage (70 tests)
- ICampaign interface: 5 tests
- ICampaignOptions interface: 5 tests
- IMission interface: 3 tests
- Helper functions: 24 tests
- Type guards: 15 tests
- Factory functions: 13 tests
- Integration tests: 5 tests

### Integration Points
- IPerson from Person.ts (personnel Map values)
- IForce from Force.ts (forces Map values, getAllUnits traversal)
- IFinances from IFinances.ts (finances field)
- Money from Money.ts (balance, starting funds)
- Enums from campaign/enums (PersonnelStatus, MissionStatus, etc.)
- Units referenced by ID (string[]) in forces, not duplicated

### Verification Results
- ✅ 70 tests pass
- ✅ Zero TypeScript errors
- ✅ All helper functions work correctly
- ✅ Type guards validate correctly
- ✅ Factory functions create valid instances
- ✅ Integration tests verify aggregate behavior


## Campaign Store Implementation (Task 3.3)

### Store Architecture
- **Campaign Store**: Main store managing campaign state and composing sub-stores
- **Forces Store**: CRUD operations for IForce entities with Map storage
- **Missions Store**: CRUD operations for IMission entities with Map storage
- **Personnel Store**: Already implemented (Task 2.2)

### Sub-Store Composition Pattern
- Campaign store creates sub-stores on campaign creation: `createPersonnelStore(campaignId)`
- Sub-stores persist independently with campaign-specific keys: `personnel-${campaignId}`
- Campaign store syncs sub-store data on `saveCampaign()`
- Sub-stores accessible via getters: `getPersonnelStore()`, `getForcesStore()`, `getMissionsStore()`

### Persistence Strategy
- Campaign metadata persisted to `campaign-${campaignId}` key
- Sub-stores persist to their own keys: `personnel-${id}`, `forces-${id}`, `missions-${id}`
- Serialization: Maps → Array.from(entries()), Dates → ISO strings, Money → amount number
- Deserialization: Arrays → new Map(), ISO strings → new Date(), numbers → new Money()

### Date Handling
- `currentDate` stored as Date object in memory
- Serialized to ISO 8601 string for persistence
- Deserialized back to Date on load
- `advanceDay()` uses `setDate(getDate() + 1)` for proper month/year rollover

### Root Force Pattern
- Campaign creates root force on creation with campaign name
- Root force has `parentForceId: undefined`
- Root force ID stored in `campaign.rootForceId`
- Forces store includes root force in its Map

### Singleton Pattern
- `useCampaignStore()` returns singleton instance
- `resetCampaignStore()` for testing cleanup
- Factory function `createCampaignStore()` for isolated instances

### Test Coverage
- **useCampaignStore.test.ts**: 89 tests (store creation, CRUD, persistence, sub-stores)
- **useForcesStore.test.ts**: 35 tests (CRUD, queries, persistence)
- **useMissionsStore.test.ts**: 27 tests (CRUD, persistence)
- **Total**: 151 tests across campaign stores

### Key Insights
- Zustand persist middleware handles Map serialization via partialize/merge
- Sub-store composition allows independent persistence and testing
- Auto-save on advanceDay() ensures state consistency
- setState() can be used in tests to set specific dates for edge case testing

### TransactionType Conflict
- Two TransactionType enums exist: `campaign/enums/TransactionType` and `campaign/Transaction`
- Campaign store uses `campaign/Transaction.TransactionType` for IFinances compatibility
- Future: Consider consolidating to single enum source


## Mission/Contract/Scenario Entity System (Task 4.1)

### IMission Interface Design
- Full mission interface with 12 fields (id, name, status, type, systemId, scenarioIds, description, briefing, startDate, endDate, createdAt, updatedAt)
- `type` discriminator field ('mission' | 'contract') enables type narrowing
- `scenarioIds` is readonly string[] referencing IScenario entities (not embedded)
- `startDate`/`endDate` are ISO date strings (not Date objects) for clean serialization
- `systemId` references the planet/system where mission takes place

### IContract Interface Design
- Extends IMission with 5 additional fields: employerId, targetId, paymentTerms, salvageRights, commandRights
- `type` discriminator is always 'contract' (narrowed from IMission's union)
- SalvageRights type: 'None' | 'Exchange' | 'Integrated' (string union, not enum)
- CommandRights type: 'Independent' | 'House' | 'Integrated' (string union, not enum)
- paymentTerms uses IPaymentTerms interface with Money values

### IScenario Interface Design
- 13 fields including mapSize as embedded object { width, height }
- `objectives` is readonly IObjective[] (embedded, not referenced by ID)
- `deployedForceIds` references IForce entities
- `terrainType` is string (not enum) for flexibility
- `opponentForceDescription` is free-text description of enemy forces

### IObjective Interface Design
- 5 fields: id, description, type, completed, required
- ObjectiveType: 'Destroy' | 'Capture' | 'Defend' | 'Escort' | 'Recon' | 'Withdraw' | 'Custom'
- `required` flag determines if objective is needed for mission success
- Embedded in IScenario (not standalone entity)

### IPaymentTerms Interface Design
- 7 Money fields: basePayment, successPayment, partialPayment, failurePayment, transportPayment, supportPayment
- salvagePercent: number (0-100) for salvage rights percentage
- All Money fields use immutable Money class
- calculateTotalPayout() combines base + outcome + transport + support
- Salvage calculated separately via calculateSalvageShare()

### Stub Replacement Strategy
- Campaign.ts stub IMission replaced with import + re-export from Mission.ts
- Campaign.ts createMission() updated to delegate to Mission.ts createMission()
- Campaign.ts isMission() updated to delegate to Mission.ts isMission()
- Backwards compatibility maintained: all existing imports from Campaign.ts still work
- Date→string migration: Campaign.ts createMission accepts Date|string for startDate/endDate

### Consumer Updates Required
- Store tests (useMissionsStore.test.ts, useCampaignStore.test.ts) needed updates for new required fields
- Test fixtures needed type, systemId, scenarioIds fields added
- Old Date-based startDate/endDate changed to string-based
- employerId/targetId moved from IMission to IContract (breaking change for tests using old stub)

### Test Coverage
- PaymentTerms.test.ts: 57 tests (interface, calculations, type guards, factories, integration)
- Mission.test.ts: 59 tests (IMission, IContract, helpers, type guards, factories)
- Scenario.test.ts: 72 tests (IScenario, IObjective, helpers, type guards, factories, integration)
- Total: 188 new tests, all passing
- All existing Campaign.test.ts and store tests still pass (186 tests)
- TypeScript typecheck passes with zero errors

### Key Insights
- Discriminated union (type: 'mission' | 'contract') enables clean type narrowing
- String unions (SalvageRights, CommandRights) preferred over enums for simple value sets
- Embedded objectives in scenarios (vs referenced by ID) simplifies data model
- Money class integration works well for financial calculations
- Re-export pattern in Campaign.ts maintains backwards compatibility during migration


## Mission Store Expansion (Task 4.2)

### Store Expansion Pattern
- Expanded stub store from 130 lines → 210 lines with full query + scenario support
- Added `scenarios: Map<string, IScenario>` as second Map alongside missions
- Both Maps persist independently via partialize/merge
- Import source changed from Campaign.ts (stub) to Mission.ts (full interface)

### Contract Query Pattern
- `isContract()` type guard from Mission.ts used for runtime type narrowing
- `getActiveContracts()` filters by both `isContract(m) && m.status === ACTIVE`
- `getContractsByEmployer()` filters by `isContract(m) && m.employerId === id`
- Contracts stored in same missions Map (discriminated by `type: 'contract'`)
- No separate Map needed for contracts - type guard handles filtering

### Scenario Management Pattern
- Scenarios stored in separate Map (not embedded in missions)
- `getScenariosByMission(missionId)` filters by `s.missionId === missionId`
- `clearScenarios()` independent of `clear()` (missions) - each clears its own Map
- Scenario CRUD mirrors mission CRUD exactly (same immutable update pattern)

### Persistence with Multiple Maps
- `partialize` serializes both Maps: `{ missions: Array.from(...), scenarios: Array.from(...) }`
- `merge` deserializes both: `{ missions: new Map(...), scenarios: new Map(...) }`
- Both Maps share same storage key: `missions-${campaignId}`
- No separate persistence key needed for scenarios

### Test Helper Gotcha: Readonly Arrays
- `Partial<IContract>` includes `readonly string[]` for scenarioIds
- `createContract()` factory expects mutable `string[]` parameters
- Solution: Use explicit parameter types in test helpers instead of `Partial<T>`
- Same issue with `Partial<IScenario>` and `deployedForceIds`/`objectives`

### Test Coverage (62 tests)
- Store creation: 4 tests (includes scenarios Map check)
- Mission CRUD: 14 tests (unchanged from stub)
- Mission queries: 11 tests (getActiveMissions, getCompletedMissions, getMissionsByStatus, getActiveContracts, getContractsByEmployer)
- Scenario CRUD: 15 tests (add, remove, update, get, getByMission, clear)
- Persistence: 9 tests (includes scenario persistence, both Maps together)
- Edge cases: 6 tests (contracts alongside missions, clear independence, scenario transitions)
- Expanded from 27 → 62 tests (130% increase)

### Verification Results
- ✅ 62 tests pass
- ✅ Zero TypeScript errors on typecheck
- ✅ All existing patterns preserved (backwards compatible)
- ✅ Both Maps serialize/deserialize correctly


