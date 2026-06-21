# force-generator Specification

## Purpose

Defines Force Generator requirements for UnitCount Fallback Retry at High BV, preserving the source-of-truth scope introduced by archived change polish-wave-6.2-gaps.

## Requirements
### Requirement: UnitCount Fallback Retry at High BV

The force generator SHALL retry once at `unitCount + 1` when the requested `unitCount` produces a `BudgetUnsatisfiableError` for the requested BV budget. This closes the PT-010 defect where 10k BV with `unitCount = 2` failed because the unit catalog has no 5k-BV pairs.

**Priority**: Low

#### Scenario: Unsatisfiable budget retries with one extra unit

**GIVEN** the caller invokes the force generator with `unitCount: 2, bvBudget: 10000`
**AND** no pair of units in the catalog sums to 10000 BV within tolerance
**WHEN** the generator throws `BudgetUnsatisfiableError`
**THEN** the generator SHALL retry once at `unitCount: 3, bvBudget: 10000`
**AND** the retry SHALL surface a force satisfying the budget (because the catalog has 3-unit combos summing to 10000)

#### Scenario: Opt-out option preserves strict matching

**GIVEN** a caller that needs exact unit-count matching (e.g. a PvP balance test)
**WHEN** they invoke the generator with `{ unitCount: 2, bvBudget: 10000, exactUnitCount: true }`
**THEN** the generator SHALL NOT retry on `BudgetUnsatisfiableError`
**AND** SHALL re-throw the original error to the caller

#### Scenario: PT-010 case succeeds after fix

**GIVEN** the matrix config `10k_default-vs-default_regular_{r12,r20}.json` that previously failed with `BudgetUnsatisfiableError`
**WHEN** the Phase-1 smoke matrix re-runs with the retry logic
**THEN** both configs SHALL produce valid forces and run to completion

