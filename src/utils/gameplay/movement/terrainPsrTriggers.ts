import {
  MovementType,
  PSRTrigger,
  type IHexCoordinate,
  type IHexGrid,
  type IPendingPSR,
  type MovementMotiveMode,
} from '@/types/gameplay';
import {
  TerrainType,
  type ITerrainFeature,
} from '@/types/gameplay/TerrainTypes';
import { coordToKey } from '@/utils/gameplay/hexMath';
import { parseTerrainFeatures } from '@/utils/gameplay/lineOfSight';
import {
  createBuildingCollapsePSR,
  createEnteringWaterPSR,
  createExitingWaterPSR,
  createIcePSR,
  createRubblePSR,
  createRunningRoughTerrainPSR,
  createSkiddingPSR,
  createSwampBogDownPSR,
} from '@/utils/gameplay/pilotingSkillRolls';

import { movementModeForPath } from './mode';

export type TerrainBearingMovementStep = {
  readonly kind: string;
  readonly index: number;
  readonly at?: IHexCoordinate;
  readonly from?: IHexCoordinate;
  readonly to?: IHexCoordinate;
  readonly terrainEntered?: string;
};

/** The unit facts the terrain triggers read, captured before the move. */
export interface ITerrainPsrMover {
  readonly unitType?: string;
  readonly tonnage?: number;
  readonly isStuck?: boolean;
  readonly prone?: boolean;
}

/**
 * One effect of moving through terrain, in step order. A `psr` is queued for
 * later resolution; `stuck` marks a BattleMech that jumped into bog-down
 * terrain, which sticks without a roll.
 */
export type MovementTerrainEffect =
  | { readonly kind: 'psr'; readonly psr: IPendingPSR }
  | {
      readonly kind: 'stuck';
      readonly reason: string;
      readonly reasonCode: PSRTrigger.SwampBogDown;
    };

export const JUMPED_INTO_BOG_DOWN_REASON = 'Jumped into bog-down terrain';

type TerrainPsrContext = {
  readonly grid: IHexGrid;
  readonly movementType: MovementType;
  readonly step: TerrainBearingMovementStep;
  readonly steps: readonly TerrainBearingMovementStep[];
  readonly unitId: string;
  readonly unitTonnage?: number;
  readonly unitType?: string;
  readonly canFall: boolean;
  readonly movementMode?: MovementMotiveMode;
  readonly enteredFeatures: readonly ITerrainFeature[];
  readonly fromFeatures: readonly ITerrainFeature[];
};

const movementBeforeSkidModifiers: readonly {
  readonly minimumExclusiveDistance: number;
  readonly modifier: number;
}[] = [
  { minimumExclusiveDistance: 24, modifier: 6 },
  { minimumExclusiveDistance: 17, modifier: 5 },
  { minimumExclusiveDistance: 10, modifier: 4 },
  { minimumExclusiveDistance: 7, modifier: 2 },
  { minimumExclusiveDistance: 4, modifier: 1 },
  { minimumExclusiveDistance: 2, modifier: 0 },
];

/**
 * Motive modes that never roll for entering water: MegaMek 48fcb2f64
 * `Entity.checkWaterMove` (L9615-L9641) skips hover, VTOL, naval, hydrofoil,
 * submarine, UMU, biped/quad swim and WiGE movement.
 */
const WATER_ENTRY_EXEMPT_MODES: ReadonlySet<MovementMotiveMode> = new Set([
  'hover',
  'vtol',
  'naval',
  'hydrofoil',
  'submarine',
  'umu',
  'biped_swim',
  'quad_swim',
  'wige',
]);

/**
 * The single producer of movement terrain PSRs. Both the standalone runner and
 * the interactive session apply these effects; neither re-derives them.
 */
export function planMovementTerrainEffects(options: {
  readonly grid: IHexGrid;
  readonly unitId: string;
  readonly unit: ITerrainPsrMover | undefined;
  readonly movementType: MovementType;
  readonly movementMode?: MovementMotiveMode;
  readonly steps: readonly TerrainBearingMovementStep[];
}): readonly MovementTerrainEffect[] {
  const { grid, movementMode, movementType, steps, unit, unitId } = options;
  const unitCanFall = canFall(unit);
  const effects: MovementTerrainEffect[] = [];
  let stuck = unit?.isStuck === true;

  for (const step of steps) {
    if (
      step.kind !== 'forward' &&
      step.kind !== 'jump' &&
      step.kind !== 'turn'
    ) {
      continue;
    }

    if (
      unit &&
      !stuck &&
      isJumpIntoSwampBogDown({
        grid,
        movementType,
        step,
        unitType: unit.unitType,
      })
    ) {
      stuck = true;
      effects.push({
        kind: 'stuck',
        reason: JUMPED_INTO_BOG_DOWN_REASON,
        reasonCode: PSRTrigger.SwampBogDown,
      });
      continue;
    }

    for (const psr of terrainPSRsForStep({
      grid,
      movementType,
      step,
      steps,
      unitId,
      unitTonnage: unit?.tonnage,
      unitType: unit?.unitType,
      canFall: unitCanFall,
      movementMode,
    })) {
      effects.push({ kind: 'psr', psr });
    }
  }

  return effects;
}

function terrainPSRsForStep(options: {
  readonly grid: IHexGrid;
  readonly movementType: MovementType;
  readonly step: TerrainBearingMovementStep;
  readonly steps: readonly TerrainBearingMovementStep[];
  readonly unitId: string;
  readonly unitTonnage?: number;
  readonly unitType?: string;
  readonly canFall: boolean;
  readonly movementMode?: MovementMotiveMode;
}): readonly IPendingPSR[] {
  const context = terrainPsrContext(options);
  return [
    ...waterTransitionPSRs(context),
    ...enteredTerrainPSRs(context),
    ...swampBogDownPSRs(context),
    ...buildingCollapsePSRs(context),
    ...skiddingPSRs(context),
  ];
}

function terrainPsrContext(options: {
  readonly grid: IHexGrid;
  readonly movementType: MovementType;
  readonly step: TerrainBearingMovementStep;
  readonly steps: readonly TerrainBearingMovementStep[];
  readonly unitId: string;
  readonly unitTonnage?: number;
  readonly unitType?: string;
  readonly canFall: boolean;
  readonly movementMode?: MovementMotiveMode;
}): TerrainPsrContext {
  const { grid, step } = options;
  return {
    ...options,
    enteredFeatures: terrainFeaturesFromTag(
      step.terrainEntered ?? terrainAt(grid, step.to),
    ),
    fromFeatures: terrainFeaturesFromTag(terrainAt(grid, step.from)),
  };
}

function waterTransitionPSRs(
  context: TerrainPsrContext,
): readonly IPendingPSR[] {
  const { canFall, enteredFeatures, fromFeatures, movementMode, step, unitId } =
    context;
  const psrs: IPendingPSR[] = [];
  if (!canFall) return psrs;

  if (
    hasTerrainFeature(fromFeatures, TerrainType.Water) &&
    !hasTerrainFeature(enteredFeatures, TerrainType.Water)
  ) {
    psrs.push(createExitingWaterPSR(unitId, step.index));
  }

  if (
    hasTerrainFeature(enteredFeatures, TerrainType.Water) &&
    !hasTerrainFeature(fromFeatures, TerrainType.Water) &&
    !(movementMode !== undefined && WATER_ENTRY_EXEMPT_MODES.has(movementMode))
  ) {
    psrs.push(
      createEnteringWaterPSR(unitId, step.index, {
        waterDepth: waterDepthFromFeatures(enteredFeatures),
      }),
    );
  }

  return psrs;
}

function enteredTerrainPSRs(
  context: TerrainPsrContext,
): readonly IPendingPSR[] {
  const { canFall, enteredFeatures, movementType, step, unitId } = context;
  const psrs: IPendingPSR[] = [];

  if (canFall && hasTerrainFeature(enteredFeatures, TerrainType.Rubble)) {
    psrs.push(createRubblePSR(unitId, step.index));
  }

  if (
    hasTerrainFeature(enteredFeatures, TerrainType.Rough) &&
    movementModeForPath(movementType) === 'run'
  ) {
    psrs.push(createRunningRoughTerrainPSR(unitId, step.index));
  }

  if (canFall && hasTerrainFeature(enteredFeatures, TerrainType.Ice)) {
    psrs.push(createIcePSR(unitId, step.index));
  }

  return psrs;
}

function swampBogDownPSRs(context: TerrainPsrContext): readonly IPendingPSR[] {
  const { enteredFeatures, step, unitId } = context;
  if (!shouldQueueSwampBogDownPSR(context)) return [];

  return [
    createSwampBogDownPSR(unitId, step.index, {
      swampDepth: terrainLevelFromFeatures(enteredFeatures, TerrainType.Swamp),
    }),
  ];
}

function shouldQueueSwampBogDownPSR(context: TerrainPsrContext): boolean {
  const { enteredFeatures, fromFeatures, movementType, step, unitType } =
    context;
  return (
    step.kind !== 'turn' &&
    movementType !== MovementType.Jump &&
    isBattleMechLikeUnitType(unitType) &&
    hasTerrainFeature(enteredFeatures, TerrainType.Swamp) &&
    !hasTerrainFeature(fromFeatures, TerrainType.Swamp) &&
    !hasTerrainFeature(enteredFeatures, TerrainType.Pavement)
  );
}

function buildingCollapsePSRs(
  context: TerrainPsrContext,
): readonly IPendingPSR[] {
  const { enteredFeatures, step, unitId, unitTonnage, unitType } = context;
  if (step.kind === 'turn') return [];
  if (!isBattleMechLikeUnitType(unitType)) return [];
  if (!hasOverloadedBuildingFeature(enteredFeatures, unitTonnage)) return [];

  return [createBuildingCollapsePSR(unitId, step.index)];
}

function skiddingPSRs(context: TerrainPsrContext): readonly IPendingPSR[] {
  const { canFall, grid, movementType, step, steps, unitId } = context;
  if (!canFall) return [];
  if (step.kind !== 'turn') return [];
  if (movementModeForPath(movementType) !== 'run') return [];
  if (!isSkidTerrain(terrainFeaturesFromTag(terrainAt(grid, step.at)))) {
    return [];
  }

  return [
    createSkiddingPSR(
      unitId,
      step.index,
      calculateMovementBeforeSkidModifier(
        countHexesMovedBeforeStep(steps, step.index),
      ),
    ),
  ];
}

function isJumpIntoSwampBogDown(options: {
  readonly grid: IHexGrid;
  readonly movementType: MovementType;
  readonly step: TerrainBearingMovementStep;
  readonly unitType?: string;
}): boolean {
  const { grid, movementType, step, unitType } = options;
  if (movementType !== MovementType.Jump || step.kind !== 'jump') return false;
  if (!isBattleMechLikeUnitType(unitType)) return false;

  const enteredFeatures = terrainFeaturesFromTag(
    step.terrainEntered ?? terrainAt(grid, step.to),
  );
  const fromFeatures = terrainFeaturesFromTag(terrainAt(grid, step.from));
  return (
    hasTerrainFeature(enteredFeatures, TerrainType.Swamp) &&
    !hasTerrainFeature(fromFeatures, TerrainType.Swamp) &&
    !hasTerrainFeature(enteredFeatures, TerrainType.Pavement)
  );
}

function countHexesMovedBeforeStep(
  steps: readonly TerrainBearingMovementStep[],
  stepIndex: number,
): number {
  return steps.filter(
    (candidate) =>
      candidate.index < stepIndex &&
      (candidate.kind === 'forward' || candidate.kind === 'jump'),
  ).length;
}

function calculateMovementBeforeSkidModifier(distance: number): number {
  return (
    movementBeforeSkidModifiers.find(
      (entry) => distance > entry.minimumExclusiveDistance,
    )?.modifier ?? -1
  );
}

function terrainAt(
  grid: IHexGrid,
  coord: IHexCoordinate | undefined,
): string | undefined {
  if (!coord) return undefined;
  return grid.hexes.get(coordToKey(coord))?.terrain;
}

function terrainFeaturesFromTag(
  tag: string | undefined,
): readonly ITerrainFeature[] {
  if (!tag) return [];
  return parseTerrainFeatures(tag);
}

function hasTerrainFeature(
  terrainFeatures: readonly ITerrainFeature[],
  terrainType: TerrainType,
): boolean {
  return terrainFeatures.some(
    (feature) => feature.type === terrainType && feature.level > 0,
  );
}

function waterDepthFromFeatures(
  terrainFeatures: readonly ITerrainFeature[],
): number | undefined {
  const water = terrainFeatures.find(
    (feature) => feature.type === TerrainType.Water,
  );
  if (!water) return undefined;
  return Math.max(1, water.level);
}

function terrainLevelFromFeatures(
  terrainFeatures: readonly ITerrainFeature[],
  terrainType: TerrainType,
): number | undefined {
  const feature = terrainFeatures.find((entry) => entry.type === terrainType);
  if (!feature) return undefined;
  return Math.max(1, feature.level);
}

function hasOverloadedBuildingFeature(
  terrainFeatures: readonly ITerrainFeature[],
  unitTonnage: number | undefined,
): boolean {
  if (unitTonnage === undefined || !Number.isFinite(unitTonnage)) return false;

  const building = terrainFeatures.find(
    (feature) =>
      feature.type === TerrainType.Building &&
      feature.level > 0 &&
      feature.constructionFactor !== undefined &&
      Number.isFinite(feature.constructionFactor),
  );
  if (!building || building.constructionFactor === undefined) return false;

  return unitTonnage > building.constructionFactor;
}

/**
 * MegaMek 48fcb2f64 `Mek.canFall` (L2154-L2156): only a Mek that is not prone
 * makes the fall rolls for water, rubble, skid and ice; other entities inherit
 * `Entity.canFall() == false`. Vehicle-specific terrain outcomes are not
 * represented.
 */
function canFall(unit: ITerrainPsrMover | undefined): boolean {
  return isBattleMechLikeUnitType(unit?.unitType) && unit?.prone !== true;
}

function isBattleMechLikeUnitType(unitType: string | undefined): boolean {
  if (unitType === undefined) return true;
  const canonical = unitType.toLowerCase().replace(/[^a-z0-9]/g, '');
  return (
    canonical === 'battlemech' ||
    canonical === 'omnimech' ||
    canonical === 'industrialmech'
  );
}

function isSkidTerrain(terrainFeatures: readonly ITerrainFeature[]): boolean {
  return (
    hasTerrainFeature(terrainFeatures, TerrainType.Pavement) ||
    hasTerrainFeature(terrainFeatures, TerrainType.Ice)
  );
}
