import type {
  ITargetStatusFlags,
  IWeaponEquipmentFlags,
} from './specialWeaponMechanics';

import {
  isSemiGuidedLRM,
  isTargetTAGDesignated,
} from './specialWeaponMechanics';

/** Semi-guided LRM resolution context */
export interface ISemiGuidedContext {
  /** Weapon ID */
  readonly weaponId: string;
  /** Weapon equipment flags */
  readonly equipment: IWeaponEquipmentFlags;
  /** Target status flags (TAG designation, ECM) */
  readonly targetStatus: ITargetStatusFlags;
}

/** Semi-guided LRM resolution result */
export interface ISemiGuidedResult {
  /** Whether semi-guided mode is active */
  readonly isSemiGuided: boolean;
  /** Whether TAG is active on target */
  readonly tagActive: boolean;
  /** Whether to use standard to-hit (TAG active) vs normal LRM */
  readonly useStandardToHit: boolean;
  /** Description of resolution mode */
  readonly description: string;
}

export const ECM_NULLIFIED_TAG_INDIRECT_FIRE_BLOCKED_REASON =
  'TAG designation is nullified by ECM; semi-guided indirect fire is unavailable';

function isSemiGuidedContext(context: ISemiGuidedContext): boolean {
  return (
    isSemiGuidedLRM(context.weaponId) || context.equipment.isSemiGuided === true
  );
}

export function semiGuidedTagIndirectFireBlockedReason(
  context: ISemiGuidedContext,
): string | undefined {
  if (!isSemiGuidedContext(context)) return undefined;
  if (
    context.targetStatus.tagDesignated === true &&
    context.targetStatus.ecmProtected === true
  ) {
    return ECM_NULLIFIED_TAG_INDIRECT_FIRE_BLOCKED_REASON;
  }
  return undefined;
}

/**
 * Resolve semi-guided LRM behavior.
 *
 * Semi-guided LRMs against TAG-designated targets:
 * - Use standard to-hit (no indirect fire penalty when TAG active)
 * - TAG must be active on the target (not nullified by ECM)
 *
 * Without TAG designation, semi-guided LRMs fire as standard LRMs.
 */
export function resolveSemiGuidedLRM(
  context: ISemiGuidedContext,
): ISemiGuidedResult {
  if (!isSemiGuidedContext(context)) {
    return {
      isSemiGuided: false,
      tagActive: false,
      useStandardToHit: false,
      description: 'Not a semi-guided LRM',
    };
  }

  const blockedReason = semiGuidedTagIndirectFireBlockedReason(context);
  if (blockedReason) {
    return {
      isSemiGuided: true,
      tagActive: false,
      useStandardToHit: false,
      description: blockedReason,
    };
  }

  const tagActive = isTargetTAGDesignated(context.targetStatus);

  if (tagActive) {
    return {
      isSemiGuided: true,
      tagActive: true,
      useStandardToHit: true,
      description:
        'Semi-guided LRM with active TAG: standard to-hit (no indirect penalty)',
    };
  }

  return {
    isSemiGuided: true,
    tagActive: false,
    useStandardToHit: false,
    description:
      'Semi-guided LRM without TAG: fires as standard LRM with normal modifiers',
  };
}
