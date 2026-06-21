import type { IToHitModifierDetail } from '@/types/gameplay';

export interface ISemiGuidedTagToHitContext {
  readonly isSemiGuided?: boolean;
  readonly targetTagDesignated?: boolean;
  readonly targetEcmProtected?: boolean;
  readonly isIndirectFire?: boolean;
  readonly indirectFirePenalty?: number;
}

function isSemiGuidedTagActive(
  context: ISemiGuidedTagToHitContext | undefined,
): boolean {
  return (
    context?.isSemiGuided === true &&
    context.targetTagDesignated === true &&
    context.targetEcmProtected !== true
  );
}

export function calculateSemiGuidedTagTargetMovementModifier(
  context: ISemiGuidedTagToHitContext | undefined,
  targetMovementModifier: IToHitModifierDetail,
): IToHitModifierDetail | null {
  if (!isSemiGuidedTagActive(context)) return null;
  if (targetMovementModifier.value <= 0) return null;

  return {
    name: 'Semi-guided TAG target movement',
    value: -targetMovementModifier.value,
    source: 'equipment',
    description: `Semi-guided TAG cancels target movement: -${targetMovementModifier.value}`,
  };
}

export function calculateSemiGuidedTagIndirectFireModifier(
  context: ISemiGuidedTagToHitContext | undefined,
): IToHitModifierDetail | null {
  if (!isSemiGuidedTagActive(context)) return null;
  if (context?.isIndirectFire !== true) return null;
  const indirectPenalty = Math.max(0, context.indirectFirePenalty ?? 0);
  if (indirectPenalty <= 0) return null;
  const relief = Math.min(1, indirectPenalty);

  return {
    name: 'Semi-guided TAG indirect fire',
    value: -relief,
    source: 'equipment',
    description: `Semi-guided TAG indirect-fire relief: -${relief}`,
  };
}
