import type { IFullUnit } from '@/services/units/CanonicalUnitService';
import type {
  IGameEvent,
  IGameSession,
  IGameState,
  IPhysicalAttackDeclaredPayload,
  CombatLocation,
} from '@/types/gameplay';

import { applyPhysicalDamageEffects } from '@/simulation/runner/phases/physicalAttackDamageEffects';
import { hydrateUnitQuirksFromFullUnit } from '@/simulation/runner/UnitHydrationMovement';
import { GameEventType, GameSide } from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import type { CriticalSlotManifest } from '../criticalHitResolution';
import type {
  IPhysicalAttackInput,
  IPhysicalAttackResult,
  PhysicalAttackType,
} from '../physicalAttacks';

import firebee from '../../../../public/data/units/battlemechs/1-age-of-war/standard/Firebee FRB-2E.json';
import { buildDefaultComponentDamageState } from '../gameSessionAttackResolutionHelpers';
import {
  advancePhase,
  createGameSession,
  rollInitiative,
  startGame,
} from '../gameSessionCore';
import { appendPhysicalAttackDamageEvents } from '../gameSessionPhysicalDamageEvents';
import { baseGameUnit } from '../gameState/__tests__/initialization.combatState.fixtures';

export const sourceWeakLegsQuirks = hydrateUnitQuirksFromFullUnit({
  id: firebee.id,
  chassis: firebee.chassis,
  variant: firebee.model,
  tonnage: firebee.tonnage,
  techBase: firebee.techBase,
  era: firebee.era,
  unitType: firebee.unitType,
  quirks: firebee.quirks,
} satisfies IFullUnit);

export const weakLegLocations: readonly CombatLocation[] = [
  'left_leg',
  'right_leg',
  'left_arm',
  'right_arm',
];
export function weakLegsManifest(): CriticalSlotManifest {
  return Object.fromEntries(
    [...weakLegLocations, 'center_torso', 'head'].map((location) => [
      location,
      [0, 1, 2].map((slotIndex) => ({
        slotIndex,
        componentType: 'heat_sink',
        componentName: 'Heat Sink',
        destroyed: false,
      })),
    ]),
  );
}

export interface IWeakLegsCaseOptions {
  readonly quirks?: readonly string[];
  readonly attackType?: PhysicalAttackType;
  readonly hit?: boolean;
  readonly location?: CombatLocation;
  readonly role?: 'attacker' | 'target';
  readonly isQuad?: boolean;
  readonly armor?: number;
  readonly manifest?: CriticalSlotManifest;
}

export function weakLegsCase(options: IWeakLegsCaseOptions = {}): {
  session: IGameSession;
  payload: IPhysicalAttackDeclaredPayload;
  result: IPhysicalAttackResult;
  input: IPhysicalAttackInput;
} {
  const role = options.role ?? 'target';
  const armor = Object.fromEntries(
    [...weakLegLocations, 'center_torso', 'head'].map((l) => [
      l,
      options.armor ?? 30,
    ]),
  );
  const structure = Object.fromEntries(Object.keys(armor).map((l) => [l, 30]));
  let session = createGameSession(
    {
      mapRadius: 10,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    },
    ['attacker', 'target'].map((id) =>
      baseGameUnit({
        id,
        side: id === 'attacker' ? GameSide.Player : GameSide.Opponent,
        unitType: UnitType.BATTLEMECH,
        isQuad: id === 'attacker' && options.isQuad,
        unitQuirks: id === role ? (options.quirks ?? ['weak_legs']) : [],
        armorByLocation: armor,
        structureByLocation: structure,
        criticalSlotManifest: options.manifest ?? weakLegsManifest(),
      }),
    ),
  );
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session, GameSide.Player, () => 3);
  session = advancePhase(advancePhase(advancePhase(session)));
  const attackType = options.attackType ?? 'kick';
  const hit = options.hit ?? true;
  const payload: IPhysicalAttackDeclaredPayload = {
    attackerId: 'attacker',
    targetId: 'target',
    attackType,
    toHitNumber: 5,
  };
  const result: IPhysicalAttackResult = {
    attackType,
    toHitNumber: 5,
    roll: hit ? 8 : 2,
    hit,
    targetDamage: hit ? 5 : 0,
    attackerDamage: 0,
    attackerLegDamagePerLeg: attackType === 'dfa' && hit ? 5 : 0,
    targetPSR: false,
    attackerPSR: false,
    attackerPSRModifier: 0,
    hitLocation: options.location ?? 'left_leg',
    targetDisplaced: false,
  };
  const input: IPhysicalAttackInput = {
    attackType,
    attackerTonnage: 50,
    pilotingSkill: 5,
    componentDamage: buildDefaultComponentDamageState(),
  };
  return { session, payload, result, input };
}

export function weakLegsDice(total = 8): () => number {
  let call = 0;
  return () => [Math.floor(total / 2), Math.ceil(total / 2), 1, 1][call++ % 4];
}

export function sessionWeakLegsEffects(
  c: ReturnType<typeof weakLegsCase>,
  roller = weakLegsDice(),
): IGameSession {
  return appendPhysicalAttackDamageEvents({
    session: c.session,
    turn: c.session.currentState.turn,
    payload: c.payload,
    result: c.result,
    attackerState: c.session.currentState.units.attacker,
    targetState: c.session.currentState.units.target,
    d6Roller: roller,
  });
}

export function runnerWeakLegsEffects(
  c: ReturnType<typeof weakLegsCase>,
  roller = weakLegsDice(),
): { state: IGameState; events: IGameEvent[] } {
  const events: IGameEvent[] = [];
  const state = applyPhysicalDamageEffects({
    state: c.session.currentState,
    events,
    gameId: c.session.id,
    unitId: 'attacker',
    unit: c.session.currentState.units.attacker,
    target: c.session.currentState.units.target,
    attackType: c.payload.attackType,
    attackInput: c.input,
    result: c.result,
    d6Roller: roller,
    declaredTwoHandedZweihander: false,
    targetHasINarcPods: false,
    manifestsByUnit: new Map([
      [
        'attacker',
        c.session.currentState.units.attacker.criticalSlotManifest ??
          weakLegsManifest(),
      ],
      [
        'target',
        c.session.currentState.units.target.criticalSlotManifest ??
          weakLegsManifest(),
      ],
    ]),
  });
  return { state, events };
}

export function weakLegsCriticalLocations(
  events: readonly IGameEvent[],
): readonly unknown[] {
  return events
    .filter((e) => e.type === GameEventType.CriticalHitResolved)
    .map((e) => (e.payload as { location: string }).location);
}
