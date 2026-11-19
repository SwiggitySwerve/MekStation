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

/** The one PSRResolved payload arm rule: an automatic failure carries no
 * target number and never passes. Each writer keeps its own field order. */
export function buildPsrResolvedPayload<
  TIdentity extends { readonly unitId: string },
  TDetails extends { readonly passed: boolean },
>(
  target: IPSRResolutionTarget,
  identity: TIdentity,
  details: TDetails,
): TIdentity & TDetails & IPSRResolutionTarget {
  return target.automaticFailure
    ? { ...identity, automaticFailure: true, ...details, passed: false }
    : { ...identity, targetNumber: target.targetNumber, ...details };
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
