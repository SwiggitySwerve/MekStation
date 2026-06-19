import type {
  CombatLineOfSightBlockerKind,
  ICombatLineOfSightBlocker,
} from '@/types/gameplay';
import type { classifyLOS } from '@/utils/overlays/losClassifier';

import { lineOfSightBlockedDetails } from './combatProjection.targeting';

function blockerKindForLOS(
  los: ReturnType<typeof classifyLOS>,
): CombatLineOfSightBlockerKind {
  if (los.engineResult.blockingElevation !== undefined) return 'elevation';
  if (los.state === 'partial') return 'cover';
  if (los.blockerAnnotations[0]?.terrain || los.engineResult.blockingTerrain) {
    return 'terrain';
  }
  return 'unknown';
}

export function lineOfSightBlockerForLOS(
  los: ReturnType<typeof classifyLOS>,
): ICombatLineOfSightBlocker | undefined {
  const annotation = los.blockerAnnotations[0];
  const hex = annotation?.coord ?? los.engineResult.blockedBy;
  if (!hex) return undefined;

  return {
    hex,
    kind: blockerKindForLOS(los),
    terrain: annotation?.terrain ?? los.engineResult.blockingTerrain,
    reason: annotation?.title ?? lineOfSightBlockedDetails(los),
  };
}

export function lineOfSightBlockerReasonForLOS(
  los: ReturnType<typeof classifyLOS>,
): string | undefined {
  if (los.state !== 'blocked') return undefined;
  return (
    lineOfSightBlockerForLOS(los)?.reason ?? lineOfSightBlockedDetails(los)
  );
}
