/**
 * BattleTech terrain property catalog.
 */

import type { ITerrainProperties } from './TerrainTypeDefinitions';

import { CoverLevel, TerrainType } from './TerrainTypeDefinitions';

export const TERRAIN_PROPERTIES: Readonly<
  Record<TerrainType, ITerrainProperties>
> = {
  [TerrainType.Clear]: {
    movementCostModifier: {
      walk: 0,
      run: 0,
      jump: 0,
      tracked: 0,
      wheeled: 0,
      hover: 0,
      vtol: 0,
    },
    toHitInterveningModifier: 0,
    toHitTargetInModifier: 0,
    heatEffect: 0,
    coverLevel: CoverLevel.None,
    blocksLOS: false,
    losBlockHeight: 0,
    requiresPSR: false,
    specialRules: [],
  },

  [TerrainType.Pavement]: {
    movementCostModifier: {
      walk: 0,
      run: 0,
      jump: 0,
      tracked: 0,
      wheeled: 0,
      hover: 0,
      vtol: 0,
    },
    toHitInterveningModifier: 0,
    toHitTargetInModifier: 0,
    heatEffect: 0,
    coverLevel: CoverLevel.None,
    blocksLOS: false,
    losBlockHeight: 0,
    requiresPSR: false,
    specialRules: [],
  },

  [TerrainType.Road]: {
    movementCostModifier: {
      walk: 0,
      run: 0,
      jump: 0,
      tracked: 0,
      wheeled: 0,
      hover: 0,
      vtol: 0,
    },
    toHitInterveningModifier: 0,
    toHitTargetInModifier: 0,
    heatEffect: 0,
    coverLevel: CoverLevel.None,
    blocksLOS: false,
    losBlockHeight: 0,
    requiresPSR: false,
    specialRules: [],
  },

  [TerrainType.LightWoods]: {
    movementCostModifier: {
      walk: 1,
      run: 1,
      jump: 1,
      tracked: 1,
      wheeled: 1,
      hover: 1,
      vtol: 0,
    },
    toHitInterveningModifier: 1,
    toHitTargetInModifier: 1,
    heatEffect: 0,
    coverLevel: CoverLevel.Partial,
    blocksLOS: false,
    losBlockHeight: 2,
    requiresPSR: false,
    specialRules: [],
  },

  [TerrainType.HeavyWoods]: {
    movementCostModifier: {
      walk: 2,
      run: 2,
      jump: 2,
      tracked: 2,
      wheeled: 2,
      hover: 2,
      vtol: 0,
    },
    toHitInterveningModifier: 2,
    toHitTargetInModifier: 2,
    heatEffect: 0,
    coverLevel: CoverLevel.Full,
    blocksLOS: true,
    losBlockHeight: 2,
    requiresPSR: false,
    specialRules: [],
  },

  [TerrainType.HeavyIndustrial]: {
    // MegaMek industrial terrain costs +1 MP for biped/quad units only.
    movementCostModifier: {
      walk: 1,
      run: 1,
      jump: 1,
      tracked: 0,
      wheeled: 0,
      hover: 0,
      vtol: 0,
    },
    toHitInterveningModifier: 1,
    toHitTargetInModifier: 1,
    heatEffect: 0,
    coverLevel: CoverLevel.None,
    blocksLOS: false,
    losBlockHeight: 1,
    requiresPSR: false,
    specialRules: ['tacops-los-density'],
  },

  [TerrainType.PlantedField]: {
    movementCostModifier: {
      walk: 0,
      run: 0,
      jump: 0,
      tracked: 0,
      wheeled: 0,
      hover: 0,
      vtol: 0,
    },
    toHitInterveningModifier: 0,
    toHitTargetInModifier: 1,
    heatEffect: 0,
    coverLevel: CoverLevel.None,
    blocksLOS: false,
    losBlockHeight: 1,
    requiresPSR: false,
    specialRules: ['tacops-los-density'],
  },

  [TerrainType.Rough]: {
    movementCostModifier: {
      walk: 1,
      run: 1,
      jump: 1,
      tracked: 1,
      wheeled: 1,
      hover: 1,
      vtol: 0,
    },
    toHitInterveningModifier: 0,
    toHitTargetInModifier: 0,
    heatEffect: 0,
    coverLevel: CoverLevel.None,
    blocksLOS: false,
    losBlockHeight: 0,
    requiresPSR: false,
    specialRules: [],
  },

  [TerrainType.Rubble]: {
    movementCostModifier: {
      walk: 1,
      run: 1,
      jump: 1,
      tracked: 1,
      wheeled: 1,
      hover: 1,
      vtol: 0,
    },
    toHitInterveningModifier: 0,
    toHitTargetInModifier: 0,
    heatEffect: 0,
    coverLevel: CoverLevel.None,
    blocksLOS: false,
    losBlockHeight: 0,
    requiresPSR: false,
    specialRules: [],
  },

  [TerrainType.Water]: {
    movementCostModifier: {
      walk: 1,
      run: 1,
      jump: 1,
      tracked: 1,
      wheeled: 1,
      hover: 0,
      vtol: 0,
    },
    toHitInterveningModifier: 0,
    toHitTargetInModifier: -1,
    heatEffect: -2,
    coverLevel: CoverLevel.Partial,
    blocksLOS: false,
    losBlockHeight: 0,
    requiresPSR: false,
    specialRules: ['depth-dependent'],
  },

  [TerrainType.Sand]: {
    // Audit 2026-06-09 C-3: MegaMek Terrain.movementCost SAND charges +1 only
    // to non-dune-buggy wheeled vehicles (and foot-bound infantry); meks,
    // tracked, and hover pay nothing.
    movementCostModifier: {
      walk: 0,
      run: 0,
      jump: 0,
      tracked: 0,
      wheeled: 1,
      hover: 0,
      vtol: 0,
    },
    toHitInterveningModifier: 0,
    toHitTargetInModifier: 0,
    heatEffect: 0,
    coverLevel: CoverLevel.None,
    blocksLOS: false,
    losBlockHeight: 0,
    requiresPSR: false,
    specialRules: [],
  },

  [TerrainType.Mud]: {
    // Audit 2026-06-09 C-3: MegaMek Terrain.movementCost MUD exempts
    // hover/WiGE/naval (unlisted motives default to 0 via the cost accessor).
    movementCostModifier: {
      walk: 1,
      run: 1,
      jump: 1,
      tracked: 1,
      wheeled: 1,
      hover: 0,
      vtol: 0,
    },
    toHitInterveningModifier: 0,
    toHitTargetInModifier: 0,
    heatEffect: 0,
    coverLevel: CoverLevel.None,
    blocksLOS: false,
    losBlockHeight: 0,
    requiresPSR: false,
    specialRules: [],
  },

  [TerrainType.Snow]: {
    // Audit 2026-06-09 C-3: MegaMek Terrain.movementCost SNOW level 1 charges
    // wheeled vehicles (and foot-bound infantry) only; level-2 deep snow is
    // handled by getTerrainFeatureMovementCostModifier.
    movementCostModifier: {
      walk: 0,
      run: 0,
      jump: 0,
      tracked: 0,
      wheeled: 1,
      hover: 0,
      vtol: 0,
    },
    toHitInterveningModifier: 0,
    toHitTargetInModifier: 0,
    heatEffect: 0,
    coverLevel: CoverLevel.None,
    blocksLOS: false,
    losBlockHeight: 0,
    requiresPSR: false,
    specialRules: ['depth-dependent'],
  },

  [TerrainType.Ice]: {
    // Audit 2026-06-09 C-3: MegaMek Terrain.movementCost ICE charges 1 to
    // every motive except hover/WiGE (airborne VTOL never pays ground
    // terrain).
    movementCostModifier: {
      walk: 1,
      run: 1,
      jump: 1,
      tracked: 1,
      wheeled: 1,
      hover: 0,
      vtol: 0,
    },
    toHitInterveningModifier: 0,
    toHitTargetInModifier: 0,
    heatEffect: 0,
    coverLevel: CoverLevel.None,
    blocksLOS: false,
    losBlockHeight: 0,
    requiresPSR: false,
    specialRules: [],
  },

  [TerrainType.Swamp]: {
    // Audit 2026-06-09 C-3: MegaMek Terrain.movementCost SWAMP base 2 drops
    // to 1 for biped/quad meks and 0 for hover/WiGE; tracked/wheeled pay the
    // full 2.
    movementCostModifier: {
      walk: 1,
      run: 1,
      jump: 1,
      tracked: 2,
      wheeled: 2,
      hover: 0,
      vtol: 0,
    },
    toHitInterveningModifier: 0,
    toHitTargetInModifier: 1,
    heatEffect: 0,
    // Audit 2026-06-09 C-7: swamp grants no cover — MegaMek LosEffects has no
    // swamp partial-cover source.
    coverLevel: CoverLevel.None,
    blocksLOS: false,
    losBlockHeight: 0,
    requiresPSR: false,
    specialRules: [],
  },

  [TerrainType.Building]: {
    movementCostModifier: {
      walk: 1,
      run: 1,
      jump: 1,
      tracked: 1,
      wheeled: 1,
      hover: 1,
      vtol: 0,
    },
    toHitInterveningModifier: 1,
    toHitTargetInModifier: 1,
    heatEffect: 0,
    coverLevel: CoverLevel.Partial,
    blocksLOS: true,
    losBlockHeight: 1,
    requiresPSR: false,
    specialRules: ['construction-factor-dependent'],
  },

  [TerrainType.Bridge]: {
    movementCostModifier: {
      walk: 0,
      run: 0,
      jump: 0,
      tracked: 0,
      wheeled: 0,
      hover: 0,
      vtol: 0,
    },
    toHitInterveningModifier: 0,
    toHitTargetInModifier: 0,
    heatEffect: 0,
    coverLevel: CoverLevel.None,
    blocksLOS: false,
    losBlockHeight: 0,
    requiresPSR: false,
    specialRules: [],
  },

  [TerrainType.Mines]: {
    movementCostModifier: {
      walk: 0,
      run: 0,
      jump: 0,
      tracked: 0,
      wheeled: 0,
      hover: 0,
      vtol: 0,
    },
    toHitInterveningModifier: 0,
    toHitTargetInModifier: 0,
    heatEffect: 0,
    coverLevel: CoverLevel.None,
    blocksLOS: false,
    losBlockHeight: 0,
    requiresPSR: false,
    specialRules: ['represented-minefield-entry-damage'],
  },

  [TerrainType.Fire]: {
    movementCostModifier: {
      walk: 0,
      run: 0,
      jump: 0,
      tracked: 0,
      wheeled: 0,
      hover: 0,
      vtol: 0,
    },
    toHitInterveningModifier: 0,
    toHitTargetInModifier: 0,
    heatEffect: 5,
    coverLevel: CoverLevel.None,
    blocksLOS: false,
    losBlockHeight: 0,
    requiresPSR: false,
    specialRules: ['heat-damage'],
  },

  [TerrainType.Smoke]: {
    movementCostModifier: {
      walk: 0,
      run: 0,
      jump: 0,
      tracked: 0,
      wheeled: 0,
      hover: 0,
      vtol: 0,
    },
    toHitInterveningModifier: 1,
    toHitTargetInModifier: 1,
    heatEffect: 0,
    coverLevel: CoverLevel.Partial,
    blocksLOS: false,
    losBlockHeight: 0,
    requiresPSR: false,
    specialRules: ['density-dependent'],
  },
};
