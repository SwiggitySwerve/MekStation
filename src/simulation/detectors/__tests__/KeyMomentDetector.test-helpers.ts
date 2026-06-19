/**
 * Tests for KeyMomentDetector
 *
 * Covers all 18 key moment types across 3 tiers with edge cases.
 */

import {
  GameEventType,
  GamePhase,
  GameSide,
  type IGameEvent,
  type GameEventPayload,
  type IUnitDestroyedPayload,
  type IDamageAppliedPayload,
  type IAttackResolvedPayload,
  type IPilotHitPayload,
  type ICriticalHitPayload,
  type IAmmoExplosionPayload,
  type IHeatEffectAppliedPayload,
} from '@/types/gameplay/GameSessionInterfaces';

import {
  KeyMomentDetector,
  type BattleState,
  type BattleUnit,
} from '../KeyMomentDetector';

// =============================================================================
// Test Helpers
// =============================================================================

let sequenceCounter = 0;

export interface DamageAppliedEventFixture {
  readonly unitId: string;
  readonly location: string;
  readonly damage: number;
  readonly armorRemaining: number;
  readonly structureRemaining: number;
  readonly options?: { sourceUnitId?: string; locationDestroyed?: boolean };
  readonly overrides?: Partial<IGameEvent>;
}

export function resetSequence(): void {
  sequenceCounter = 0;
}

export function createEvent(
  type: GameEventType,
  payload: Record<string, unknown>,
  overrides?: Partial<IGameEvent>,
): IGameEvent {
  sequenceCounter++;
  return {
    id: `evt-${sequenceCounter}`,
    gameId: 'game-1',
    sequence: sequenceCounter,
    timestamp: '2026-02-03T12:00:00Z',
    turn: 1,
    phase: GamePhase.WeaponAttack,
    ...overrides,
    type,
    payload: payload as unknown as GameEventPayload,
  };
}

export function createBattleUnit(
  overrides: Partial<BattleUnit> & { id: string },
): BattleUnit {
  return {
    name: overrides.id,
    side: GameSide.Player,
    bv: 1000,
    weaponIds: ['ac20', 'ml1', 'ml2'],
    initialArmor: {
      head: 9,
      ct: 25,
      lt: 20,
      rt: 20,
      la: 15,
      ra: 15,
      ll: 15,
      rl: 15,
    },
    initialStructure: {
      head: 3,
      ct: 16,
      lt: 12,
      rt: 12,
      la: 8,
      ra: 8,
      ll: 10,
      rl: 10,
    },
    ...overrides,
  };
}

export function createStandardBattleState(): BattleState {
  return {
    units: [
      createBattleUnit({
        id: 'atlas',
        name: 'Atlas AS7-D',
        side: GameSide.Player,
        bv: 1800,
      }),
      createBattleUnit({
        id: 'marauder',
        name: 'Marauder MAD-3R',
        side: GameSide.Player,
        bv: 1200,
      }),
      createBattleUnit({
        id: 'hunchback',
        name: 'Hunchback HBK-4G',
        side: GameSide.Player,
        bv: 900,
      }),
      createBattleUnit({
        id: 'timberwolf',
        name: 'Timber Wolf Prime',
        side: GameSide.Opponent,
        bv: 2000,
      }),
      createBattleUnit({
        id: 'madcat',
        name: 'Mad Cat Mk II',
        side: GameSide.Opponent,
        bv: 1500,
      }),
      createBattleUnit({
        id: 'stormcrow',
        name: 'Storm Crow Prime',
        side: GameSide.Opponent,
        bv: 800,
      }),
    ],
  };
}

export function unitDestroyedEvent(
  unitId: string,
  killerUnitId?: string,
  overrides?: Partial<IGameEvent>,
): IGameEvent {
  return createEvent(
    GameEventType.UnitDestroyed,
    {
      unitId,
      cause: 'damage',
      killerUnitId,
    } satisfies IUnitDestroyedPayload,
    overrides,
  );
}

export function damageAppliedEvent({
  unitId,
  location,
  damage,
  armorRemaining,
  structureRemaining,
  options,
  overrides,
}: DamageAppliedEventFixture): IGameEvent {
  return createEvent(
    GameEventType.DamageApplied,
    {
      unitId,
      location,
      damage,
      armorRemaining,
      structureRemaining,
      locationDestroyed: options?.locationDestroyed ?? false,
      sourceUnitId: options?.sourceUnitId,
    } satisfies IDamageAppliedPayload,
    overrides,
  );
}

export function attackResolvedEvent(
  attackerId: string,
  targetId: string,
  weaponId: string,
  hit: boolean,
  overrides?: Partial<IGameEvent>,
  payloadOverrides?: Partial<IAttackResolvedPayload> & Record<string, unknown>,
): IGameEvent {
  return createEvent(
    GameEventType.AttackResolved,
    {
      attackerId,
      targetId,
      weaponId,
      roll: 8,
      toHitNumber: 7,
      hit,
      location: hit ? 'ct' : undefined,
      damage: hit ? 10 : undefined,
      ...payloadOverrides,
    },
    overrides,
  );
}

export function criticalHitEvent(
  unitId: string,
  location: string,
  component: string,
  sourceUnitId?: string,
  overrides?: Partial<IGameEvent>,
): IGameEvent {
  return createEvent(
    GameEventType.CriticalHit,
    { unitId, location, component, sourceUnitId } satisfies ICriticalHitPayload,
    overrides,
  );
}

export function ammoExplosionEvent(
  unitId: string,
  location: string,
  damage: number,
  overrides?: Partial<IGameEvent>,
): IGameEvent {
  return createEvent(
    GameEventType.AmmoExplosion,
    {
      unitId,
      location,
      damage,
      source: 'CritInduced',
    } satisfies IAmmoExplosionPayload,
    overrides,
  );
}

export function heatEffectEvent(
  unitId: string,
  effect: IHeatEffectAppliedPayload['effect'],
  heatLevel: number,
  overrides?: Partial<IGameEvent>,
): IGameEvent {
  return createEvent(
    GameEventType.HeatEffectApplied,
    {
      unitId,
      threshold: 30,
      effect,
      heatLevel,
    } satisfies IHeatEffectAppliedPayload,
    { phase: GamePhase.Heat, ...overrides },
  );
}

export function pilotHitEvent(
  unitId: string,
  consciousnessCheckPassed: boolean | undefined,
  overrides?: Partial<IGameEvent>,
): IGameEvent {
  return createEvent(
    GameEventType.PilotHit,
    {
      unitId,
      wounds: 1,
      totalWounds: 1,
      source: 'head_hit',
      consciousnessCheckRequired: true,
      consciousnessCheckPassed,
    } satisfies IPilotHitPayload,
    overrides,
  );
}

// =============================================================================
// Tests
// =============================================================================

export interface KeyMomentDetectorTestContext {
  readonly getDetector: () => KeyMomentDetector;
}

export { KeyMomentDetector, GameEventType, GamePhase, GameSide };
export type { BattleState, BattleUnit, IGameEvent };
