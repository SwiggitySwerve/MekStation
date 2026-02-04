/**
 * Tests for KeyMomentDetector
 *
 * Covers all 18 key moment types across 3 tiers with edge cases.
 */

import {
  KeyMomentDetector,
  type BattleState,
  type BattleUnit,
  type ICriticalHitPayload,
  type IAmmoExplosionPayload,
  type IHeatEffectAppliedPayload,
} from '../KeyMomentDetector';
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
} from '@/types/gameplay/GameSessionInterfaces';

// =============================================================================
// Test Helpers
// =============================================================================

let sequenceCounter = 0;

function resetSequence(): void {
  sequenceCounter = 0;
}

function createEvent(
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
    // eslint-disable-next-line no-restricted-syntax
    payload: payload as unknown as GameEventPayload,
  };
}

function createBattleUnit(overrides: Partial<BattleUnit> & { id: string }): BattleUnit {
  return {
    name: overrides.id,
    side: GameSide.Player,
    bv: 1000,
    weaponIds: ['ac20', 'ml1', 'ml2'],
    initialArmor: { head: 9, ct: 25, lt: 20, rt: 20, la: 15, ra: 15, ll: 15, rl: 15 },
    initialStructure: { head: 3, ct: 16, lt: 12, rt: 12, la: 8, ra: 8, ll: 10, rl: 10 },
    ...overrides,
  };
}

function createStandardBattleState(): BattleState {
  return {
    units: [
      createBattleUnit({ id: 'atlas', name: 'Atlas AS7-D', side: GameSide.Player, bv: 1800 }),
      createBattleUnit({ id: 'marauder', name: 'Marauder MAD-3R', side: GameSide.Player, bv: 1200 }),
      createBattleUnit({ id: 'hunchback', name: 'Hunchback HBK-4G', side: GameSide.Player, bv: 900 }),
      createBattleUnit({ id: 'timberwolf', name: 'Timber Wolf Prime', side: GameSide.Opponent, bv: 2000 }),
      createBattleUnit({ id: 'madcat', name: 'Mad Cat Mk II', side: GameSide.Opponent, bv: 1500 }),
      createBattleUnit({ id: 'stormcrow', name: 'Storm Crow Prime', side: GameSide.Opponent, bv: 800 }),
    ],
  };
}

function unitDestroyedEvent(
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

function damageAppliedEvent(
  unitId: string,
  location: string,
  damage: number,
  armorRemaining: number,
  structureRemaining: number,
  opts?: { sourceUnitId?: string; locationDestroyed?: boolean },
  overrides?: Partial<IGameEvent>,
): IGameEvent {
  return createEvent(
    GameEventType.DamageApplied,
    {
      unitId,
      location,
      damage,
      armorRemaining,
      structureRemaining,
      locationDestroyed: opts?.locationDestroyed ?? false,
      sourceUnitId: opts?.sourceUnitId,
    } satisfies IDamageAppliedPayload,
    overrides,
  );
}

function attackResolvedEvent(
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

function criticalHitEvent(
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

function ammoExplosionEvent(
  unitId: string,
  location: string,
  damage: number,
  overrides?: Partial<IGameEvent>,
): IGameEvent {
  return createEvent(
    GameEventType.AmmoExplosion,
    { unitId, location, damage } satisfies IAmmoExplosionPayload,
    overrides,
  );
}

function heatEffectEvent(
  unitId: string,
  effect: 'shutdown' | 'ammo-explosion' | 'modifier',
  heat: number,
  overrides?: Partial<IGameEvent>,
): IGameEvent {
  return createEvent(
    GameEventType.HeatEffectApplied,
    { unitId, effect, heat } satisfies IHeatEffectAppliedPayload,
    { phase: GamePhase.Heat, ...overrides },
  );
}

function pilotHitEvent(
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

describe('KeyMomentDetector', () => {
  let detector: KeyMomentDetector;

  beforeEach(() => {
    detector = new KeyMomentDetector();
    resetSequence();
  });

  // ===========================================================================
  // Tier 1 - Game-Changing Events
  // ===========================================================================

  describe('Tier 1 - Game-Changing Events', () => {
    describe('first-blood', () => {
      it('detects first unit destroyed', () => {
        const state = createStandardBattleState();
        const events = [unitDestroyedEvent('timberwolf', 'atlas')];

        const moments = detector.detect(events, state);

        const firstBlood = moments.find((m) => m.type === 'first-blood');
        expect(firstBlood).toBeDefined();
        expect(firstBlood!.tier).toBe(1);
        expect(firstBlood!.type).toBe('first-blood');
      });

      it('ignores subsequent destructions for first-blood', () => {
        const state = createStandardBattleState();
        const events = [
          unitDestroyedEvent('timberwolf', 'atlas'),
          unitDestroyedEvent('madcat', 'marauder'),
        ];

        const moments = detector.detect(events, state);

        const firstBloods = moments.filter((m) => m.type === 'first-blood');
        expect(firstBloods).toHaveLength(1);
      });

      it('includes correct related units', () => {
        const state = createStandardBattleState();
        const events = [unitDestroyedEvent('timberwolf', 'atlas')];

        const moments = detector.detect(events, state);

        const firstBlood = moments.find((m) => m.type === 'first-blood');
        expect(firstBlood!.relatedUnitIds).toContain('atlas');
        expect(firstBlood!.relatedUnitIds).toContain('timberwolf');
      });

      it('handles first-blood without killer', () => {
        const state = createStandardBattleState();
        const events = [unitDestroyedEvent('timberwolf')];

        const moments = detector.detect(events, state);

        const firstBlood = moments.find((m) => m.type === 'first-blood');
        expect(firstBlood).toBeDefined();
        expect(firstBlood!.relatedUnitIds).toContain('timberwolf');
      });
    });

    describe('bv-swing-major', () => {
      it('detects >30% BV swing after unit destruction', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({ id: 'p1', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'p2', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 1000 }),
            createBattleUnit({ id: 'o2', side: GameSide.Opponent, bv: 1000 }),
          ],
        };
        // Initial advantage: 0%. After o1 destroyed: (2000-1000)/3000 = 33% swing
        const events = [unitDestroyedEvent('o1', 'p1')];

        const moments = detector.detect(events, state);

        const swing = moments.find((m) => m.type === 'bv-swing-major');
        expect(swing).toBeDefined();
        expect(swing!.tier).toBe(1);
      });

      it('ignores swings under 30%', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({ id: 'p1', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'p2', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'p3', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'p4', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 1000 }),
            createBattleUnit({ id: 'o2', side: GameSide.Opponent, bv: 1000 }),
            createBattleUnit({ id: 'o3', side: GameSide.Opponent, bv: 1000 }),
            createBattleUnit({ id: 'o4', side: GameSide.Opponent, bv: 1000 }),
          ],
        };
        // Initial: 0%. After o1 destroyed: (4000-3000)/7000 = ~14% swing
        const events = [unitDestroyedEvent('o1', 'p1')];

        const moments = detector.detect(events, state);

        const swing = moments.find((m) => m.type === 'bv-swing-major');
        expect(swing).toBeUndefined();
      });

      it('includes BV metadata', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({ id: 'p1', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 1000 }),
          ],
        };
        const events = [unitDestroyedEvent('o1', 'p1')];

        const moments = detector.detect(events, state);

        const swing = moments.find((m) => m.type === 'bv-swing-major');
        expect(swing).toBeDefined();
        expect(swing!.metadata).toBeDefined();
        expect(swing!.metadata!.swingPercent).toBeDefined();
      });
    });

    describe('comeback', () => {
      it('detects comeback from 2:1 BV disadvantage', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({ id: 'p1', side: GameSide.Player, bv: 500 }),
            createBattleUnit({ id: 'p2', side: GameSide.Player, bv: 500 }),
            createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 1000 }),
            createBattleUnit({ id: 'o2', side: GameSide.Opponent, bv: 1500 }),
          ],
        };
        // Player ratio starts at 1000/2500 = 0.4 (<0.5)
        // After destroying o2: 1000/1000 = 1.0 (not > 1.0)
        // After destroying o1: 1000/0 = Infinity (> 1.0)
        const events = [
          unitDestroyedEvent('o2', 'p1'),
          unitDestroyedEvent('o1', 'p2'),
        ];

        const moments = detector.detect(events, state);

        const comeback = moments.find((m) => m.type === 'comeback');
        expect(comeback).toBeDefined();
        expect(comeback!.tier).toBe(1);
      });

      it('does not detect comeback without prior disadvantage', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({ id: 'p1', side: GameSide.Player, bv: 2000 }),
            createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 1000 }),
          ],
        };
        // Player ratio starts at 2.0, never drops below 0.5
        const events = [unitDestroyedEvent('o1', 'p1')];

        const moments = detector.detect(events, state);

        const comeback = moments.find((m) => m.type === 'comeback');
        expect(comeback).toBeUndefined();
      });
    });

    describe('wipe', () => {
      it('detects team elimination', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({ id: 'p1', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 1000 }),
            createBattleUnit({ id: 'o2', side: GameSide.Opponent, bv: 1000 }),
          ],
        };
        const events = [
          unitDestroyedEvent('o1', 'p1'),
          unitDestroyedEvent('o2', 'p1'),
        ];

        const moments = detector.detect(events, state);

        const wipe = moments.find((m) => m.type === 'wipe');
        expect(wipe).toBeDefined();
        expect(wipe!.tier).toBe(1);
        expect(wipe!.relatedUnitIds).toContain('o1');
        expect(wipe!.relatedUnitIds).toContain('o2');
      });

      it('does not trigger until all team units destroyed', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({ id: 'p1', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 1000 }),
            createBattleUnit({ id: 'o2', side: GameSide.Opponent, bv: 1000 }),
          ],
        };
        const events = [unitDestroyedEvent('o1', 'p1')];

        const moments = detector.detect(events, state);

        const wipe = moments.find((m) => m.type === 'wipe');
        expect(wipe).toBeUndefined();
      });
    });

    describe('last-stand', () => {
      it('detects single unit vs 3+ enemies', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({ id: 'p1', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'p2', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'p3', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 1000 }),
            createBattleUnit({ id: 'o2', side: GameSide.Opponent, bv: 1000 }),
            createBattleUnit({ id: 'o3', side: GameSide.Opponent, bv: 1000 }),
            createBattleUnit({ id: 'o4', side: GameSide.Opponent, bv: 1000 }),
          ],
        };
        const events = [
          unitDestroyedEvent('p1', 'o1'),
          unitDestroyedEvent('p2', 'o2'),
        ];

        const moments = detector.detect(events, state);

        const lastStand = moments.find((m) => m.type === 'last-stand');
        expect(lastStand).toBeDefined();
        expect(lastStand!.tier).toBe(1);
        expect(lastStand!.relatedUnitIds).toContain('p3');
      });

      it('does not trigger for 1 vs 2', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({ id: 'p1', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'p2', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 1000 }),
            createBattleUnit({ id: 'o2', side: GameSide.Opponent, bv: 1000 }),
          ],
        };
        const events = [unitDestroyedEvent('p1', 'o1')];

        const moments = detector.detect(events, state);

        const lastStand = moments.find((m) => m.type === 'last-stand');
        expect(lastStand).toBeUndefined();
      });

      it('only triggers once per unit', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({ id: 'p1', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'p2', side: GameSide.Player, bv: 1000 }),
            createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 1000 }),
            createBattleUnit({ id: 'o2', side: GameSide.Opponent, bv: 1000 }),
            createBattleUnit({ id: 'o3', side: GameSide.Opponent, bv: 1000 }),
            createBattleUnit({ id: 'o4', side: GameSide.Opponent, bv: 1000 }),
          ],
        };
        // p1 destroyed: p2 alone vs 4 → last stand
        // o1 destroyed: p2 alone vs 3 → same unit, should not trigger again
        const events = [
          unitDestroyedEvent('p1', 'o1'),
          unitDestroyedEvent('o1', 'p2'),
        ];

        const moments = detector.detect(events, state);

        const lastStands = moments.filter((m) => m.type === 'last-stand');
        expect(lastStands).toHaveLength(1);
      });
    });

    describe('ace-kill', () => {
      it('detects unit with 3+ kills', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({ id: 'ace', name: 'Ace Mech', side: GameSide.Player, bv: 2000 }),
            createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 500 }),
            createBattleUnit({ id: 'o2', side: GameSide.Opponent, bv: 500 }),
            createBattleUnit({ id: 'o3', side: GameSide.Opponent, bv: 500 }),
          ],
        };
        const events = [
          unitDestroyedEvent('o1', 'ace'),
          unitDestroyedEvent('o2', 'ace'),
          unitDestroyedEvent('o3', 'ace'),
        ];

        const moments = detector.detect(events, state);

        const aceKill = moments.find((m) => m.type === 'ace-kill');
        expect(aceKill).toBeDefined();
        expect(aceKill!.tier).toBe(1);
        expect(aceKill!.description).toContain('Ace Mech');
        expect(aceKill!.metadata?.kills).toBe(3);
      });

      it('does not trigger with only 2 kills', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({ id: 'ace', side: GameSide.Player, bv: 2000 }),
            createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 500 }),
            createBattleUnit({ id: 'o2', side: GameSide.Opponent, bv: 500 }),
          ],
        };
        const events = [
          unitDestroyedEvent('o1', 'ace'),
          unitDestroyedEvent('o2', 'ace'),
        ];

        const moments = detector.detect(events, state);

        const aceKill = moments.find((m) => m.type === 'ace-kill');
        expect(aceKill).toBeUndefined();
      });

      it('only triggers once per ace', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({ id: 'ace', side: GameSide.Player, bv: 2000 }),
            createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 300 }),
            createBattleUnit({ id: 'o2', side: GameSide.Opponent, bv: 300 }),
            createBattleUnit({ id: 'o3', side: GameSide.Opponent, bv: 300 }),
            createBattleUnit({ id: 'o4', side: GameSide.Opponent, bv: 300 }),
          ],
        };
        const events = [
          unitDestroyedEvent('o1', 'ace'),
          unitDestroyedEvent('o2', 'ace'),
          unitDestroyedEvent('o3', 'ace'),
          unitDestroyedEvent('o4', 'ace'),
        ];

        const moments = detector.detect(events, state);

        const aceKills = moments.filter((m) => m.type === 'ace-kill');
        expect(aceKills).toHaveLength(1);
      });
    });
  });

  // ===========================================================================
  // Tier 2 - Significant Tactical Events
  // ===========================================================================

  describe('Tier 2 - Significant Tactical Events', () => {
    describe('head-shot', () => {
      it('detects damage to head location', () => {
        const state = createStandardBattleState();
        const events = [
          damageAppliedEvent('timberwolf', 'head', 10, 0, 2, { sourceUnitId: 'atlas' }),
        ];

        const moments = detector.detect(events, state);

        const headShot = moments.find((m) => m.type === 'head-shot');
        expect(headShot).toBeDefined();
        expect(headShot!.tier).toBe(2);
        expect(headShot!.relatedUnitIds).toContain('atlas');
        expect(headShot!.relatedUnitIds).toContain('timberwolf');
      });

      it('allows multiple head shots', () => {
        const state = createStandardBattleState();
        const events = [
          damageAppliedEvent('timberwolf', 'head', 5, 4, 3, { sourceUnitId: 'atlas' }),
          damageAppliedEvent('madcat', 'head', 8, 1, 3, { sourceUnitId: 'marauder' }),
        ];

        const moments = detector.detect(events, state);

        const headShots = moments.filter((m) => m.type === 'head-shot');
        expect(headShots).toHaveLength(2);
      });

      it('ignores damage to non-head locations', () => {
        const state = createStandardBattleState();
        const events = [
          damageAppliedEvent('timberwolf', 'ct', 20, 5, 16, { sourceUnitId: 'atlas' }),
        ];

        const moments = detector.detect(events, state);

        const headShot = moments.find((m) => m.type === 'head-shot');
        expect(headShot).toBeUndefined();
      });
    });

    describe('ammo-explosion', () => {
      it('detects ammo explosion event', () => {
        const state = createStandardBattleState();
        const events = [ammoExplosionEvent('timberwolf', 'lt', 20)];

        const moments = detector.detect(events, state);

        const ammoExp = moments.find((m) => m.type === 'ammo-explosion');
        expect(ammoExp).toBeDefined();
        expect(ammoExp!.tier).toBe(2);
        expect(ammoExp!.relatedUnitIds).toContain('timberwolf');
      });

      it('includes location and damage metadata', () => {
        const state = createStandardBattleState();
        const events = [ammoExplosionEvent('timberwolf', 'rt', 30)];

        const moments = detector.detect(events, state);

        const ammoExp = moments.find((m) => m.type === 'ammo-explosion');
        expect(ammoExp!.metadata?.location).toBe('rt');
        expect(ammoExp!.metadata?.damage).toBe(30);
      });
    });

    describe('pilot-kill', () => {
      it('detects consciousness check failure', () => {
        const state = createStandardBattleState();
        const events = [pilotHitEvent('timberwolf', false)];

        const moments = detector.detect(events, state);

        const pilotKill = moments.find((m) => m.type === 'pilot-kill');
        expect(pilotKill).toBeDefined();
        expect(pilotKill!.tier).toBe(2);
      });

      it('ignores successful consciousness checks', () => {
        const state = createStandardBattleState();
        const events = [pilotHitEvent('timberwolf', true)];

        const moments = detector.detect(events, state);

        const pilotKill = moments.find((m) => m.type === 'pilot-kill');
        expect(pilotKill).toBeUndefined();
      });

      it('ignores hits without consciousness check result', () => {
        const state = createStandardBattleState();
        const events = [pilotHitEvent('timberwolf', undefined)];

        const moments = detector.detect(events, state);

        const pilotKill = moments.find((m) => m.type === 'pilot-kill');
        expect(pilotKill).toBeUndefined();
      });
    });

    describe('critical-engine', () => {
      it('detects engine critical hit', () => {
        const state = createStandardBattleState();
        const events = [criticalHitEvent('timberwolf', 'ct', 'engine', 'atlas')];

        const moments = detector.detect(events, state);

        const engineCrit = moments.find((m) => m.type === 'critical-engine');
        expect(engineCrit).toBeDefined();
        expect(engineCrit!.tier).toBe(2);
        expect(engineCrit!.relatedUnitIds).toContain('atlas');
        expect(engineCrit!.relatedUnitIds).toContain('timberwolf');
      });

      it('ignores non-engine criticals', () => {
        const state = createStandardBattleState();
        const events = [criticalHitEvent('timberwolf', 'ct', 'heat_sink', 'atlas')];

        const moments = detector.detect(events, state);

        const engineCrit = moments.find((m) => m.type === 'critical-engine');
        expect(engineCrit).toBeUndefined();
      });
    });

    describe('critical-gyro', () => {
      it('detects gyro critical hit', () => {
        const state = createStandardBattleState();
        const events = [criticalHitEvent('timberwolf', 'ct', 'gyro', 'atlas')];

        const moments = detector.detect(events, state);

        const gyroCrit = moments.find((m) => m.type === 'critical-gyro');
        expect(gyroCrit).toBeDefined();
        expect(gyroCrit!.tier).toBe(2);
      });
    });

    describe('alpha-strike', () => {
      it('detects when unit fires all weapons in one turn', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({
              id: 'alpha',
              name: 'Alpha Mech',
              side: GameSide.Player,
              weaponIds: ['ac20', 'ml1', 'ml2'],
            }),
            createBattleUnit({ id: 'target', side: GameSide.Opponent }),
          ],
        };
        const events = [
          attackResolvedEvent('alpha', 'target', 'ac20', true, { turn: 1 }),
          attackResolvedEvent('alpha', 'target', 'ml1', true, { turn: 1 }),
          attackResolvedEvent('alpha', 'target', 'ml2', true, { turn: 1 }),
        ];

        const moments = detector.detect(events, state);

        const alphaStrike = moments.find((m) => m.type === 'alpha-strike');
        expect(alphaStrike).toBeDefined();
        expect(alphaStrike!.tier).toBe(2);
        expect(alphaStrike!.description).toContain('3 weapons');
      });

      it('does not trigger with partial weapon fire', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({
              id: 'alpha',
              side: GameSide.Player,
              weaponIds: ['ac20', 'ml1', 'ml2'],
            }),
            createBattleUnit({ id: 'target', side: GameSide.Opponent }),
          ],
        };
        const events = [
          attackResolvedEvent('alpha', 'target', 'ac20', true, { turn: 1 }),
          attackResolvedEvent('alpha', 'target', 'ml1', true, { turn: 1 }),
        ];

        const moments = detector.detect(events, state);

        const alphaStrike = moments.find((m) => m.type === 'alpha-strike');
        expect(alphaStrike).toBeUndefined();
      });

      it('tracks weapons per turn independently', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({
              id: 'alpha',
              side: GameSide.Player,
              weaponIds: ['ac20', 'ml1'],
            }),
            createBattleUnit({ id: 'target', side: GameSide.Opponent }),
          ],
        };
        const events = [
          attackResolvedEvent('alpha', 'target', 'ac20', true, { turn: 1 }),
          attackResolvedEvent('alpha', 'target', 'ml1', true, { turn: 2 }),
        ];

        const moments = detector.detect(events, state);

        const alphaStrike = moments.find((m) => m.type === 'alpha-strike');
        expect(alphaStrike).toBeUndefined();
      });
    });

    describe('focus-fire', () => {
      it('detects 3+ attackers on same target in one turn', () => {
        const state = createStandardBattleState();
        const events = [
          attackResolvedEvent('atlas', 'timberwolf', 'ac20', true, { turn: 1 }),
          attackResolvedEvent('marauder', 'timberwolf', 'ppc', true, { turn: 1 }),
          attackResolvedEvent('hunchback', 'timberwolf', 'ac20', true, { turn: 1 }),
        ];

        const moments = detector.detect(events, state);

        const focusFire = moments.find((m) => m.type === 'focus-fire');
        expect(focusFire).toBeDefined();
        expect(focusFire!.tier).toBe(2);
        expect(focusFire!.relatedUnitIds).toContain('timberwolf');
      });

      it('does not trigger with fewer than 3 attackers', () => {
        const state = createStandardBattleState();
        const events = [
          attackResolvedEvent('atlas', 'timberwolf', 'ac20', true, { turn: 1 }),
          attackResolvedEvent('marauder', 'timberwolf', 'ppc', true, { turn: 1 }),
        ];

        const moments = detector.detect(events, state);

        const focusFire = moments.find((m) => m.type === 'focus-fire');
        expect(focusFire).toBeUndefined();
      });

      it('only triggers once per target per turn', () => {
        const state = createStandardBattleState();
        const events = [
          attackResolvedEvent('atlas', 'timberwolf', 'ac20', true, { turn: 1 }),
          attackResolvedEvent('marauder', 'timberwolf', 'ppc', true, { turn: 1 }),
          attackResolvedEvent('hunchback', 'timberwolf', 'ac20', true, { turn: 1 }),
          attackResolvedEvent('atlas', 'timberwolf', 'ml1', true, { turn: 1 }),
        ];

        const moments = detector.detect(events, state);

        const focusFires = moments.filter((m) => m.type === 'focus-fire');
        expect(focusFires).toHaveLength(1);
      });

      it('tracks targets per turn independently', () => {
        const state = createStandardBattleState();
        const events = [
          attackResolvedEvent('atlas', 'timberwolf', 'ac20', true, { turn: 1 }),
          attackResolvedEvent('marauder', 'timberwolf', 'ppc', true, { turn: 1 }),
          attackResolvedEvent('hunchback', 'timberwolf', 'ac20', true, { turn: 2 }),
        ];

        const moments = detector.detect(events, state);

        const focusFire = moments.find((m) => m.type === 'focus-fire');
        expect(focusFire).toBeUndefined();
      });
    });
  });

  // ===========================================================================
  // Tier 3 - Notable Routine Events
  // ===========================================================================

  describe('Tier 3 - Notable Routine Events', () => {
    describe('heat-crisis', () => {
      it('detects heat shutdown', () => {
        const state = createStandardBattleState();
        const events = [heatEffectEvent('atlas', 'shutdown', 35)];

        const moments = detector.detect(events, state);

        const heatCrisis = moments.find((m) => m.type === 'heat-crisis');
        expect(heatCrisis).toBeDefined();
        expect(heatCrisis!.tier).toBe(3);
        expect(heatCrisis!.metadata?.heat).toBe(35);
      });

      it('ignores non-shutdown heat effects', () => {
        const state = createStandardBattleState();
        const events = [heatEffectEvent('atlas', 'modifier', 20)];

        const moments = detector.detect(events, state);

        const heatCrisis = moments.find((m) => m.type === 'heat-crisis');
        expect(heatCrisis).toBeUndefined();
      });
    });

    describe('mobility-kill', () => {
      it('detects leg actuator critical hit', () => {
        const state = createStandardBattleState();
        const events = [criticalHitEvent('timberwolf', 'left_leg', 'hip', 'atlas')];

        const moments = detector.detect(events, state);

        const mobilityKill = moments.find((m) => m.type === 'mobility-kill');
        expect(mobilityKill).toBeDefined();
        expect(mobilityKill!.tier).toBe(3);
      });

      it('detects various leg actuator types', () => {
        const state = createStandardBattleState();
        const events = [
          criticalHitEvent('timberwolf', 'right_leg', 'upper_leg_actuator', 'atlas'),
        ];

        const moments = detector.detect(events, state);

        const mobilityKill = moments.find((m) => m.type === 'mobility-kill');
        expect(mobilityKill).toBeDefined();
      });

      it('only triggers once per unit', () => {
        const state = createStandardBattleState();
        const events = [
          criticalHitEvent('timberwolf', 'left_leg', 'hip', 'atlas'),
          criticalHitEvent('timberwolf', 'right_leg', 'lower_leg_actuator', 'atlas'),
        ];

        const moments = detector.detect(events, state);

        const mobilityKills = moments.filter((m) => m.type === 'mobility-kill');
        expect(mobilityKills).toHaveLength(1);
      });

      it('ignores non-leg actuator crits', () => {
        const state = createStandardBattleState();
        const events = [criticalHitEvent('timberwolf', 'ct', 'heat_sink', 'atlas')];

        const moments = detector.detect(events, state);

        const mobilityKill = moments.find((m) => m.type === 'mobility-kill');
        expect(mobilityKill).toBeUndefined();
      });
    });

    describe('weapons-kill', () => {
      it('detects all weapons destroyed', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({
              id: 'target',
              name: 'Disarmed Mech',
              side: GameSide.Opponent,
              weaponIds: ['ac20', 'ml1'],
            }),
            createBattleUnit({ id: 'attacker', side: GameSide.Player }),
          ],
        };
        const events = [
          criticalHitEvent('target', 'ra', 'ac20', 'attacker'),
          criticalHitEvent('target', 'la', 'ml1', 'attacker'),
        ];

        const moments = detector.detect(events, state);

        const weaponsKill = moments.find((m) => m.type === 'weapons-kill');
        expect(weaponsKill).toBeDefined();
        expect(weaponsKill!.tier).toBe(3);
        expect(weaponsKill!.description).toContain('Disarmed Mech');
      });

      it('does not trigger until all weapons destroyed', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({
              id: 'target',
              side: GameSide.Opponent,
              weaponIds: ['ac20', 'ml1', 'ml2'],
            }),
            createBattleUnit({ id: 'attacker', side: GameSide.Player }),
          ],
        };
        const events = [
          criticalHitEvent('target', 'ra', 'ac20', 'attacker'),
          criticalHitEvent('target', 'la', 'ml1', 'attacker'),
        ];

        const moments = detector.detect(events, state);

        const weaponsKill = moments.find((m) => m.type === 'weapons-kill');
        expect(weaponsKill).toBeUndefined();
      });

      it('only triggers once per unit', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({
              id: 'target',
              side: GameSide.Opponent,
              weaponIds: ['ac20'],
            }),
            createBattleUnit({ id: 'attacker', side: GameSide.Player }),
          ],
        };
        const events = [
          criticalHitEvent('target', 'ra', 'ac20', 'attacker'),
          criticalHitEvent('target', 'ra', 'ac20', 'attacker'),
        ];

        const moments = detector.detect(events, state);

        const weaponsKills = moments.filter((m) => m.type === 'weapons-kill');
        expect(weaponsKills).toHaveLength(1);
      });
    });

    describe('rear-arc-hit', () => {
      it('detects attack from rear arc', () => {
        const state = createStandardBattleState();
        const events = [
          attackResolvedEvent('atlas', 'timberwolf', 'ac20', true, undefined, {
            attackerFacing: 'rear',
          }),
        ];

        const moments = detector.detect(events, state);

        const rearArc = moments.find((m) => m.type === 'rear-arc-hit');
        expect(rearArc).toBeDefined();
        expect(rearArc!.tier).toBe(3);
      });

      it('ignores front arc attacks', () => {
        const state = createStandardBattleState();
        const events = [
          attackResolvedEvent('atlas', 'timberwolf', 'ac20', true, undefined, {
            attackerFacing: 'front',
          }),
        ];

        const moments = detector.detect(events, state);

        const rearArc = moments.find((m) => m.type === 'rear-arc-hit');
        expect(rearArc).toBeUndefined();
      });

      it('ignores attacks without facing info', () => {
        const state = createStandardBattleState();
        const events = [attackResolvedEvent('atlas', 'timberwolf', 'ac20', true)];

        const moments = detector.detect(events, state);

        const rearArc = moments.find((m) => m.type === 'rear-arc-hit');
        expect(rearArc).toBeUndefined();
      });
    });

    describe('overkill', () => {
      it('detects damage exceeding 2x remaining structure', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({
              id: 'target',
              side: GameSide.Opponent,
              initialArmor: { ct: 0 },
              initialStructure: { ct: 5 },
            }),
            createBattleUnit({ id: 'attacker', side: GameSide.Player }),
          ],
        };
        // Armor is 0, structure is 5, damage is 20 → 20 > 2*5 = 10 → overkill
        const events = [
          damageAppliedEvent('target', 'ct', 20, 0, 0, {
            sourceUnitId: 'attacker',
            locationDestroyed: true,
          }),
        ];

        const moments = detector.detect(events, state);

        const overkill = moments.find((m) => m.type === 'overkill');
        expect(overkill).toBeDefined();
        expect(overkill!.tier).toBe(3);
      });

      it('does not trigger for normal damage', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({
              id: 'target',
              side: GameSide.Opponent,
              initialArmor: { ct: 20 },
              initialStructure: { ct: 16 },
            }),
            createBattleUnit({ id: 'attacker', side: GameSide.Player }),
          ],
        };
        // Armor is 20, structure is 16. Damage is 10. damageToStructure = max(0, 10-20) = 0
        const events = [
          damageAppliedEvent('target', 'ct', 10, 10, 16, { sourceUnitId: 'attacker' }),
        ];

        const moments = detector.detect(events, state);

        const overkill = moments.find((m) => m.type === 'overkill');
        expect(overkill).toBeUndefined();
      });

      it('accounts for armor when calculating overkill', () => {
        const state: BattleState = {
          units: [
            createBattleUnit({
              id: 'target',
              side: GameSide.Opponent,
              initialArmor: { ct: 5 },
              initialStructure: { ct: 10 },
            }),
            createBattleUnit({ id: 'attacker', side: GameSide.Player }),
          ],
        };
        // Armor is 5, structure is 10. Damage is 15. damageToStructure = 15-5 = 10. 10 > 2*10 = 20? No
        const events = [
          damageAppliedEvent('target', 'ct', 15, 0, 0, {
            sourceUnitId: 'attacker',
            locationDestroyed: true,
          }),
        ];

        const moments = detector.detect(events, state);

        const overkill = moments.find((m) => m.type === 'overkill');
        expect(overkill).toBeUndefined();
      });
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles empty event stream', () => {
      const state = createStandardBattleState();

      const moments = detector.detect([], state);

      expect(moments).toEqual([]);
    });

    it('handles empty battle state', () => {
      const state: BattleState = { units: [] };
      const events = [
        createEvent(GameEventType.TurnStarted, {}, { turn: 1 }),
      ];

      const moments = detector.detect(events, state);

      expect(moments).toEqual([]);
    });

    it('handles multiple moments in same turn', () => {
      const state: BattleState = {
        units: [
          createBattleUnit({ id: 'p1', side: GameSide.Player, bv: 1000 }),
          createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 1000 }),
        ],
      };
      const events = [
        ammoExplosionEvent('o1', 'lt', 20, { turn: 5 }),
        unitDestroyedEvent('o1', 'p1', { turn: 5 }),
      ];

      const moments = detector.detect(events, state);

      expect(moments.length).toBeGreaterThan(1);
      const turn5Moments = moments.filter((m) => m.turn === 5);
      expect(turn5Moments.length).toBeGreaterThan(1);
    });

    it('deduplicates identical moments', () => {
      const state = createStandardBattleState();
      // Two head shots on same unit in same turn by same attacker produce distinct events
      const events = [
        damageAppliedEvent('timberwolf', 'head', 5, 4, 3, { sourceUnitId: 'atlas' }, { turn: 1 }),
        damageAppliedEvent('timberwolf', 'head', 5, 0, 2, { sourceUnitId: 'atlas' }, { turn: 1 }),
      ];

      const moments = detector.detect(events, state);

      const headShots = moments.filter((m) => m.type === 'head-shot');
      // Same type, same turn, same related units → deduplicated to 1
      expect(headShots).toHaveLength(1);
    });

    it('generates unique moment IDs', () => {
      const state = createStandardBattleState();
      const events = [
        damageAppliedEvent('timberwolf', 'head', 5, 4, 3, { sourceUnitId: 'atlas' }, { turn: 1 }),
        ammoExplosionEvent('madcat', 'lt', 20, { turn: 1 }),
        unitDestroyedEvent('stormcrow', 'marauder', { turn: 2 }),
      ];

      const moments = detector.detect(events, state);

      const ids = moments.map((m) => m.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('assigns correct tier to each moment type', () => {
      const tier1Types = new Set([
        'first-blood', 'bv-swing-major', 'comeback', 'wipe', 'last-stand', 'ace-kill',
      ]);
      const tier2Types = new Set([
        'head-shot', 'ammo-explosion', 'pilot-kill', 'critical-engine',
        'critical-gyro', 'alpha-strike', 'focus-fire',
      ]);
      const tier3Types = new Set([
        'heat-crisis', 'mobility-kill', 'weapons-kill', 'rear-arc-hit', 'overkill',
      ]);

      const state: BattleState = {
        units: [
          createBattleUnit({
            id: 'p1', side: GameSide.Player, bv: 1000,
            weaponIds: ['ac20'],
          }),
          createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 1000, weaponIds: ['ppc'] }),
        ],
      };

      const events = [
        damageAppliedEvent('o1', 'head', 5, 4, 3, { sourceUnitId: 'p1' }),
        ammoExplosionEvent('o1', 'lt', 20),
        criticalHitEvent('o1', 'ct', 'engine', 'p1'),
        criticalHitEvent('o1', 'ct', 'gyro', 'p1'),
        criticalHitEvent('o1', 'left_leg', 'hip', 'p1'),
        criticalHitEvent('o1', 'ra', 'ppc', 'p1'),
        heatEffectEvent('p1', 'shutdown', 35),
        unitDestroyedEvent('o1', 'p1'),
      ];

      const moments = detector.detect(events, state);

      for (const moment of moments) {
        if (tier1Types.has(moment.type)) {
          expect(moment.tier).toBe(1);
        } else if (tier2Types.has(moment.type)) {
          expect(moment.tier).toBe(2);
        } else if (tier3Types.has(moment.type)) {
          expect(moment.tier).toBe(3);
        }
      }
    });

    it('ignores unrecognized event types', () => {
      const state = createStandardBattleState();
      const events = [
        createEvent(GameEventType.TurnStarted, {}, { turn: 1 }),
        createEvent(GameEventType.PhaseChanged, { fromPhase: 'initiative', toPhase: 'movement' }),
        createEvent(GameEventType.MovementDeclared, {
          unitId: 'atlas', from: { q: 0, r: 0 }, to: { q: 1, r: 0 },
          facing: 0, movementType: 'walk', mpUsed: 3, heatGenerated: 0,
        }),
      ];

      const moments = detector.detect(events, state);

      expect(moments).toEqual([]);
    });

    it('handles events from units not in battle state', () => {
      const state: BattleState = {
        units: [
          createBattleUnit({ id: 'p1', side: GameSide.Player }),
        ],
      };
      const events = [
        damageAppliedEvent('unknown_unit', 'head', 10, 0, 0, { sourceUnitId: 'p1' }),
      ];

      // Should not throw
      const moments = detector.detect(events, state);
      expect(moments).toBeDefined();
    });

    it('processes events in sequence order', () => {
      const state: BattleState = {
        units: [
          createBattleUnit({ id: 'p1', side: GameSide.Player, bv: 2000 }),
          createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 500 }),
          createBattleUnit({ id: 'o2', side: GameSide.Opponent, bv: 500 }),
          createBattleUnit({ id: 'o3', side: GameSide.Opponent, bv: 500 }),
        ],
      };
      const events = [
        unitDestroyedEvent('o1', 'p1', { turn: 1 }),
        unitDestroyedEvent('o2', 'p1', { turn: 2 }),
        unitDestroyedEvent('o3', 'p1', { turn: 3 }),
      ];

      const moments = detector.detect(events, state);

      const firstBlood = moments.find((m) => m.type === 'first-blood');
      const aceKill = moments.find((m) => m.type === 'ace-kill');
      expect(firstBlood!.turn).toBe(1);
      expect(aceKill!.turn).toBe(3);
    });

    it('handles misses in attack resolution', () => {
      const state = createStandardBattleState();
      const events = [
        attackResolvedEvent('atlas', 'timberwolf', 'ac20', false, { turn: 1 }),
      ];

      const moments = detector.detect(events, state);

      expect(moments).toEqual([]);
    });

    it('handles no detectable moments in normal combat', () => {
      const state = createStandardBattleState();
      const events = [
        createEvent(GameEventType.TurnStarted, {}, { turn: 1 }),
        damageAppliedEvent('timberwolf', 'ct', 10, 15, 16, { sourceUnitId: 'atlas' }),
        damageAppliedEvent('atlas', 'la', 5, 10, 8, { sourceUnitId: 'timberwolf' }),
        createEvent(GameEventType.TurnEnded, {}, { turn: 1 }),
      ];

      const moments = detector.detect(events, state);

      expect(moments).toEqual([]);
    });
  });

  // ===========================================================================
  // Integration Scenarios
  // ===========================================================================

  describe('Integration Scenarios', () => {
    it('detects multiple tier 1 moments in sequence', () => {
      const state: BattleState = {
        units: [
          createBattleUnit({ id: 'ace', name: 'Ace', side: GameSide.Player, bv: 2000 }),
          createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 800 }),
          createBattleUnit({ id: 'o2', side: GameSide.Opponent, bv: 800 }),
          createBattleUnit({ id: 'o3', side: GameSide.Opponent, bv: 800 }),
        ],
      };

      const events = [
        unitDestroyedEvent('o1', 'ace', { turn: 2 }),
        unitDestroyedEvent('o2', 'ace', { turn: 4 }),
        unitDestroyedEvent('o3', 'ace', { turn: 6 }),
      ];

      const moments = detector.detect(events, state);

      expect(moments.find((m) => m.type === 'first-blood')).toBeDefined();
      expect(moments.find((m) => m.type === 'ace-kill')).toBeDefined();
      expect(moments.find((m) => m.type === 'wipe')).toBeDefined();
    });

    it('detects tier 2 events alongside tier 1', () => {
      const state: BattleState = {
        units: [
          createBattleUnit({ id: 'p1', side: GameSide.Player, bv: 1500 }),
          createBattleUnit({ id: 'o1', side: GameSide.Opponent, bv: 1500, weaponIds: ['ppc'] }),
        ],
      };

      const events = [
        criticalHitEvent('o1', 'ct', 'engine', 'p1', { turn: 3 }),
        damageAppliedEvent('o1', 'head', 10, 0, 0, { sourceUnitId: 'p1' }, { turn: 3 }),
        unitDestroyedEvent('o1', 'p1', { turn: 3 }),
      ];

      const moments = detector.detect(events, state);

      expect(moments.find((m) => m.type === 'critical-engine')).toBeDefined();
      expect(moments.find((m) => m.type === 'head-shot')).toBeDefined();
      expect(moments.find((m) => m.type === 'first-blood')).toBeDefined();
    });

    it('handles a full battle scenario', () => {
      const state: BattleState = {
        units: [
          createBattleUnit({
            id: 'p1', name: 'Atlas', side: GameSide.Player, bv: 1800,
            weaponIds: ['ac20', 'ml1', 'ml2'],
          }),
          createBattleUnit({
            id: 'p2', name: 'Marauder', side: GameSide.Player, bv: 1200,
            weaponIds: ['ppc1', 'ppc2'],
          }),
          createBattleUnit({
            id: 'o1', name: 'Timber Wolf', side: GameSide.Opponent, bv: 2000,
            weaponIds: ['lrm20', 'erl1'],
          }),
          createBattleUnit({
            id: 'o2', name: 'Mad Cat', side: GameSide.Opponent, bv: 1500,
            weaponIds: ['lrm10', 'erl2'],
          }),
        ],
      };

      const events = [
        // Turn 1: Normal combat
        attackResolvedEvent('p1', 'o1', 'ac20', true, { turn: 1 }),
        damageAppliedEvent('o1', 'ct', 20, 5, 16, { sourceUnitId: 'p1' }, { turn: 1 }),

        // Turn 2: Head shot + alpha strike
        attackResolvedEvent('p1', 'o1', 'ac20', true, { turn: 2 }),
        attackResolvedEvent('p1', 'o1', 'ml1', true, { turn: 2 }),
        attackResolvedEvent('p1', 'o1', 'ml2', true, { turn: 2 }),
        damageAppliedEvent('o1', 'head', 5, 4, 3, { sourceUnitId: 'p1' }, { turn: 2 }),

        // Turn 3: Focus fire + destruction
        attackResolvedEvent('p1', 'o2', 'ac20', true, { turn: 3 }),
        attackResolvedEvent('p2', 'o2', 'ppc1', true, { turn: 3 }),
        attackResolvedEvent('p2', 'o2', 'ppc2', true, { turn: 3 }),
        unitDestroyedEvent('o1', 'p1', { turn: 3 }),

        // Turn 4: Wipe
        unitDestroyedEvent('o2', 'p1', { turn: 4 }),
      ];

      const moments = detector.detect(events, state);

      expect(moments.find((m) => m.type === 'head-shot')).toBeDefined();
      expect(moments.find((m) => m.type === 'alpha-strike')).toBeDefined();
      expect(moments.find((m) => m.type === 'first-blood')).toBeDefined();
      expect(moments.find((m) => m.type === 'wipe')).toBeDefined();
      expect(moments.length).toBeGreaterThanOrEqual(4);
    });
  });

  // ===========================================================================
  // Moment Properties
  // ===========================================================================

  describe('Moment Properties', () => {
    it('includes turn number from event', () => {
      const state = createStandardBattleState();
      const events = [unitDestroyedEvent('timberwolf', 'atlas', { turn: 7 })];

      const moments = detector.detect(events, state);

      expect(moments[0].turn).toBe(7);
    });

    it('includes phase from event', () => {
      const state = createStandardBattleState();
      const events = [
        heatEffectEvent('atlas', 'shutdown', 35, { phase: GamePhase.Heat }),
      ];

      const moments = detector.detect(events, state);

      expect(moments[0].phase).toBe(GamePhase.Heat);
    });

    it('includes non-empty description', () => {
      const state = createStandardBattleState();
      const events = [unitDestroyedEvent('timberwolf', 'atlas')];

      const moments = detector.detect(events, state);

      expect(moments[0].description.length).toBeGreaterThan(0);
    });

    it('includes non-empty relatedUnitIds', () => {
      const state = createStandardBattleState();
      const events = [unitDestroyedEvent('timberwolf', 'atlas')];

      const moments = detector.detect(events, state);

      expect(moments[0].relatedUnitIds.length).toBeGreaterThan(0);
    });

    it('includes numeric timestamp', () => {
      const state = createStandardBattleState();
      const events = [unitDestroyedEvent('timberwolf', 'atlas')];

      const moments = detector.detect(events, state);

      expect(typeof moments[0].timestamp).toBe('number');
      expect(moments[0].timestamp).toBeGreaterThan(0);
    });
  });
});
