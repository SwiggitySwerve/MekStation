# Acquisition Supply Chain - Learnings

## Task 9.2: Acquisition Roll Calculator - COMPLETED

### Implementation Summary
- **Files Created**: 
  - `src/lib/campaign/acquisition/acquisitionRoll.ts` (60 lines)
  - `src/lib/campaign/acquisition/__tests__/acquisitionRoll.test.ts` (316 lines)
- **Tests**: 26 passing, 100% coverage
- **Commit**: `feat(campaign): implement acquisition roll calculator`

### Key Patterns Used

#### 1. Injectable RandomFn Pattern
```typescript
export type RandomFn = () => number;

function roll2d6(random: RandomFn = Math.random): number {
  const die1 = Math.floor(random() * 6) + 1;
  const die2 = Math.floor(random() * 6) + 1;
  return die1 + die2;
}
```
- Enables deterministic testing with seeded random
- Default to Math.random for production
- Test helper creates predictable rolls

#### 2. Modifier Stacking
- Modifiers are readonly arrays of `{ name: string; value: number }`
- Sum all modifier values: `modifiers.reduce((sum, m) => sum + m.value, 0)`
- Applied to base TN: `baseTN + totalMod`
- Supports positive (negotiator -2) and negative (clan parts +3) modifiers

#### 3. TN Lookup Tables
- Regular parts and consumables have different TNs for same availability
- Lookup tables imported from `acquisitionTypes.ts`:
  - `REGULAR_PART_TN[AvailabilityRating]`
  - `CONSUMABLE_TN[AvailabilityRating]`

### Test Coverage
- **calculateAcquisitionTN**: 8 tests
  - Base TN for regular/consumable
  - Single and stacked modifiers
  - All 7 availability ratings
- **roll2d6**: 6 tests
  - Range validation (2-12)
  - Deterministic seeded rolls
  - Default Math.random behavior
- **performAcquisitionRoll**: 12 tests
  - Success/failure conditions
  - Margin calculation
  - Modifier application
  - Request ID and metadata preservation

### Design Decisions
1. **Immutable Modifiers**: readonly arrays prevent accidental mutation
2. **Separate Functions**: calculateAcquisitionTN, roll2d6, performAcquisitionRoll each have single responsibility
3. **transitDays = 0**: Placeholder for Task 9.4 (delivery time calculation)
4. **No Campaign/Request Parameters**: Task 9.2 focuses on pure roll mechanics; modifier gathering is Task 9.3

### Next Tasks
- Task 9.3: Planetary Modifier System (uses this calculator)
- Task 9.4: Delivery Time Calculation (fills transitDays)
- Task 9.5: Acquisition Request Processor (orchestrates rolls)

## Task 9.5: Shopping List Queue Management

### Implementation Summary
- **Files Created**: 
  - `src/lib/campaign/acquisition/shoppingList.ts` (95 lines)
  - `src/lib/campaign/acquisition/__tests__/shoppingList.test.ts` (445 lines)
- **Tests**: 32 passing, 100% coverage
- **Approach**: TDD (RED → GREEN → REFACTOR)

### Key Patterns
1. **Immutability**: All functions return new shopping lists, never mutate originals
2. **Filtering**: Status-based queries (pending, in_transit, delivered)
3. **Partial Updates**: updateRequest accepts Partial<IAcquisitionRequest>
4. **Readonly Arrays**: Filter functions return readonly arrays to prevent accidental mutations

### Functions Implemented
- `createShoppingList()` - Empty list factory
- `addRequest(list, request)` - Append request
- `removeRequest(list, requestId)` - Remove by ID
- `updateRequest(list, requestId, updates)` - Partial update
- `findRequest(list, requestId)` - ID lookup
- `getPendingRequests(list)` - Filter by status='pending'
- `getInTransitRequests(list)` - Filter by status='in_transit'
- `getDeliveredRequests(list)` - Filter by status='delivered'

### Test Coverage
- Empty list creation
- Single and multiple request operations
- Immutability verification (original list unchanged)
- Correct filtering by status
- Edge cases (nonexistent IDs, empty lists)
- Complex operation chains
- Readonly array returns

### Design Decisions
1. **No mutation**: Every operation returns a new list (functional style)
2. **Readonly returns**: Filter functions return readonly arrays to prevent accidental mutations
3. **Partial updates**: updateRequest uses Partial<T> for flexible updates
4. **Simple filtering**: Status-based filters are straightforward and composable

### Integration Notes
- Ready for Task 9.6 (Acquisition Day Processor)
- Can be used with getPendingRequests/getInTransitRequests in processor
- Immutable design allows safe concurrent access
- No dependencies on other acquisition modules

### Commit
- Message: `feat(campaign): implement shopping list queue management`
- Files: 2 new files, 531 insertions
- Build: Passed
- Tests: 13965 passed (no regressions)
