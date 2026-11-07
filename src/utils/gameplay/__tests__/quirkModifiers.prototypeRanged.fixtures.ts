import type { IFullUnit } from '@/services/units/CanonicalUnitService';
import type { IWeapon } from '@/simulation/ai/types';
import type {
  IAttackDeclaredPayload,
  IGameEvent,
  IGameSession,
  IGameState,
  IWeaponAttack,
} from '@/types/gameplay';

import { resolveWeaponHit as resolveRunnerHit } from '@/simulation/runner/phases/weaponAttackHitResolution';
import { hydrateUnitQuirksFromFullUnit } from '@/simulation/runner/UnitHydrationMovement';
import { WeaponCategory } from '@/types/equipment/weapons/interfaces';
import {
  FiringArc,
  GameEventType,
  GameSide,
  RangeBracket,
} from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import type { CriticalSlotManifest } from '../criticalHitResolution';
import type { DiceRoller } from '../diceTypes';

import icarus from '../../../../public/data/units/battlemechs/1-age-of-war/experimental/Icarus ICR-1X.json';
import { resolveWeaponHit as resolveSessionHit } from '../gameSessionAttackResolution.hit';
import {
  advancePhase,
  createGameSession,
  declareAttack,
  rollInitiative,
  startGame,
} from '../gameSessionCore';
import { baseGameUnit } from '../gameState/__tests__/initialization.combatState.fixtures';

// Project actual source metadata into the canonical service's public contract.
export const sourcePrototypeQuirks = hydrateUnitQuirksFromFullUnit({
  id: icarus.id,
  chassis: icarus.chassis,
  variant: icarus.model,
  tonnage: icarus.tonnage,
  techBase: icarus.techBase,
  era: icarus.era,
  unitType: icarus.unitType,
  quirks: icarus.quirks,
} satisfies IFullUnit);
export const prototypeWeapon: IWeaponAttack = {
  weaponId: 'medium-laser',
  weaponName: 'Medium Laser',
  damage: 5,
  heat: 3,
  category: WeaponCategory.ENERGY,
  minRange: 0,
  shortRange: 3,
  mediumRange: 6,
  longRange: 9,
  isCluster: false,
};

export function prototypeManifest(): CriticalSlotManifest {
  return {
    center_torso: [0, 1, 2].map((slotIndex) => ({
      slotIndex,
      componentType: 'heat_sink',
      componentName: 'Heat Sink',
      destroyed: false,
    })),
  };
}

export function prototypeSession(
  quirks: readonly string[],
  options: {
    readonly armor?: number;
    readonly unitType?: UnitType;
    readonly attackerQuirks?: readonly string[];
  } = {},
): IGameSession {
  let session = createGameSession(
    {
      mapRadius: 10,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    },
    [
      baseGameUnit({
        id: 'attacker',
        unitType: UnitType.BATTLEMECH,
        unitQuirks: options.attackerQuirks,
      }),
      baseGameUnit({
        id: 'target',
        side: GameSide.Opponent,
        unitType: options.unitType,
        unitQuirks: quirks,
        armorByLocation: { center_torso: options.armor ?? 0 },
        structureByLocation: { center_torso: 31 },
        criticalSlotManifest: prototypeManifest(),
      }),
    ],
  );
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session, GameSide.Player, () => 3);
  session = advancePhase(advancePhase(session));
  return declareAttack(
    session,
    'attacker',
    'target',
    [prototypeWeapon],
    3,
    RangeBracket.Short,
  );
}

function scriptedD6(values: readonly number[]): () => number {
  let index = 0;
  return () => values[index++] ?? 1;
}

export function sessionPrototypeHit(
  session: IGameSession,
  roll: number,
  glancing = false,
  tac = false,
): IGameSession {
  const declared = session.events.findLast(
    (event) => event.type === GameEventType.AttackDeclared,
  );
  if (!declared) throw new Error('Expected AttackDeclared');
  const payload = declared.payload as IAttackDeclaredPayload;
  const values = scriptedD6([
    Math.floor(roll / 2),
    Math.ceil(roll / 2),
    1,
    1,
    1,
    2,
    1,
    3,
  ]);
  let first = true;
  const diceRoller: DiceRoller = () => {
    const dice = first ? (tac ? [1, 1] : [3, 4]) : [values(), 1];
    first = false;
    return {
      dice,
      total: dice[0] + dice[1],
      isSnakeEyes: dice.every((die) => die === 1),
      isBoxcars: dice.every((die) => die === 6),
    };
  };
  return resolveSessionHit({
    session,
    payload,
    attackerId: 'attacker',
    targetId: 'target',
    weaponId: prototypeWeapon.weaponId,
    weaponName: prototypeWeapon.weaponName,
    weaponData: prototypeWeapon,
    attackRollTotal: glancing ? 6 : 8,
    weaponToHitNumber: 6,
    firingArc: FiringArc.Front,
    arcString: 'front',
    ammoBinIdForResolved: null,
    targetState: session.currentState.units.target,
    turn: session.currentState.turn,
    diceRoller,
  });
}

export function runnerPrototypeHit(
  session: IGameSession,
  roll: number,
  glancing = false,
  tac = false,
): { state: IGameState; events: IGameEvent[] } {
  const events: IGameEvent[] = [];
  const weapon: IWeapon = {
    id: 'medium-laser',
    name: 'Medium Laser',
    damage: 5,
    heat: 3,
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  };
  const manifest = prototypeManifest();
  const state = resolveRunnerHit({
    currentState: session.currentState,
    events,
    gameId: session.id,
    unitId: 'attacker',
    targetId: 'target',
    weaponId: weapon.id,
    weapon,
    attackRoll: glancing ? 6 : 8,
    toHitNumber: 6,
    firingArc: 'front',
    partialCover: false,
    d6Roller: scriptedD6([
      ...(tac ? [1, 1] : [3, 4]),
      Math.floor(roll / 2),
      Math.ceil(roll / 2),
      1,
      1,
      1,
      2,
      1,
      3,
    ]),
    getOrSeedManifest: () => manifest,
    manifestsByUnit: new Map([['target', manifest]]),
  });
  return { state, events };
}

export function criticalEvents(events: readonly IGameEvent[]): IGameEvent[] {
  return events.filter(
    (event) => event.type === GameEventType.CriticalHitResolved,
  );
}
