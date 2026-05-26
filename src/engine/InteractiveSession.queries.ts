import type { IWeapon } from '@/simulation/ai/types';
import type { IUnitToken, IWeaponStatus } from '@/types/gameplay';
import type {
  IAmmoSlotState,
  IGameSession,
  IGameState,
} from '@/types/gameplay/GameSessionInterfaces';
import type {
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
} from '@/types/gameplay/HexGridInterfaces';

import { unitStateToToken } from '@/lib/gameplay/unitStateToToken';
import { MovementType } from '@/types/gameplay/HexGridInterfaces';
import { deriveCombatRangeHexes } from '@/utils/gameplay/combatProjection';
import { coordToKey } from '@/utils/gameplay/hexMath';
import {
  movementDeclarationLockInvalidState,
  resolveRuntimeMovementCapability,
} from '@/utils/gameplay/movement';
import { gridWithUnitOccupants } from '@/utils/gameplay/movement/occupancy';
import { deriveReachableHexes } from '@/utils/gameplay/movement/reachable';

import type { IAvailableActions } from './types';

export function getAvailableActionsForState(
  state: IGameState,
  unitId: string,
  weaponsByUnit: Map<string, readonly IWeapon[]>,
  movementByUnit: Map<string, IMovementCapability>,
  options: {
    readonly session?: IGameSession;
    readonly grid?: IHexGrid;
  } = {},
): IAvailableActions {
  const unit = state.units[unitId];
  if (!unit || unit.destroyed) {
    return { validMoves: [], validTargets: [] };
  }

  const weapons = weaponsByUnit.get(unitId) ?? [];
  const rawMovementCapability = movementByUnit.get(unitId) ?? null;
  const movementCapability = rawMovementCapability
    ? (resolveRuntimeMovementCapability(unit, rawMovementCapability) ??
      rawMovementCapability)
    : null;
  if (!options.grid) {
    return {
      validMoves: [],
      validTargets: legacyLiveEnemyTargets(state, unit.side, weapons),
    };
  }

  const tokens = buildProjectionTokens(state, options.session, unitId);
  const attacker = tokens.find((token) => token.unitId === unitId);
  if (!attacker) return { validMoves: [], validTargets: [] };

  const occupiedGrid = gridWithUnitOccupants(options.grid, state.units);
  const validMoves =
    movementCapability && !movementDeclarationLockInvalidState(unit.lockState)
      ? deriveAvailableMovementDestinations(
          unit,
          movementCapability,
          occupiedGrid,
          options.session?.config.optionalRules ?? [],
        )
      : [];

  const validTargetsById = new Map<string, Set<string>>();
  for (const projection of deriveCombatRangeHexes({
    attacker,
    hexes: Array.from(options.grid.hexes.values(), (hex) => hex.coord),
    grid: options.grid,
    tokens,
    weapons: weapons.map((weapon) =>
      engineWeaponToStatus(weapon, unit.ammoState),
    ),
    combatState: state,
  })) {
    for (const targetId of projection.validTargetUnitIds) {
      const targetWeapons = validTargetsById.get(targetId) ?? new Set<string>();
      for (const weaponId of projection.weaponIdsAvailable) {
        targetWeapons.add(weaponId);
      }
      validTargetsById.set(targetId, targetWeapons);
    }
  }

  return {
    validMoves,
    validTargets: Array.from(validTargetsById.entries()).map(
      ([targetId, weaponIds]) => ({
        unitId: targetId,
        weapons: Array.from(weaponIds),
      }),
    ),
  };
}

const ACTION_MOVEMENT_TYPES = [
  MovementType.Walk,
  MovementType.Run,
  MovementType.Jump,
] as const;

function deriveAvailableMovementDestinations(
  unit: IGameState['units'][string],
  movementCapability: IMovementCapability,
  grid: IHexGrid,
  optionalRules: readonly string[],
): readonly IHexCoordinate[] {
  const reachableByKey = new Map<string, IHexCoordinate>();

  for (const movementType of ACTION_MOVEMENT_TYPES) {
    for (const movementHex of deriveReachableHexes(
      unit,
      movementType,
      grid,
      movementCapability,
      'normal',
      { optionalRules },
    )) {
      if (movementHex.reachable) {
        reachableByKey.set(coordToKey(movementHex.hex), movementHex.hex);
      }
    }
  }

  return Array.from(reachableByKey.values());
}

function legacyLiveEnemyTargets(
  state: IGameState,
  attackerSide: IGameState['units'][string]['side'],
  weapons: readonly IWeapon[],
): IAvailableActions['validTargets'] {
  const validTargets: { unitId: string; weapons: string[] }[] = [];
  for (const [uid, candidate] of Object.entries(state.units)) {
    if (candidate.side !== attackerSide && !candidate.destroyed) {
      validTargets.push({
        unitId: uid,
        weapons: weapons.filter((weapon) => !weapon.destroyed).map((w) => w.id),
      });
    }
  }
  return validTargets;
}

function buildProjectionTokens(
  state: IGameState,
  session: IGameSession | undefined,
  selectedUnitId: string,
): readonly IUnitToken[] {
  const unitInfoById = new Map(
    (session?.units ?? []).map((unit) => [
      unit.id,
      { name: unit.name, side: unit.side },
    ]),
  );

  return Object.entries(state.units).map(([currentUnitId, unitState]) => {
    const unitInfo = unitInfoById.get(currentUnitId) ?? {
      name: currentUnitId,
      side: unitState.side,
    };
    return unitStateToToken(currentUnitId, unitState, unitInfo, {
      isSelected: currentUnitId === selectedUnitId,
      isValidTarget: false,
      isActiveTarget: false,
    });
  });
}

function engineWeaponToStatus(
  weapon: IWeapon,
  ammoState: Readonly<Record<string, IAmmoSlotState>> | undefined,
): IWeaponStatus {
  const ammoTotals = ammoTotalsForWeapon(weapon, ammoState);
  return {
    id: weapon.id,
    name: weapon.name,
    mode: 'Direct',
    location: 'unknown',
    mountingArc: weapon.mountingArc,
    mountingArcs: weapon.mountingArcs,
    destroyed: weapon.destroyed,
    firedThisTurn: false,
    ...ammoTotals,
    heat: weapon.heat,
    damage: weapon.damage,
    isTorpedo: weapon.isTorpedo,
    ranges: {
      short: weapon.shortRange,
      medium: weapon.mediumRange,
      long: weapon.longRange,
      ...(weapon.extremeRange !== undefined
        ? { extreme: weapon.extremeRange }
        : {}),
      ...(weapon.minRange > 0 ? { minimum: weapon.minRange } : {}),
    },
  };
}

function ammoTotalsForWeapon(
  weapon: IWeapon,
  ammoState: Readonly<Record<string, IAmmoSlotState>> | undefined,
): Pick<IWeaponStatus, 'ammoRemaining' | 'ammoMax'> {
  if (weapon.ammoPerTon === -1) return {};

  const bins = Object.values(ammoState ?? {}).filter(
    (bin) => bin.weaponType === weapon.name,
  );
  return {
    ammoRemaining: bins.reduce((total, bin) => total + bin.remainingRounds, 0),
    ammoMax: bins.reduce((total, bin) => total + bin.maxRounds, 0),
  };
}
