# Decisions - MekHQ Campaign System

Architectural choices and design decisions made during implementation.

---


## Campaign Enums Design Decisions (Task 1.1)

### Enum Value Selection Rationale

#### PersonnelStatus (10 values)
- **ACTIVE, MIA, KIA, RETIRED, WOUNDED**: Core combat statuses from MekHQ
- **ON_LEAVE, POW, AWOL, DESERTED, STUDENT**: Support/special statuses
- **Decision**: Excluded 20+ death-cause variants (WOUNDS, DISEASE, etc.) - too granular for MVP
- **Decision**: Excluded prisoner-specific flags - use simple enum values instead

#### CampaignPersonnelRole (10 values)
- **PILOT, AEROSPACE_PILOT, VEHICLE_DRIVER**: Combat roles
- **TECH, DOCTOR, MEDIC, ADMIN, SUPPORT**: Support roles
- **SOLDIER, UNASSIGNED**: Infantry and placeholder
- **Decision**: Collapsed 300+ MekHQ roles into 10 essential ones
- **Decision**: No skill-attribute metadata - keep enums simple, add to Person model later

#### MissionStatus (8 values)
- **ACTIVE, SUCCESS, PARTIAL, FAILED, BREACH**: Core mission outcomes
- **CANCELLED, PENDING, ABORTED**: Administrative states
- **Decision**: BREACH = unit routed/destroyed (BattleTech term)
- **Decision**: PARTIAL = partial objectives met (common in BattleTech)

#### ScenarioStatus (8 values)
- **CURRENT, VICTORY, DEFEAT, DRAW**: Battle outcomes
- **PENDING, CANCELLED, PAUSED, MIXED**: Administrative/intermediate states
- **Decision**: MIXED = partial victory/defeat (for complex multi-objective scenarios)

#### ForceType (8 values)
- **STANDARD, SUPPORT, CONVOY, SECURITY**: Core force types
- **RECON, STRIKE, RESERVE, MIXED**: Tactical variants
- **Decision**: Kept simple - no sub-types (e.g., no LIGHT_RECON vs HEAVY_RECON)

#### FormationLevel (8 values)
- **LANCE, COMPANY, BATTALION, REGIMENT**: Standard BattleTech formations
- **REINFORCED_***: Variants for over-strength units
- **Decision**: Followed BattleTech canon (Lance=4, Company=12, Battalion=36, Regiment=108)
- **Decision**: No sub-lance formations (too granular for MVP)

#### TransactionType (10 values)
- **CONTRACT_PAYMENT, SALARY, MAINTENANCE, REPAIR**: Core transaction types
- **PURCHASE, SUPPLIES, FACILITY, EXPENSE, SALVAGE, BONUS**: Extended types
- **Decision**: Kept financial model simple - no sub-categories (e.g., no SALARY_BONUS vs SALARY_ADVANCE)

### Implementation Decisions
- **Pattern**: All enums follow TechBase.ts convention exactly
- **Immutability**: ALL_* arrays use Object.freeze() for safety
- **Type Safety**: isValid*() functions enable TypeScript type narrowing
- **Display**: display*() functions separate enum values from UI representation
- **Scope**: 7 enums × 8-10 values = 70 total enum values (manageable MVP)
- **Future**: Can expand enums without breaking existing code (additive only)

## Money Class Design Decisions (Task 1.2)

### Decision: Store as Cents (number), Not BigInt
**Rationale**: 
- MVP scope doesn't require arbitrary precision (BigInt)
- JavaScript number can safely store cents up to 2^53 (9 quadrillion cents = 90 trillion C-bills)
- Simpler API and better performance than BigInt
- Easier to test and debug
- Matches MekHQ's approach (uses BigDecimal but for different reasons)

**Trade-off**: 
- Cannot handle amounts > 90 trillion C-bills (unrealistic for campaign)
- Acceptable for MVP; can upgrade to BigInt later if needed

### Decision: Immutable Operations
**Rationale**:
- Prevents accidental mutations in complex financial calculations
- Enables safe functional composition (chain operations)
- Matches TypeScript/React best practices
- Easier to reason about state changes

**Implementation**:
- All methods return new Money instances
- Constructor is the only way to create Money
- Private readonly cents field prevents external mutation

### Decision: Rounding at Construction Only
**Rationale**:
- Prevents accumulation of rounding errors
- Single point of precision control
- All arithmetic happens on exact integer cents
- Simpler to test and debug

**Example**:
```typescript
// Good: Round once at construction
const m1 = new Money(0.1 + 0.2); // Rounds to 30 cents
const m2 = new Money(0.3);       // Also 30 cents
m1.equals(m2) // true

// Bad: Round in operations (accumulates errors)
const cents1 = Math.round((0.1 + 0.2) * 100); // 30
const cents2 = Math.round(0.3 * 100);         // 30
// Works here but fails with more complex sequences
```

### Decision: Separate Transaction and IFinances Interfaces
**Rationale**:
- Transaction is a single record (immutable data)
- IFinances is a container with computed balance
- Allows Transaction to be used independently
- Follows separation of concerns

### Decision: TransactionType as Enum (Not String Union)
**Rationale**:
- Type-safe compared to string unions
- Can add helper methods later (display names, categories)
- Matches MekHQ pattern
- Easier to validate and serialize


## IPerson Interface Design Decisions (Task 1.5)

### Decision: Inline Sub-Interface Fields
**Rationale**:
- Defined IPersonIdentity, IPersonBackground, IPersonCareer, etc. as separate interfaces
- But inlined their fields directly in IPerson rather than using composition
- Simpler to use: `person.rank` instead of `person.career.rank`
- Easier to serialize/deserialize (flat structure)
- Still have sub-interfaces available for partial type checking

**Trade-off**:
- Larger interface definition
- Less modular (can't easily swap career tracking implementation)
- Acceptable for MVP; can refactor later if needed

### Decision: Separate pilotSkills from skills
**Rationale**:
- IPilot has simple gunnery/piloting skills (1-8 scale)
- Campaign system has detailed ISkill with levels, bonuses, XP progress
- Keeping both allows backwards compatibility with existing pilot system
- pilotSkills used for combat resolution (BattleTech rules)
- skills used for campaign progression (MekHQ-style)

**Implementation**:
- pilotSkills: IPilotSkills (gunnery, piloting numbers)
- skills: Record<string, ISkill> (detailed skill objects)
- Both coexist on IPerson

### Decision: Date Type for Dates
**Rationale**:
- Used JavaScript Date for recruitmentDate, deathDate, retirementDate, etc.
- Matches IInjury.acquired pattern
- Easier to work with than ISO strings for date calculations
- Can serialize to ISO string for storage

**Trade-off**:
- Requires Date serialization/deserialization
- Not directly JSON-compatible (need custom handling)
- Acceptable for MVP; can add serialization helpers later

### Decision: Status Mapping in pilotToPerson
**Rationale**:
- PilotStatus and PersonnelStatus have different values
- Created explicit mapping: active→ACTIVE, injured→WOUNDED, mia→MIA, kia→KIA, retired→RETIRED
- Unknown statuses default to ACTIVE (safe fallback)
- Preserves semantic meaning across systems

### Decision: Default Healing Time Formula
**Rationale**:
- Wounds (hits) heal at 7 days per wound level
- pilotToPerson sets daysToWaitForHealing = wounds * 7
- Simple formula, can be overridden by campaign options later
- Matches MekHQ's basic healing model

### Decision: 45 Fields (Within 40-50 Target)
**Rationale**:
- Counted all fields including inherited from IPersonIdentity/IPersonBackground
- Core fields: ~25 (id, name, status, role, rank, xp, hits, etc.)
- Optional fields: ~20 (secondaryRole, deathDate, unitId, flags, etc.)
- Total: ~45 fields (within 40-50 MVP target)
- Excluded MekHQ's 250+ fields (genealogy, education, personality, etc.)


## Campaign Aggregate Design Decisions (Task 3.2)

### Decision: Map<string, T> for Collections
**Rationale**:
- O(1) lookups by ID (vs O(n) for arrays)
- Consistent with existing patterns (personnel store, force store)
- Easy to serialize/deserialize (Array.from(entries()) / new Map(array))
- Natural fit for entity collections with unique IDs

### Decision: Reference Units by ID, Not Duplicate
**Rationale**:
- Units already exist in MekStation's unit stores
- Duplicating would cause sync issues and data inconsistency
- Forces contain unitIds (string[]) that reference unit store
- getAllUnits() collects IDs from force tree for lookups

### Decision: 40 Essential Options (Not 200+)
**Rationale**:
- MekHQ has 200+ campaign options (overwhelming for MVP)
- Selected 40 most impactful options across 5 categories
- Can expand later without breaking existing code
- Options interface is readonly (immutable)

**Categories**:
- Personnel (10): healing, salaries, retirement, XP, medical
- Financial (10): costs, maintenance, loans, payments
- Combat (8): auto-resolve, injuries, death, ammunition
- Force (6): formation rules, commanders, combat teams
- General (6): date format, tech level, faction rules

### Decision: Stub IMission Interface
**Rationale**:
- Full mission system is complex (contracts, scenarios, objectives)
- MVP only needs basic mission tracking
- Stub interface: id, name, status, optional description/dates
- Can expand to full mission system in future task

### Decision: Unique ID Generation with Random Component
**Rationale**:
- Date.now() alone can collide when creating multiple entities quickly
- Added random component: `${prefix}-${timestamp}-${random}`
- Random: Math.random().toString(36).substring(2, 9)
- Ensures uniqueness even in rapid creation scenarios

### Decision: currentDate as Date, Timestamps as ISO Strings
**Rationale**:
- currentDate is frequently used for date calculations (in-game time)
- Date object enables easy date math (add days, compare dates)
- createdAt/updatedAt are metadata, rarely computed on
- ISO strings serialize cleanly to JSON

### Decision: rootForceId Instead of Embedded Root Force
**Rationale**:
- Forces stored in Map<string, IForce> for consistency
- rootForceId references the top of hierarchy
- Allows force tree operations to work uniformly
- getRootForce() helper for convenient access


## Mission/Contract/Scenario Design Decisions (Task 4.1)

### Decision: Discriminated Union for Mission/Contract
**Rationale**:
- `type: 'mission' | 'contract'` field enables TypeScript discriminated union
- `isContract()` type guard narrows IMission to IContract
- Cleaner than checking for optional fields
- Enables exhaustive switch statements

### Decision: String Unions for SalvageRights/CommandRights
**Rationale**:
- Only 3 values each ('None'|'Exchange'|'Integrated', 'Independent'|'House'|'Integrated')
- Too few values to justify full enum with ALL_*, isValid*, display* pattern
- String unions are simpler and sufficient
- Can upgrade to enums later if needed

### Decision: ISO Date Strings Instead of Date Objects
**Rationale**:
- Old stub used `startDate?: Date` which doesn't serialize cleanly to JSON
- New interface uses `startDate?: string` (ISO date strings)
- Consistent with createdAt/updatedAt pattern
- Avoids Date serialization/deserialization issues in stores
- Campaign.ts createMission() accepts Date|string for backwards compatibility

### Decision: Embedded Objectives in Scenarios
**Rationale**:
- Objectives are always accessed in context of their scenario
- No need for independent objective lookup by ID
- Simpler data model (no separate objectives Map)
- Matches MekHQ pattern (ScenarioObjective is owned by Scenario)

### Decision: scenarioIds Reference Pattern
**Rationale**:
- Missions reference scenarios by ID (string[]), not embed them
- Scenarios are independent entities that can be queried separately
- Enables scenario-level operations without loading full mission
- Consistent with forces/personnel reference pattern

### Decision: Re-export from Campaign.ts for Backwards Compatibility
**Rationale**:
- Existing code imports IMission from '@/types/campaign/Campaign'
- Changing all import paths would be disruptive
- Re-exporting from Campaign.ts maintains all existing imports
- New code can import directly from Mission.ts
- Gradual migration path

