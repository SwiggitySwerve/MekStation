import type { IUnitGameState } from '@/types/gameplay';

/**
 * MegaMek 48fcb2f64 Entity.setProne (L2438-L2442): falling prone clears
 * hull-down. Facing, damage, and pending PSRs belong to the fall resolver.
 * @spec openspec/changes/fix-c6a-psr-and-fall-posture/specs/piloting-skill-rolls/spec.md
 */
export function applyFallPosture(unit: IUnitGameState): IUnitGameState {
  return { ...unit, prone: true, hullDown: false };
}
