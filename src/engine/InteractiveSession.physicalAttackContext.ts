import type { IPhysicalAttackContext } from '@/utils/gameplay/gameSession';
import type {
  PhysicalAttackLimb,
  PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks';

export function buildJumpJetAttackSessionContext(input: {
  readonly attackType: PhysicalAttackType;
  readonly limb: PhysicalAttackLimb | undefined;
  readonly baseContext: IPhysicalAttackContext;
  readonly elevationDifference: number;
  readonly jumpMP: number;
}): Partial<IPhysicalAttackContext> {
  if (input.attackType !== 'jump-jet-attack') return {};
  if (input.jumpMP <= 0) return {};

  const selectedLeg =
    input.baseContext.jumpJetAttackSelectedLeg ??
    (input.limb === 'leftLeg' ? 'left' : 'right');
  const selectedLeftLeg = selectedLeg === 'left' || selectedLeg === 'both';
  const selectedRightLeg = selectedLeg === 'right' || selectedLeg === 'both';

  return {
    attackerJumpMP: input.baseContext.attackerJumpMP ?? input.jumpMP,
    jumpJetAttackSelectedLeg: selectedLeg,
    standingAttackerHeightAboveTargetHeight:
      input.baseContext.standingAttackerHeightAboveTargetHeight ??
      1 - input.elevationDifference,
    leftReadyJumpJetCount: selectedLeftLeg
      ? (input.baseContext.leftReadyJumpJetCount ?? input.jumpMP)
      : input.baseContext.leftReadyJumpJetCount,
    rightReadyJumpJetCount: selectedRightLeg
      ? (input.baseContext.rightReadyJumpJetCount ?? input.jumpMP)
      : input.baseContext.rightReadyJumpJetCount,
  };
}
