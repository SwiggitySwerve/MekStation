import { TERRAIN_PROPERTIES, TerrainType } from '@/types/gameplay/TerrainTypes';

import type { ICombatFeatureSupportEntry } from './CombatFeatureSupport';

function integrated(id: string, evidence: string): ICombatFeatureSupportEntry {
  return { id, level: 'integrated', evidence };
}

function helperOnly(
  id: string,
  evidence: string,
  gap: string,
): ICombatFeatureSupportEntry {
  return { id, level: 'helper-only', evidence, gap };
}

export const TERRAIN_TYPE_COMBAT_COVERAGE = Object.values(TerrainType);

export const TERRAIN_TYPES_WITH_PSR_GAPS = [TerrainType.Building] as const;

const terrainTypesWithPsrGaps = new Set<TerrainType>(
  TERRAIN_TYPES_WITH_PSR_GAPS,
);

function makeTerrainMovementEntry(
  terrain: TerrainType,
): ICombatFeatureSupportEntry {
  if (terrain === TerrainType.Water) {
    return integrated(
      terrain,
      'getHexMovementCost rejects walk/run water entry and validateMovement reports impassable terrain before side effects',
    );
  }

  return integrated(
    terrain,
    'getHexMovementCost consumes TERRAIN_PROPERTIES movementCostModifier and validateMovement/pathfinding apply the resulting MP cost',
  );
}

function makeTerrainLosEntry(terrain: TerrainType): ICombatFeatureSupportEntry {
  const properties = TERRAIN_PROPERTIES[terrain];

  if (properties.blocksLOS) {
    return integrated(
      terrain,
      'calculateLOS consumes TERRAIN_PROPERTIES blocksLOS and losBlockHeight for blocking terrain',
    );
  }

  return integrated(
    terrain,
    'calculateLOS consumes TERRAIN_PROPERTIES and records this terrain as non-blocking',
  );
}

function makeTerrainAttackModifierEntry(
  terrain: TerrainType,
): ICombatFeatureSupportEntry {
  const properties = TERRAIN_PROPERTIES[terrain];
  const hasAttackModifier =
    properties.toHitInterveningModifier !== 0 ||
    properties.toHitTargetInModifier !== 0;

  if (!hasAttackModifier) {
    return integrated(
      terrain,
      'TERRAIN_PROPERTIES records no target-in or intervening to-hit modifier for this terrain type',
    );
  }

  return integrated(
    terrain,
    'runAttackPhase consumes TERRAIN_PROPERTIES target-in and intervening to-hit modifiers from target and LOS hexes',
  );
}

function makeTerrainHeatEntry(
  terrain: TerrainType,
): ICombatFeatureSupportEntry {
  const properties = TERRAIN_PROPERTIES[terrain];

  if (properties.heatEffect === 0) {
    return integrated(
      terrain,
      'TERRAIN_PROPERTIES records no heat effect for this terrain type',
    );
  }

  return integrated(
    terrain,
    'runHeatPhase consumes occupied terrain heat/cooling via getGridTerrainHeatEffect',
  );
}

function makeTerrainPsrEntry(terrain: TerrainType): ICombatFeatureSupportEntry {
  if (terrainTypesWithPsrGaps.has(terrain)) {
    return helperOnly(
      terrain,
      'PSRTrigger terrain factories and resolveAllPSRs can represent terrain-entry/skid checks',
      'building-collapse PSRs are not wired into runner movement or damage resolution',
    );
  }

  return integrated(
    terrain,
    'runMovementPhase queues applicable movement terrain PSRs, or no terrain-entry PSR is represented for this TerrainType',
  );
}

function terrainSupportMap(
  makeEntry: (terrain: TerrainType) => ICombatFeatureSupportEntry,
): Record<string, ICombatFeatureSupportEntry> {
  return Object.fromEntries(
    TERRAIN_TYPE_COMBAT_COVERAGE.map((terrain) => [
      terrain,
      makeEntry(terrain),
    ]),
  );
}

export const TERRAIN_TYPE_MOVEMENT_COMBAT_SUPPORT = terrainSupportMap(
  makeTerrainMovementEntry,
);

export const TERRAIN_TYPE_LOS_COMBAT_SUPPORT =
  terrainSupportMap(makeTerrainLosEntry);

export const TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT = terrainSupportMap(
  makeTerrainAttackModifierEntry,
);

export const TERRAIN_TYPE_HEAT_COMBAT_SUPPORT =
  terrainSupportMap(makeTerrainHeatEntry);

export const TERRAIN_TYPE_PSR_COMBAT_SUPPORT =
  terrainSupportMap(makeTerrainPsrEntry);
