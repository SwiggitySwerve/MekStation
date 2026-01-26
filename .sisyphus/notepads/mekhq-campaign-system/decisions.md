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

