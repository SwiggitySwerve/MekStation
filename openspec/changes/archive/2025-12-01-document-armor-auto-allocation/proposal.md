# Change: Document Armor Auto-Allocation Algorithm

## Why

The armor auto-allocation algorithm was implemented to match MegaMekLab's distribution pattern but lacks specification documentation. This change adds formal requirements and scenarios to the armor-system spec.

## What Changes

- Add Auto-Allocation requirement with distribution weights
- Add scenarios for 32-point and 80-point allocations
- Document symmetry enforcement rules
- Document remainder distribution rules

## Impact

- Affected specs: armor-system
- Affected code: `src/utils/construction/armorCalculations.ts` (already implemented)
