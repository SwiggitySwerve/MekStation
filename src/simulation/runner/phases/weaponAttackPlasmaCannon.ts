import { IGameEvent, IGameState } from '@/types/gameplay';

import type { IWeapon } from '../../ai/types';

import { appendAttackResolvedEvent } from './utils';

export function isPlasmaCannonWeapon(weapon: IWeapon): boolean {
  const searchable = `${weapon.id} ${weapon.name}`.toLowerCase();
  return (
    searchable.includes('plasma-cannon') || /\bplasma cannon\b/.test(searchable)
  );
}

const PLAYTEST_3_OPTIONAL_RULES = new Set([
  'playtest_3',
  'playtest-3',
  'playtest3',
]);

export const EXTERNAL_HEAT_CAP_PER_TURN = 15;

function hasPlaytest3Rule(
  optionalRules: readonly string[] | undefined,
): boolean {
  return (
    optionalRules?.some((rule) =>
      PLAYTEST_3_OPTIONAL_RULES.has(rule.toLowerCase()),
    ) ?? false
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
  readonly optionalRules?: readonly string[];
}): number {
  const armorRemaining = options.target.armor[options.location] ?? 0;
  if (armorRemaining <= 0) return options.rawHeat;

  const armorType = normalizeArmorType(
    options.target.armorTypeByLocation?.[options.location],
  );
  const playtest3 = hasPlaytest3Rule(options.optionalRules);
  if (armorType === 'reflective') {
    if (playtest3) return options.rawHeat;
    return Math.max(1, Math.floor(options.rawHeat / 2));
  }
  if (armorType === 'heatdissipating') {
    if (playtest3) return 0;
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
  optionalRules?: readonly string[];
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
    optionalRules,
  } = options;
  let { currentState } = options;

  appendAttackResolvedEvent({
    events,
    gameId,
    turn: currentState.turn,
    payload: {
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
    actorId: attackerId,
  });

  const target = currentState.units[targetId];
  if (!targetTracksPlasmaHeat(target)) {
    return currentState;
  }

  const rawHeat = d6Roller() + d6Roller();
  const amount = adjustPlasmaHeatForArmor({
    rawHeat,
    target,
    location,
    optionalRules,
  });
  const pendingExternalHeat = Math.max(0, target.pendingExternalHeat ?? 0);
  currentState = {
    ...currentState,
    units: {
      ...currentState.units,
      [targetId]: {
        ...target,
        pendingExternalHeat: pendingExternalHeat + amount,
      },
    },
  };

  return currentState;
}
