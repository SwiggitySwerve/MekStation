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

// Audit C-5: this scenario formerly pinned a spotter-gunnery (gunnery 6 ->
// +1) indirect-fire modifier — an artillery-only rule misapplied to LRMs.
// It now exercises the corrected +1 spotter-attacking modifier (MegaMek
// ComputeToHit.java L1540-1544): the spotter has already fired a weapon this
// turn, so the composed indirect penalty stays at +2 (base +1, attacked +1).
export const tacticalMapSpotterSkillIndirectFireCombatState: IGameState = {
  ...tacticalMapIndirectFireCombatState,
  units: {
    ...tacticalMapIndirectFireCombatState.units,
    [tacticalMapSpotterSkillSpotterId]: {
      ...tacticalMapIndirectFireCombatState.units[
        tacticalMapSpotterSkillSpotterId
      ],
      weaponsFiredThisTurn: ['spotter-medium-laser'],
    },
  },
};

function tacticalMapSpotterSkillIndirectFireGrid(): IHexGrid {
  return createTacticalMapTerrainGrid(
    tacticalMapSpotterSkillIndirectFireHexTerrain,
    {
      missingHexLabel: 'tactical-map spotter skill',
    },
  );
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
