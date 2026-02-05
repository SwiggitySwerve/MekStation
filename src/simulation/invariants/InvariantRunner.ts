/**
 * Invariant Runner
 * Orchestrates running all registered invariants and collecting violations.
 */

import { IGameState } from '@/types/gameplay';

import { IInvariant, IViolation, ViolationSeverity } from './types';

export class InvariantRunner {
  private invariants: IInvariant[] = [];

  register(invariant: IInvariant): void {
    this.invariants.push(invariant);
  }

  runAll(state: IGameState): readonly IViolation[] {
    const violations: IViolation[] = [];

    for (const invariant of this.invariants) {
      const result = invariant.check(state);
      violations.push(...result);
    }

    return violations;
  }

  filterBySeverity(
    violations: readonly IViolation[],
    severity: ViolationSeverity,
  ): readonly IViolation[] {
    return violations.filter((v) => v.severity === severity);
  }
}
