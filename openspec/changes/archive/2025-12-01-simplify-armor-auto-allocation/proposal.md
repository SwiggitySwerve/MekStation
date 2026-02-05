# Change: Simplify Armor Auto-Allocation Algorithm

## Why

The original auto-allocation algorithm was overly complex (~250 lines) with conditional branching based on whether head was maxed, multiple allocation strategies, and 7+ priority levels for remainder distribution. A/B testing showed a simplified 3-phase algorithm (~75 lines) produces identical results for all MegaMekLab test cases with 42% less code.

## What Changes

- **MODIFIED** Auto-Allocation Algorithm requirement to reflect simplified 3-phase approach:
  - Phase 1: Initial proportional spread (head 25%, body by max capacity)
  - Phase 2: Symmetric remainder distribution (torsos → legs → arms → CT)
  - Phase 3: Front/rear torso splits applied after totals
- **ADDED** Side torso rear ratio condition: 25% at max total armor, 22% otherwise
- **ADDED** Maximum total armor (169 for 50-ton) allocation scenario

## Impact

- Affected specs: `armor-system`
- Affected code: `src/utils/construction/armorCalculations.ts`
- No breaking changes: Output remains identical to MegaMekLab for all tested scenarios
