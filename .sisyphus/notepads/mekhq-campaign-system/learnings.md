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

