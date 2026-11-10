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
import {
  createBuildingCollapsePSR,
  createEnteringWaterPSR,
  createIcePSR,
  createRubblePSR,
  createSkiddingPSR,
  createSwampBogDownPSR,
} from '@/utils/gameplay/pilotingSkillRolls';

import { movementModeForPath } from './mode';
import {
  hasOverloadedBuildingFeature,
  hasTerrainFeature,
  terrainAt,
  terrainFeaturesFromTag,
  terrainLevelFromFeatures,
  waterDepthFromFeatures,
} from './terrainFeatureQueries';

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
  /** The step ordinal stamped into `movement-step:<n>`; none for displacement. */
  readonly stepIndex: number | undefined;
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
    ...waterEntryPSRs(context),
    ...rubblePSRs(context),
    ...recklessIcePSRs(context),
    ...swampBogDownPSRs(context),
    ...buildingCollapsePSRs(context),
    ...skiddingPSRs(context),
  ];
}

/**
 * Terrain PSRs for a unit forced into `to` by a displacement (push, charge,
 * DFA, domino). MegaMek 48fcb2f64 `TWGameManager.doEntityDisplacement`
 * limits the terrain outcomes to building collapse (L9771), the bog-down
 * check (L9824, L10047-L10069) and the water check (L9851-L9866), in that
 * order. There is no rubble, ice or exiting-water roll, and the bog-down check
 * does not look at the hex the unit left. The PSRs carry no `movement-step`
 * stamp.
 */
export function planDisplacementTerrainPSRs(options: {
  readonly grid: IHexGrid;
  readonly unitId: string;
  readonly unit: ITerrainPsrMover | undefined;
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
}): readonly IPendingPSR[] {
  const { from, grid, to, unit, unitId } = options;
  const context: TerrainPsrContext = {
    grid,
    movementType: MovementType.Walk,
    step: { kind: 'forward', index: 0, from, to },
    stepIndex: undefined,
    steps: [],
    unitId,
    unitTonnage: unit?.tonnage,
    unitType: unit?.unitType,
    canFall: canFall(unit),
    enteredFeatures: terrainFeaturesFromTag(terrainAt(grid, to)),
    fromFeatures: [],
  };
  return [
    ...buildingCollapsePSRs(context),
    ...swampBogDownPSRs(context),
    ...waterEntryPSRs(context),
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
    stepIndex: step.index,
    enteredFeatures: terrainFeaturesFromTag(
      step.terrainEntered ?? terrainAt(grid, step.to),
    ),
    fromFeatures: terrainFeaturesFromTag(terrainAt(grid, step.from)),
  };
}

/**
 * MegaMek 48fcb2f64 `Entity.checkWaterMove` (Entity.java:9615-9639): any step
 * that changes position into a water hex rolls, whatever the hex it left. A
 * jump rolls for its landing hex (`MovePathHandler.java:1615`). A hex that is
 * ice-covered water is walked on, so it is not a water roll.
 */
function waterEntryPSRs(context: TerrainPsrContext): readonly IPendingPSR[] {
  const { canFall, enteredFeatures, movementMode, step, stepIndex, unitId } =
    context;
  if (!canFall || step.kind === 'turn') return [];
  if (!hasTerrainFeature(enteredFeatures, TerrainType.Water)) return [];
  if (hasTerrainFeature(enteredFeatures, TerrainType.Ice)) return [];
  if (
    movementMode !== undefined &&
    WATER_ENTRY_EXEMPT_MODES.has(movementMode)
  ) {
    return [];
  }

  return [
    createEnteringWaterPSR(unitId, stepIndex, {
      waterDepth: waterDepthFromFeatures(enteredFeatures),
    }),
  ];
}

/**
 * MegaMek 48fcb2f64 `Entity.checkRubbleMove` (Entity.java:9539-9568): entering
 * a rubble hex rolls, +1 for ultra-rubble (level above 5).
 */
function rubblePSRs(context: TerrainPsrContext): readonly IPendingPSR[] {
  const { canFall, enteredFeatures, stepIndex, unitId } = context;
  if (!canFall || !hasTerrainFeature(enteredFeatures, TerrainType.Rubble)) {
    return [];
  }

  return [
    createRubblePSR(unitId, stepIndex, {
      rubbleLevel: terrainLevelFromFeatures(
        enteredFeatures,
        TerrainType.Rubble,
      ),
    }),
  ];
}

/**
 * Ice follows MegaMek 48fcb2f64 `Entity.checkRecklessMove`
 * (Entity.java:9241-9290): every non-jump step taken in a hex containing ice
 * rolls "moving recklessly" at +0 (L9280-L9281), including a turn made on the
 * ice. The careful-movement exemption (L9250) is not modelled: MekStation has
 * no careful step.
 */
function recklessIcePSRs(context: TerrainPsrContext): readonly IPendingPSR[] {
  const {
    canFall,
    enteredFeatures,
    grid,
    movementType,
    step,
    stepIndex,
    unitId,
  } = context;
  if (!canFall || movementType === MovementType.Jump) return [];
  if (step.kind !== 'forward' && step.kind !== 'turn') return [];

  const hexFeatures =
    step.kind === 'turn'
      ? terrainFeaturesFromTag(terrainAt(grid, step.at))
      : enteredFeatures;
  if (!hasTerrainFeature(hexFeatures, TerrainType.Ice)) return [];

  return [createIcePSR(unitId, stepIndex)];
}

function swampBogDownPSRs(context: TerrainPsrContext): readonly IPendingPSR[] {
  const { enteredFeatures, stepIndex, unitId } = context;
  if (!shouldQueueSwampBogDownPSR(context)) return [];

  return [
    createSwampBogDownPSR(unitId, stepIndex, {
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

  return [createBuildingCollapsePSR(unitId, context.stepIndex)];
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

/**
 * MegaMek 48fcb2f64 `Mek.canFall` (L2154-L2156): only a Mek that is not prone
 * makes the fall rolls for water, rubble, skid and ice; other entities inherit
 * `Entity.canFall() == false`. Vehicle-specific terrain outcomes are not
 * represented.
 */
export function canFall(unit: ITerrainPsrMover | undefined): boolean {
  return isBattleMechLikeUnitType(unit?.unitType) && unit?.prone !== true;
}

export function isBattleMechLikeUnitType(
  unitType: string | undefined,
): boolean {
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
