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
  tacticalMapIndirectFireCombatState,
  tacticalMapIndirectFireHexTerrain,
  tacticalMapIndirectFireSelectedWeaponIds,
  tacticalMapIndirectFireTargetHex,
  tacticalMapIndirectFireTargetId,
  tacticalMapIndirectFireTokens,
} from './tactical-map.indirect-fire-scenario';

const tacticalMapSpotterSkillSpotterId = 'indirect-spotter';

export const tacticalMapSpotterSkillIndirectFireTargetId =
  tacticalMapIndirectFireTargetId;
export const tacticalMapSpotterSkillIndirectFireSelectedWeaponIds =
  tacticalMapIndirectFireSelectedWeaponIds;
export const tacticalMapSpotterSkillIndirectFireTokens =
  tacticalMapIndirectFireTokens;
export const tacticalMapSpotterSkillIndirectFireHexTerrain =
  tacticalMapIndirectFireHexTerrain;

export const tacticalMapSpotterSkillIndirectFireCombatState: IGameState = {
  ...tacticalMapIndirectFireCombatState,
  units: {
    ...tacticalMapIndirectFireCombatState.units,
    [tacticalMapSpotterSkillSpotterId]: {
      ...tacticalMapIndirectFireCombatState.units[
        tacticalMapSpotterSkillSpotterId
      ],
      gunnery: 6,
    },
  },
};

function tacticalMapSpotterSkillIndirectFireGrid(): IHexGrid {
  const grid = createHexGrid({ radius: 3 });
  const hexes = new Map(grid.hexes);

  for (const terrain of tacticalMapSpotterSkillIndirectFireHexTerrain) {
    const key = coordToKey(terrain.coordinate);
    const hex = hexes.get(key);
    if (!hex) throw new Error(`Missing tactical-map spotter skill hex ${key}`);
    hexes.set(key, {
      ...hex,
      terrain: terrainStringFromFeatures(terrain.features),
      elevation: terrain.elevation,
    });
  }

  return { ...grid, hexes };
}

const tacticalMapSpotterSkillIndirectFireProjectionGrid =
  tacticalMapSpotterSkillIndirectFireGrid();
const tacticalMapSpotterSkillIndirectFireAttackerToken =
  tacticalMapSpotterSkillIndirectFireTokens.find(
    (token) => token.unitId === 'attacker',
  );

if (!tacticalMapSpotterSkillIndirectFireAttackerToken) {
  throw new Error('Missing tactical-map spotter skill attacker token');
}

export const tacticalMapSpotterSkillIndirectFireCombatProjection: ICombatRangeHex =
  requireCombatProjection(
    deriveCombatRangeHexes({
      attacker: tacticalMapSpotterSkillIndirectFireAttackerToken,
      targetUnitId: tacticalMapSpotterSkillIndirectFireTargetId,
      hexes: Array.from(
        tacticalMapSpotterSkillIndirectFireProjectionGrid.hexes.values(),
        (hex) => hex.coord,
      ),
      grid: tacticalMapSpotterSkillIndirectFireProjectionGrid,
      tokens: tacticalMapSpotterSkillIndirectFireTokens,
      weapons: tacticalMapSelectedWeapons(
        tacticalMapSpotterSkillIndirectFireSelectedWeaponIds,
      ),
      combatState: tacticalMapSpotterSkillIndirectFireCombatState,
    }).find(
      (projection) =>
        projection.hex.q === tacticalMapIndirectFireTargetHex.q &&
        projection.hex.r === tacticalMapIndirectFireTargetHex.r,
    ),
  );

export function tacticalMapSpotterSkillIndirectFireCommitInput(): IApplyAttackInput {
  return {
    session: tacticalMapCombatSession({
      tokens: tacticalMapSpotterSkillIndirectFireTokens,
      combatState: tacticalMapSpotterSkillIndirectFireCombatState,
    }),
    weaponsByUnit: tacticalMapWeaponsByUnit(),
    attackerId: 'attacker',
    targetId: tacticalMapSpotterSkillIndirectFireTargetId,
    weaponIds: tacticalMapSpotterSkillIndirectFireSelectedWeaponIds,
    grid: tacticalMapSpotterSkillIndirectFireGrid(),
  };
}
