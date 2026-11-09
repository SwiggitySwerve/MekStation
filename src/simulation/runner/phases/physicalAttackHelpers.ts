import {
  CombatLocation,
  IGameState,
  IHexCoordinate,
  IHexGrid,
  IPendingPSR,
} from '@/types/gameplay';
import { planDisplacementTerrainPSRs } from '@/utils/gameplay/movement/terrainPsrTriggers';
import {
  IPhysicalAttackInput,
  type PhysicalAttackINarcPodSelection,
  type PhysicalAttackLimb,
  isTargetDirectlyAhead,
  isZweihanderPhysicalAttackType,
  PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks';
import { removeEquivalentINarcPod } from '@/utils/gameplay/specialWeaponMechanics';

export function dfaMissDropsAttacker(
  displacements: readonly {
    readonly unitId: string;
    readonly reason: string;
  }[],
  attackerId: string,
): boolean {
  return displacements.some(
    (displacement) =>
      displacement.unitId === attackerId && displacement.reason === 'dfa_miss',
  );
}

export function dominoEffectDisplacedUnitIds(
  displacements: readonly {
    readonly unitId: string;
    readonly reason: string;
  }[],
): readonly string[] {
  return displacements
    .filter((displacement) => displacement.reason === 'domino')
    .map((displacement) => displacement.unitId);
}

/**
 * Domino displacement terrain PSRs come from the shared displacement producer
 * (`planDisplacementTerrainPSRs`), which follows MegaMek 48fcb2f64
 * `TWGameManager.doEntityDisplacement` (TWGameManager.java:9771-9866). The
 * runner applies them for domino displacement only; the pin runs the same
 * checks for every displacement (push, charge, DFA).
 */
export function representedDominoTerrainPSRsForDisplacement(options: {
  readonly state: IGameState;
  readonly grid: IHexGrid;
  readonly unitId: string;
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  readonly reason: string;
}): readonly IPendingPSR[] {
  if (options.reason !== 'domino') return [];

  return planDisplacementTerrainPSRs({
    grid: options.grid,
    unitId: options.unitId,
    unit: options.state.units[options.unitId],
    from: options.from,
    to: options.to,
  });
}

export function zweihanderSelfCriticalLocations(
  attackType: IPhysicalAttackInput['attackType'],
  limb?: PhysicalAttackLimb,
): readonly CombatLocation[] {
  if (attackType === 'punch') return ['right_arm', 'left_arm'];
  return limb === 'leftArm' ? ['left_arm'] : ['right_arm'];
}

export function armForPhysicalLimb(
  limb: PhysicalAttackLimb | undefined,
): IPhysicalAttackInput['arm'] {
  return limb === 'leftArm' ? 'left' : 'right';
}

export function armWeaponsForPhysicalLimb(options: {
  readonly limb: PhysicalAttackLimb | undefined;
  readonly weaponsFiredFromLeftArm: readonly string[];
  readonly weaponsFiredFromRightArm: readonly string[];
}): readonly string[] {
  return options.limb === 'leftArm'
    ? options.weaponsFiredFromLeftArm
    : options.weaponsFiredFromRightArm;
}

export function armMountedPhysicalWeaponAttack(
  attackType: PhysicalAttackType,
): boolean {
  return (
    attackType === 'hatchet' ||
    attackType === 'sword' ||
    attackType === 'mace' ||
    attackType === 'lance' ||
    attackType === 'retractable-blade' ||
    attackType === 'flail'
  );
}

export function weaponsFiredFromPhysicalAttackArm(options: {
  readonly attackType: PhysicalAttackType;
  readonly declaredTwoHandedZweihander?: boolean;
  readonly limb: PhysicalAttackLimb | undefined;
  readonly weaponsFiredFromEitherArm: readonly string[];
  readonly weaponsFiredFromLeftArm: readonly string[];
  readonly weaponsFiredFromRightArm: readonly string[];
  readonly weaponsFiredThisTurn: readonly string[];
}): IPhysicalAttackInput['weaponsFiredFromArm'] {
  const {
    attackType,
    declaredTwoHandedZweihander,
    limb,
    weaponsFiredFromEitherArm,
    weaponsFiredFromLeftArm,
    weaponsFiredFromRightArm,
    weaponsFiredThisTurn,
  } = options;

  if (
    declaredTwoHandedZweihander &&
    isZweihanderPhysicalAttackType(attackType)
  ) {
    return weaponsFiredFromEitherArm;
  }
  if (attackType === 'thrash' || attackType === 'grapple') {
    return weaponsFiredThisTurn;
  }
  if (attackType === 'push') {
    return weaponsFiredFromEitherArm;
  }
  if (
    attackType === 'punch' ||
    attackType === 'brush-off' ||
    armMountedPhysicalWeaponAttack(attackType)
  ) {
    return armWeaponsForPhysicalLimb({
      limb,
      weaponsFiredFromLeftArm,
      weaponsFiredFromRightArm,
    });
  }
  return undefined;
}

export function defaultPhysicalAttackLimb(
  attackType: PhysicalAttackType,
): PhysicalAttackLimb | undefined {
  if (
    attackType === 'punch' ||
    attackType === 'brush-off' ||
    armMountedPhysicalWeaponAttack(attackType)
  ) {
    return 'rightArm';
  }
  return undefined;
}

export function friendlyUnitIdsForDisplacement(
  state: IGameState,
  displacedUnit: IGameState['units'][string],
): readonly string[] {
  return Object.values(state.units)
    .filter(
      (unit) =>
        unit.id !== displacedUnit.id && unit.side === displacedUnit.side,
    )
    .map((unit) => unit.id);
}

export function terrainAtPosition(
  grid: IHexGrid | undefined,
  position: IGameState['units'][string]['position'],
): string | undefined {
  if (!grid) return undefined;
  return grid.hexes.get(`${position.q},${position.r}`)?.terrain;
}

export function targetDirectlyBehindFeet(
  attacker: IGameState['units'][string],
  target: IGameState['units'][string],
): boolean {
  const oppositeFacing = ((attacker.facing + 3) % 6) as typeof attacker.facing;
  return isTargetDirectlyAhead(
    attacker.position,
    oppositeFacing,
    target.position,
  );
}

export function canonicalBrushOffTargetUnitType(
  unit: IGameState['units'][string],
): string | undefined {
  if (unit.combatState?.kind === 'squad') return 'battlearmor';
  return unit.unitType?.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function swarmingHostId(
  unit: IGameState['units'][string],
): string | undefined {
  if (unit.combatState?.kind !== 'squad') return undefined;
  return unit.combatState.state.swarmingUnitId;
}

export function targetIsSwarmingInfantryOnAttacker(
  attackerId: string,
  target: IGameState['units'][string],
): boolean {
  if (target.isSwarming !== true) return false;

  const canonical = canonicalBrushOffTargetUnitType(target);
  if (canonical !== 'infantry' && canonical !== 'battlearmor') return false;

  const hostId = swarmingHostId(target);
  return hostId === undefined || hostId === attackerId;
}

export function targetHasBrushOffINarcPods(
  target: IGameState['units'][string],
): boolean {
  return (target.iNarcPods?.length ?? 0) > 0;
}

export function clearBrushOffSwarmingState(
  state: IGameState,
  unitId: string,
): IGameState {
  const unit = state.units[unitId];
  if (!unit) return state;

  const combatState =
    unit.combatState?.kind === 'squad'
      ? (() => {
          const { swarmingUnitId: _swarmingUnitId, ...squadState } =
            unit.combatState.state;
          return {
            ...unit.combatState,
            state: squadState,
          };
        })()
      : unit.combatState;

  return {
    ...state,
    units: {
      ...state.units,
      [unitId]: {
        ...unit,
        isSwarming: false,
        ...(combatState ? { combatState } : {}),
      },
    },
  };
}

export function removeOneBrushOffINarcPod(
  state: IGameState,
  unitId: string,
  selectedINarcPod?: PhysicalAttackINarcPodSelection,
): IGameState {
  const unit = state.units[unitId];
  const iNarcPods = unit?.iNarcPods;
  if (!unit || !iNarcPods || iNarcPods.length === 0) return state;

  const remainingPods =
    selectedINarcPod === undefined
      ? iNarcPods.slice(1)
      : removeEquivalentINarcPod(iNarcPods, selectedINarcPod);
  if (remainingPods === iNarcPods) return state;

  return {
    ...state,
    units: {
      ...state.units,
      [unitId]: {
        ...unit,
        iNarcPods: remainingPods,
      },
    },
  };
}

export function physicalDeclarationSelectedINarcPod(payload: {
  readonly selectedINarcPod?: PhysicalAttackINarcPodSelection;
}): PhysicalAttackINarcPodSelection | undefined {
  return payload.selectedINarcPod;
}
