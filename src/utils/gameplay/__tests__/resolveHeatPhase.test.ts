/**
 * resolveHeatPhase — event-driven heat integration tests.
 *
 * `heatSystem.test.ts` covers `resolveHeatPhase` at the unit level by
 * setting a unit's heat directly (`setUnitHeat`) and asserting dissipation
 * / shutdown / pilot-damage math. It does NOT exercise the event-driven
 * path: `resolveHeatPhase` derives each unit's per-turn heat by scanning
 * the current turn's `MovementDeclared` and `AttackDeclared` events. This
 * suite builds a real `IGameSession` through the public
 * `declareMovement` / `declareAttack` API and verifies that heat is
 * accumulated from those declared events, dissipated, and that the
 * shutdown threshold check fires — the integration angle the previously
 * skipped stub suite never actually asserted.
 */

import {
  GamePhase,
  GameSide,
  Facing,
  MovementType,
  GameEventType,
  IGameConfig,
  IGameUnit,
  IGameSession,
  IHexCoordinate,
  IHeatPayload,
  RangeBracket,
  IWeaponAttack,
  WeaponCategory,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';

import { type DiceRoller } from '../diceTypes';
import {
  createGameSession,
  startGame,
  rollInitiative,
  advancePhase,
  declareMovement,
  lockMovement,
  declareAttack,
  lockAttack,
  resolveHeatPhase,
} from '../gameSession';
import { getTerrainHeatEffect } from '../heat';

// =============================================================================
// Test Fixtures
// =============================================================================

/** Fixed 2d6 roller (always 12) so any shutdown/startup roll is deterministic. */
const fixedRoller: DiceRoller = () => ({
  dice: [6, 6],
  total: 12,
  isSnakeEyes: false,
  isBoxcars: true,
});

function createTestConfig(overrides: Partial<IGameConfig> = {}): IGameConfig {
  return {
    mapRadius: 10,
    turnLimit: 0,
    victoryConditions: ['elimination'],
    optionalRules: [],
    ...overrides,
  };
}

function createTestUnit(overrides: Partial<IGameUnit> = {}): IGameUnit {
  return {
    id: 'unit-1',
    name: 'Test Mech',
    side: GameSide.Player,
    unitRef: 'atlas-as7-d',
    pilotRef: 'pilot-1',
    gunnery: 4,
    piloting: 5,
    ...overrides,
  };
}

function createTestUnits(): readonly IGameUnit[] {
  return [
    createTestUnit({ id: 'player-1', name: 'Atlas', side: GameSide.Player }),
    createTestUnit({
      id: 'opponent-1',
      name: 'Marauder',
      side: GameSide.Opponent,
    }),
  ];
}

/** A synthetic PPC — 10 heat per shot. */
function ppc(weaponId: string): IWeaponAttack {
  return {
    weaponId,
    weaponName: 'PPC',
    damage: 10,
    heat: 10,
    category: WeaponCategory.ENERGY,
    minRange: 3,
    shortRange: 6,
    mediumRange: 12,
    longRange: 18,
    isCluster: false,
  };
}

/**
 * Build a session advanced to the Heat phase.
 *
 * player-1 walks (0 movement heat) and declares `playerWeapons` against
 * opponent-1; opponent-1 runs (2 movement heat) and fires nothing. The
 * caller picks `playerWeapons` to land the post-dissipation heat in the
 * band under test.
 */
function createHeatPhaseSession(
  playerWeapons: IWeaponAttack[] = [ppc('ppc-1')],
): IGameSession {
  const config = createTestConfig();
  const units = createTestUnits();
  let session = createGameSession(config, units);
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session);
  session = advancePhase(session); // Movement

  const from: IHexCoordinate = { q: 0, r: 0 };
  const to: IHexCoordinate = { q: 1, r: 0 };
  // player-1 walks: 0 movement heat. opponent-1 runs: 2 movement heat.
  session = declareMovement(
    session,
    'player-1',
    from,
    to,
    Facing.North,
    MovementType.Walk,
    1,
    0,
  );
  session = lockMovement(session, 'player-1');
  session = declareMovement(
    session,
    'opponent-1',
    from,
    to,
    Facing.North,
    MovementType.Run,
    2,
    2,
  );
  session = lockMovement(session, 'opponent-1');

  session = advancePhase(session); // Weapon Attack

  session = declareAttack(
    session,
    'player-1',
    'opponent-1',
    playerWeapons,
    10,
    RangeBracket.Medium,
  );
  session = lockAttack(session, 'player-1');
  session = lockAttack(session, 'opponent-1');

  session = advancePhase(session); // Physical Attack phase
  session = advancePhase(session); // Heat phase
  return session;
}

/** Sum the `amount` of every HeatGenerated event for a unit + source. */
function heatGeneratedAmount(
  session: IGameSession,
  unitId: string,
  source: IHeatPayload['source'],
): number {
  return session.events
    .filter(
      (e) => e.type === GameEventType.HeatGenerated && e.actorId === unitId,
    )
    .map((e) => e.payload as IHeatPayload)
    .filter((p) => p.source === source)
    .reduce((sum, p) => sum + p.amount, 0);
}

function eventsOfType(
  session: IGameSession,
  type: GameEventType,
  unitId?: string,
) {
  return session.events.filter(
    (e) => e.type === type && (unitId === undefined || e.actorId === unitId),
  );
}

// =============================================================================
// Tests
// =============================================================================

describe('resolveHeatPhase — event-driven heat integration', () => {
  describe('heat accumulation from declared events', () => {
    it('accumulates firing heat from AttackDeclared weapon payloads', () => {
      const session = resolveHeatPhase(createHeatPhaseSession(), fixedRoller);
      // player-1 fired one PPC (10 heat).
      expect(heatGeneratedAmount(session, 'player-1', 'firing')).toBe(10);
    });

    it('sums firing heat across multiple weapons fired by one unit', () => {
      const session = resolveHeatPhase(
        createHeatPhaseSession([ppc('ppc-1'), ppc('ppc-2'), ppc('ppc-3')]),
        fixedRoller,
      );
      // 3 PPCs × 10 heat.
      expect(heatGeneratedAmount(session, 'player-1', 'firing')).toBe(30);
    });

    it('accumulates movement heat from MovementDeclared payloads', () => {
      const session = resolveHeatPhase(createHeatPhaseSession(), fixedRoller);
      // opponent-1 ran for 2 movement heat.
      expect(heatGeneratedAmount(session, 'opponent-1', 'movement')).toBe(2);
    });

    it('accumulates environmental heat from terrain effects during heat resolution', () => {
      const session = resolveHeatPhase(
        createHeatPhaseSession([]),
        fixedRoller,
        {
          getEnvironmentHeatEffect: (unitId) =>
            unitId === 'player-1'
              ? getTerrainHeatEffect([{ type: TerrainType.Fire, level: 1 }])
              : 0,
        },
      );

      expect(heatGeneratedAmount(session, 'player-1', 'environment')).toBe(5);
      expect(heatGeneratedAmount(session, 'opponent-1', 'environment')).toBe(0);
    });

    it('emits no firing-heat event for a unit that declared no attack', () => {
      const session = resolveHeatPhase(createHeatPhaseSession(), fixedRoller);
      expect(heatGeneratedAmount(session, 'opponent-1', 'firing')).toBe(0);
    });
  });

  describe('heat dissipation', () => {
    it('emits a HeatDissipated event for every active unit', () => {
      const session = resolveHeatPhase(createHeatPhaseSession(), fixedRoller);
      expect(
        eventsOfType(session, GameEventType.HeatDissipated, 'player-1').length,
      ).toBeGreaterThanOrEqual(1);
      expect(
        eventsOfType(session, GameEventType.HeatDissipated, 'opponent-1')
          .length,
      ).toBeGreaterThanOrEqual(1);
    });

    it('dissipates sub-capacity heat fully to zero', () => {
      // 10 firing heat / 2 movement heat are both within a 10-heat-sink
      // dissipation capacity, so net heat clamps to 0.
      const session = resolveHeatPhase(createHeatPhaseSession(), fixedRoller);
      expect(session.currentState.units['player-1'].heat).toBe(0);
      expect(session.currentState.units['opponent-1'].heat).toBe(0);
    });
  });

  describe('shutdown threshold check', () => {
    it('emits no shutdown check when net heat stays below 14', () => {
      const session = resolveHeatPhase(createHeatPhaseSession(), fixedRoller);
      expect(eventsOfType(session, GameEventType.ShutdownCheck).length).toBe(0);
    });

    it('emits a shutdown check once net heat reaches the shutdown band', () => {
      // 5 PPCs = 50 firing heat − 10 dissipation = 40 net heat, well into
      // the shutdown band.
      const session = resolveHeatPhase(
        createHeatPhaseSession([
          ppc('ppc-1'),
          ppc('ppc-2'),
          ppc('ppc-3'),
          ppc('ppc-4'),
          ppc('ppc-5'),
        ]),
        fixedRoller,
      );
      expect(
        eventsOfType(session, GameEventType.ShutdownCheck, 'player-1').length,
      ).toBeGreaterThanOrEqual(1);
      expect(
        session.currentState.units['player-1'].heat,
      ).toBeGreaterThanOrEqual(14);
    });
  });

  describe('phase contract', () => {
    it('keeps the session in the Heat phase', () => {
      const session = resolveHeatPhase(createHeatPhaseSession(), fixedRoller);
      expect(session.currentState.phase).toBe(GamePhase.Heat);
    });

    it('throws when invoked outside the heat phase', () => {
      const config = createTestConfig();
      let session = createGameSession(config, createTestUnits());
      session = startGame(session, GameSide.Player);
      session = rollInitiative(session);
      session = advancePhase(session); // Movement — not Heat
      expect(() => resolveHeatPhase(session, fixedRoller)).toThrow(
        'Not in heat phase',
      );
    });
  });
});
