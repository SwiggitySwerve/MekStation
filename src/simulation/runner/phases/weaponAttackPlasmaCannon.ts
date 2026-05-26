import {
  GameEventType,
  GamePhase,
  IGameEvent,
  IGameState,
} from '@/types/gameplay';

import type { IWeapon } from '../../ai/types';

import { createGameEvent } from './utils';

export function isPlasmaCannonWeapon(weapon: IWeapon): boolean {
  const searchable = `${weapon.id} ${weapon.name}`.toLowerCase();
  return (
    searchable.includes('plasma-cannon') || /\bplasma cannon\b/.test(searchable)
  );
}

function targetTracksPlasmaHeat(
  unit: IGameState['units'][string] | undefined,
): boolean {
  if (!unit) return false;
  const unitType = String(unit.unitType ?? 'BattleMech')
    .toLowerCase()
    .replace(/[\s_-]/g, '');
  return unitType === 'battlemech';
}

function normalizeArmorType(value: string | undefined): string {
  return (value ?? '').toLowerCase().replace(/[\s_-]/g, '');
}

function adjustPlasmaHeatForArmor(options: {
  readonly rawHeat: number;
  readonly target: IGameState['units'][string];
  readonly location: string;
}): number {
  const armorRemaining = options.target.armor[options.location] ?? 0;
  if (armorRemaining <= 0) return options.rawHeat;

  const armorType = normalizeArmorType(
    options.target.armorTypeByLocation?.[options.location],
  );
  if (armorType === 'reflective') {
    return Math.max(1, Math.floor(options.rawHeat / 2));
  }
  if (armorType === 'heatdissipating') {
    return Math.floor(options.rawHeat / 2);
  }
  return options.rawHeat;
}

export function applyPlasmaCannonTargetHeat(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  attackerId: string;
  targetId: string;
  weaponId: string;
  weapon: IWeapon;
  projectileCount?: number;
  attackRoll: number;
  toHitNumber: number;
  location: string;
  firingArc: 'front' | 'left' | 'right' | 'rear';
  d6Roller: () => number;
}): IGameState {
  const {
    events,
    gameId,
    attackerId,
    targetId,
    weaponId,
    weapon,
    projectileCount,
    attackRoll,
    toHitNumber,
    location,
    firingArc,
    d6Roller,
  } = options;
  let { currentState } = options;

  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.AttackResolved,
      currentState.turn,
      GamePhase.WeaponAttack,
      {
        attackerId,
        targetId,
        weaponId,
        roll: attackRoll,
        toHitNumber,
        hit: true,
        location,
        damage: 0,
        heat: weapon.heat,
        ...(projectileCount !== undefined ? { projectileCount } : {}),
        attackerArc: firingArc,
      },
      attackerId,
    ),
  );

  const target = currentState.units[targetId];
  if (!targetTracksPlasmaHeat(target)) {
    return currentState;
  }

  const rawHeat = d6Roller() + d6Roller();
  const amount = adjustPlasmaHeatForArmor({
    rawHeat,
    target,
    location,
  });
  const previousTotal = target.heat;
  const newTotal = previousTotal + amount;
  currentState = {
    ...currentState,
    units: {
      ...currentState.units,
      [targetId]: {
        ...target,
        heat: newTotal,
      },
    },
  };

  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.HeatGenerated,
      currentState.turn,
      GamePhase.WeaponAttack,
      {
        unitId: targetId,
        amount,
        source: 'external',
        previousTotal,
        newTotal,
      },
      targetId,
    ),
  );

  return currentState;
}
