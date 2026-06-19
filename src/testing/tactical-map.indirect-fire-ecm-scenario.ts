import type { IApplyAttackInput } from '@/engine/InteractiveSession.actions';
import type { ICombatRangeHex, IGameState, IHexGrid } from '@/types/gameplay';

import { deriveCombatRangeHexes } from '@/utils/gameplay/combatProjection';

import {
  requireCombatProjection,
  tacticalMapCombatSession,
  tacticalMapSelectedWeapons,
  tacticalMapWeaponsByUnit,
} from './tactical-map.combat-scenarios';
import { createTacticalMapTerrainGrid } from './tactical-map.fixture-helpers';
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
  return createTacticalMapTerrainGrid(
    tacticalMapEcmNullifiedTagIndirectFireHexTerrain,
    {
      missingHexLabel: 'tactical-map ECM TAG',
    },
  );
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
