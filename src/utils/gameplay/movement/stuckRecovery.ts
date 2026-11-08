import type {
  IComponentDamageState,
  IHexGrid,
  IPendingPSR,
  IUnitGameState,
} from '@/types/gameplay';
import type { D6Roller } from '@/utils/gameplay/hitLocation';

import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { parseTerrainFeatures } from '@/utils/gameplay/lineOfSight';
import {
  createSwampUnstuckPSR,
  resolvePSR,
  type IPSRResult,
} from '@/utils/gameplay/pilotingSkillRolls';

/**
 * MegaMek 48fcb2f64 TWPhasePreparationManager (L241) runs doTryUnstuck
 * (TWGameManager L31368-L31419) when the movement phase is prepared: every
 * stuck unit rolls to break free before anyone moves. Units that cannot act
 * this phase (MegaMek's base piloting roll is impossible or an automatic
 * failure for them) do not roll and stay stuck.
 */
export function stuckUnitIdsForRecovery(
  units: Readonly<Record<string, IUnitGameState>>,
): readonly string[] {
  return Object.keys(units).filter((unitId) => {
    const unit = units[unitId];
    return unit.isStuck === true && !cannotAttemptRecovery(unit);
  });
}

function cannotAttemptRecovery(unit: IUnitGameState): boolean {
  return (
    unit.destroyed ||
    unit.hasRetreated === true ||
    unit.hasEjected === true ||
    unit.shutdown === true ||
    !unit.pilotConscious
  );
}

/** The recovery PSR for a stuck unit at its current hex. */
export function createStuckRecoveryPSR(
  grid: IHexGrid | undefined,
  unitId: string,
  unit: IUnitGameState,
): IPendingPSR {
  return createSwampUnstuckPSR(unitId, {
    swampDepth: swampLevelAt(grid, unit.position),
  });
}

/** Roll a recovery PSR. Success frees the unit; failure changes nothing. */
export function rollStuckRecoveryPSR(options: {
  readonly unit: IUnitGameState;
  readonly psr: IPendingPSR;
  readonly piloting: number;
  readonly componentDamage: IComponentDamageState;
  readonly d6Roller: D6Roller;
}): IPSRResult {
  const { componentDamage, d6Roller, piloting, psr, unit } = options;
  return resolvePSR(
    piloting,
    psr,
    componentDamage,
    unit.pilotWounds,
    d6Roller,
    {
      unitQuirks: unit.unitQuirks ?? [],
      pilotAbilities: unit.abilities ?? [],
      neuralInterfaceActive: unit.neuralInterfaceActive,
      neuralInterfaceMode: unit.neuralInterfaceMode,
      hasDNICockpitMod: unit.hasDNICockpitMod,
      isQuadMek: unit.isQuad ?? false,
      unitType: unit.unitType,
    },
  );
}

function swampLevelAt(
  grid: IHexGrid | undefined,
  position: IUnitGameState['position'],
): number | undefined {
  const terrain = grid?.hexes.get(coordToKey(position))?.terrain;
  if (!terrain) return undefined;
  const swamp = parseTerrainFeatures(terrain).find(
    (feature) => feature.type === TerrainType.Swamp && feature.level > 0,
  );
  return swamp?.level;
}
