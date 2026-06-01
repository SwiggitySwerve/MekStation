import type { IApplyAttackInput } from '@/engine/InteractiveSession.actions';
import type { ICombatRangeHex, IGameState, IHexGrid } from '@/types/gameplay';

import { deriveCombatRangeHexes } from '@/utils/gameplay/combatProjection';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';

import {
  requireCombatProjection,
  tacticalMapCombatSession,
  tacticalMapSelectedWeapons,
  tacticalMapWeaponsByUnit,
} from './tactical-map.combat-scenarios';
import {
  tacticalMapIndirectFireTargetHex,
  tacticalMapSemiGuidedTagIndirectFireCombatState,
  tacticalMapSemiGuidedTagIndirectFireHexTerrain,
  tacticalMapSemiGuidedTagIndirectFireSelectedWeaponIds,
  tacticalMapSemiGuidedTagIndirectFireTargetId,
  tacticalMapSemiGuidedTagIndirectFireTokens,
} from './tactical-map.indirect-fire-scenario';

export const tacticalMapEcmNullifiedTagIndirectFireTargetId =
  tacticalMapSemiGuidedTagIndirectFireTargetId;
export const tacticalMapEcmNullifiedTagIndirectFireSelectedWeaponIds =
  tacticalMapSemiGuidedTagIndirectFireSelectedWeaponIds;
export const tacticalMapEcmNullifiedTagIndirectFireTokens =
  tacticalMapSemiGuidedTagIndirectFireTokens;
export const tacticalMapEcmNullifiedTagIndirectFireHexTerrain =
  tacticalMapSemiGuidedTagIndirectFireHexTerrain;

export const tacticalMapEcmNullifiedTagIndirectFireCombatState: IGameState = {
  ...tacticalMapSemiGuidedTagIndirectFireCombatState,
  units: {
    attacker: tacticalMapSemiGuidedTagIndirectFireCombatState.units.attacker,
    [tacticalMapEcmNullifiedTagIndirectFireTargetId]: {
      ...tacticalMapSemiGuidedTagIndirectFireCombatState.units[
        tacticalMapEcmNullifiedTagIndirectFireTargetId
      ],
      ecmProtected: true,
    } as IGameState['units'][string] & { readonly ecmProtected: boolean },
  },
};

function tacticalMapEcmNullifiedTagIndirectFireGrid(): IHexGrid {
  const grid = createHexGrid({ radius: 3 });
  const hexes = new Map(grid.hexes);

  for (const terrain of tacticalMapEcmNullifiedTagIndirectFireHexTerrain) {
    const key = coordToKey(terrain.coordinate);
    const hex = hexes.get(key);
    if (!hex) throw new Error(`Missing tactical-map ECM TAG hex ${key}`);
    hexes.set(key, {
      ...hex,
      terrain: terrainStringFromFeatures(terrain.features),
      elevation: terrain.elevation,
    });
  }

  return { ...grid, hexes };
}

const tacticalMapEcmNullifiedTagIndirectFireAttackerToken =
  tacticalMapEcmNullifiedTagIndirectFireTokens.find(
    (token) => token.unitId === 'attacker',
  );
const tacticalMapEcmNullifiedTagIndirectFireProjectionGrid =
  tacticalMapEcmNullifiedTagIndirectFireGrid();

if (!tacticalMapEcmNullifiedTagIndirectFireAttackerToken) {
  throw new Error('Missing tactical-map ECM TAG attacker token');
}

export const tacticalMapEcmNullifiedTagIndirectFireCombatProjection: ICombatRangeHex =
  requireCombatProjection(
    deriveCombatRangeHexes({
      attacker: tacticalMapEcmNullifiedTagIndirectFireAttackerToken,
      targetUnitId: tacticalMapEcmNullifiedTagIndirectFireTargetId,
      hexes: Array.from(
        tacticalMapEcmNullifiedTagIndirectFireProjectionGrid.hexes.values(),
        (hex) => hex.coord,
      ),
      grid: tacticalMapEcmNullifiedTagIndirectFireProjectionGrid,
      tokens: tacticalMapEcmNullifiedTagIndirectFireTokens,
      weapons: tacticalMapSelectedWeapons(
        tacticalMapEcmNullifiedTagIndirectFireSelectedWeaponIds,
      ),
      combatState: tacticalMapEcmNullifiedTagIndirectFireCombatState,
    }).find(
      (projection) =>
        projection.hex.q === tacticalMapIndirectFireTargetHex.q &&
        projection.hex.r === tacticalMapIndirectFireTargetHex.r,
    ),
  );

export function tacticalMapEcmNullifiedTagIndirectFireCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession({
      tokens: tacticalMapEcmNullifiedTagIndirectFireTokens,
      combatState: tacticalMapEcmNullifiedTagIndirectFireCombatState,
    }),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapEcmNullifiedTagIndirectFireTargetId,
    weaponIds: tacticalMapEcmNullifiedTagIndirectFireSelectedWeaponIds,
    grid: tacticalMapEcmNullifiedTagIndirectFireGrid(),
  };
}
