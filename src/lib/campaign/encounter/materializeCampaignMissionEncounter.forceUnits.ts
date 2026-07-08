import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';

import { WIZARD_REPRESENTATIVE_UNITS } from '@/lib/campaign/wizard/representativeUnits';

export interface AssignedForceUnit {
  readonly unitRef: string;
  readonly pilotRef?: string;
}

export function rosterUnitsToForceUnits(
  rosterUnits: readonly IRosterUnitProjection[],
): readonly AssignedForceUnit[] {
  return rosterUnits.map((unit) => {
    if (!unit.unitRef) {
      throw new Error(
        `Roster unit ${unit.unitName} has no canonical unitRef; cannot launch.`,
      );
    }
    return {
      unitRef: unit.unitRef,
      pilotRef: unit.pilotId,
    };
  });
}

function stableStringHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function selectOpponentUnits({
  count,
  seed,
}: {
  readonly count: number;
  readonly seed: string;
}): readonly AssignedForceUnit[] {
  const representativeUnitCount = WIZARD_REPRESENTATIVE_UNITS.length;
  if (representativeUnitCount === 0) {
    throw new Error('No representative units are available for OpFor creation');
  }

  const offset = stableStringHash(seed) % representativeUnitCount;
  return Array.from({ length: count }, (_, index) => {
    const representativeUnit =
      WIZARD_REPRESENTATIVE_UNITS[(offset + index) % representativeUnitCount];
    if (!representativeUnit) {
      throw new Error('Representative OpFor unit selection failed');
    }
    return { unitRef: representativeUnit.unitRef };
  });
}
