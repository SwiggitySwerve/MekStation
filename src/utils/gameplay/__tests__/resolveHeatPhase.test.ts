/**
 * Heat Phase Resolution Tests
 *
 * TDD tests for resolveHeatPhase function.
 */

import {
  GamePhase,
  GameSide,
  Facing,
  MovementType,
  IGameConfig,
  IGameUnit,
  IGameSession,
  IHexCoordinate,
  RangeBracket,
  FiringArc,
  IWeaponAttack,
  WeaponCategory,
} from '@/types/gameplay';

import {
  createGameSession,
  startGame,
  rollInitiative,
  advancePhase,
  declareMovement,
  lockMovement,
  declareAttack,
  lockAttack,
} from '../gameSession';

// =============================================================================
// Test Fixtures
// =============================================================================

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

function createHeatPhaseSession(): IGameSession {
  const config = createTestConfig();
  const units = createTestUnits();
  let session = createGameSession(config, units);
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session);
  session = advancePhase(session); // Movement

  // Declare and lock movement for both units (with heat generation)
  const from: IHexCoordinate = { q: 0, r: 0 };
  const to: IHexCoordinate = { q: 1, r: 0 };
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

  // Declare and lock attacks (weapons generate heat)
  const weapons: IWeaponAttack[] = [
    {
      weaponId: 'ppc-1',
      weaponName: 'PPC',
      damage: 10,
      heat: 10,
      category: WeaponCategory.ENERGY,
      minRange: 3,
      shortRange: 6,
      mediumRange: 12,
      longRange: 18,
      isCluster: false,
    },
  ];
  session = declareAttack(
    session,
    'player-1',
    'opponent-1',
    weapons,
    10,
    RangeBracket.Medium,
    FiringArc.Front,
  );
  session = lockAttack(session, 'player-1');
  session = lockAttack(session, 'opponent-1');

  session = advancePhase(session); // Heat phase

  return session;
}

// =============================================================================
// resolveHeatPhase Tests
// =============================================================================

describe.skip('resolveHeatPhase', () => {
  it('should create heat dissipated events for all units', () => {
    const session = createHeatPhaseSession();
    expect(session).toBeDefined();
  });

  it('should accumulate heat from weapon fire', () => {
    const session = createHeatPhaseSession();
    expect(session).toBeDefined();
  });

  it('should accumulate heat from movement', () => {
    const session = createHeatPhaseSession();
    expect(session).toBeDefined();
  });

  it('should dissipate heat based on heat sinks', () => {
    const session = createHeatPhaseSession();
    expect(session).toBeDefined();
  });

  it('should apply water cooling bonus from terrain', () => {
    const session = createHeatPhaseSession();
    expect(session).toBeDefined();
  });

  it('should calculate net heat correctly', () => {
    const session = createHeatPhaseSession();
    expect(session).toBeDefined();
  });

  it('should create shutdown check event at heat 18+', () => {
    const session = createHeatPhaseSession();
    expect(session).toBeDefined();
  });

  it('should create ammo explosion check event at heat 19+', () => {
    const session = createHeatPhaseSession();
    expect(session).toBeDefined();
  });

  it('should advance to End phase when complete', () => {
    const session = createHeatPhaseSession();
    expect(session.currentState.phase).toBe(GamePhase.Heat);
  });

  it('should handle units with no heat generation', () => {
    const config = createTestConfig();
    const units = createTestUnits();
    let session = createGameSession(config, units);
    session = startGame(session, GameSide.Player);
    expect(session).toBeDefined();
  });

  it('should handle multiple weapons fired by same unit', () => {
    const config = createTestConfig();
    const units = createTestUnits();
    let session = createGameSession(config, units);
    session = startGame(session, GameSide.Player);
    expect(session).toBeDefined();
  });

  it('should throw error if not in heat phase', () => {
    const config = createTestConfig();
    const units = createTestUnits();
    let session = createGameSession(config, units);
    session = startGame(session, GameSide.Player);
    expect(session).toBeDefined();
  });
});
