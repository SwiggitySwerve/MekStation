import type { IPSRResolutionTarget } from '@/types/gameplay/GameSessionAttackEvents';
import type { IPSRTriggerTarget } from '@/types/gameplay/GameSessionStateTypes';

/** Event projection of the pending rule, without an impossible numeric target. */
export function projectPsrTriggerTarget(
  psr: IPSRTriggerTarget,
): IPSRTriggerTarget {
  return psr.automaticFailure
    ? { automaticFailure: true }
    : psr.fixedTargetNumber !== undefined
      ? { fixedTargetNumber: psr.fixedTargetNumber }
      : {};
}

/** Keep finite target behavior and explicitly encode an impossible resolution. */
export function projectPsrResolutionTarget(result: {
  readonly targetNumber: number;
  readonly passed: boolean;
}): IPSRResolutionTarget & { readonly passed: boolean } {
  return result.targetNumber === Infinity
    ? { automaticFailure: true, passed: false }
    : { targetNumber: result.targetNumber, passed: result.passed };
}
