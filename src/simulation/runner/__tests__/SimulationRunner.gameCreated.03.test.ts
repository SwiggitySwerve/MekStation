import {
  StandStillAIPlayer,
  GameEventType,
  GamePhase,
  GameSide,
  SimulationRunner,
  createInitialState,
  synthesizeGameUnits,
  IGameCreatedPayload,
  IHydratedUnitData,
  ISimulationConfig,
  makeConfig,
  hydratedC3Unit,
} from './SimulationRunner.gameCreated.test-helpers';

describe('SimulationRunner GameCreated seed event', () => {
  it('emits production TurnStarted once per runner turn before phase events', () => {
    const runner = new SimulationRunner(
      42,
      undefined,
      undefined,
      () => new StandStillAIPlayer(),
    );
    const result = runner.run(
      makeConfig({
        turnLimit: 2,
        unitCount: { player: 1, opponent: 1 },
      }),
    );

    const turnStartedEvents = result.events.filter(
      (event) => event.type === GameEventType.TurnStarted,
    );
    const turnEndedEvents = result.events.filter(
      (event) => event.type === GameEventType.TurnEnded,
    );

    expect(turnStartedEvents).toHaveLength(2);
    expect(turnStartedEvents.map((event) => event.turn)).toEqual([1, 2]);
    expect(turnStartedEvents.map((event) => event.phase)).toEqual([
      GamePhase.Initiative,
      GamePhase.Initiative,
    ]);
    expect(turnStartedEvents.map((event) => event.payload)).toEqual([
      { _type: 'turn_started' },
      { _type: 'turn_started' },
    ]);

    for (const started of turnStartedEvents) {
      const ended = turnEndedEvents.find(
        (event) => event.turn === started.turn,
      );
      expect(ended).toBeDefined();
      expect(started.sequence).toBeLessThan(ended?.sequence ?? Infinity);
    }
  });

  it('emits GameCreated as events[0] with sequence 0', () => {
    const runner = new SimulationRunner(42);
    const result = runner.run(
      makeConfig({ unitCount: { player: 2, opponent: 2 } }),
    );

    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events[0].type).toBe(GameEventType.GameCreated);
    expect(result.events[0].sequence).toBe(0);
  });

  it('subsequent events have sequence > 0', () => {
    const runner = new SimulationRunner(42);
    const result = runner.run(makeConfig());

    for (let i = 1; i < result.events.length; i += 1) {
      expect(result.events[i].sequence).toBeGreaterThan(0);
    }
  });

  it('payload.units contains one entry per slot', () => {
    const runner = new SimulationRunner(42);
    const result = runner.run(
      makeConfig({ unitCount: { player: 2, opponent: 2 } }),
    );

    const seedEvent = result.events[0];
    const payload = seedEvent.payload as IGameCreatedPayload;
    expect(payload.units).toHaveLength(4);
  });

  it('contains entries with correct side-keyed ids', () => {
    const runner = new SimulationRunner(42);
    const result = runner.run(
      makeConfig({ unitCount: { player: 1, opponent: 3 } }),
    );

    const payload = result.events[0].payload as IGameCreatedPayload;
    const ids = payload.units.map((u) => u.id).sort();
    expect(ids).toEqual(
      ['opponent-1', 'opponent-2', 'opponent-3', 'player-1'].sort(),
    );
  });

  it('player-N entries have side === GameSide.Player', () => {
    const runner = new SimulationRunner(42);
    const result = runner.run(
      makeConfig({ unitCount: { player: 2, opponent: 1 } }),
    );

    const payload = result.events[0].payload as IGameCreatedPayload;
    const playerUnits = payload.units.filter((u) => u.id.startsWith('player-'));
    expect(playerUnits).toHaveLength(2);
    for (const unit of playerUnits) {
      expect(unit.side).toBe(GameSide.Player);
    }
  });

  it('opponent-N entries have side === GameSide.Opponent', () => {
    const runner = new SimulationRunner(42);
    const result = runner.run(
      makeConfig({ unitCount: { player: 1, opponent: 2 } }),
    );

    const payload = result.events[0].payload as IGameCreatedPayload;
    const opponentUnits = payload.units.filter((u) =>
      u.id.startsWith('opponent-'),
    );
    expect(opponentUnits).toHaveLength(2);
    for (const unit of opponentUnits) {
      expect(unit.side).toBe(GameSide.Opponent);
    }
  });

  it('payload.config reflects input config map / turn settings', () => {
    const runner = new SimulationRunner(42);
    const config = makeConfig({ mapRadius: 11, turnLimit: 7 });
    const result = runner.run(config);

    const payload = result.events[0].payload as IGameCreatedPayload;
    expect(payload.config.mapRadius).toBe(11);
    expect(payload.config.turnLimit).toBe(7);
  });

  it('synthesizes hydrated heat sink count and type into GameCreated units', () => {
    const hydrated: IHydratedUnitData = {
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit: {
        id: 'double-sink-test',
        chassis: 'Nightstar',
        variant: 'NSR-9J',
        model: 'NSR-9J',
        tonnage: 95,
        techBase: 'Inner Sphere',
        era: '3050',
        unitType: 'BattleMech',
        unitRef: 'nightstar-nsr-9j',
        heatSinks: { type: 'DOUBLE', count: 14 },
      },
      aiWeapons: [],
      gunnery: 3,
      piloting: 4,
    };

    const units = synthesizeGameUnits(
      makeConfig({ unitCount: { player: 1, opponent: 0 } }),
      new Map([['player-1', hydrated]]),
    );

    expect(units[0]).toMatchObject({
      id: 'player-1',
      name: 'Nightstar NSR-9J',
      heatSinks: 14,
      heatSinkType: 'double',
    });
  });

  it('seeds runner electronic-warfare state from hydrated ECM equipment', () => {
    const hydrated: IHydratedUnitData = {
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit: {
        id: 'guardian-ecm-test',
        chassis: 'Raven',
        variant: 'RVN-4L',
        model: 'RVN-4L',
        tonnage: 35,
        techBase: 'Inner Sphere',
        era: '3050',
        unitType: 'BattleMech',
        equipment: [
          {
            id: '1-isguardianecm',
            location: 'RIGHT_TORSO',
            currentMode: 'Off',
          },
        ],
      },
      aiWeapons: [],
      gunnery: 3,
      piloting: 4,
    };

    const state = createInitialState(
      makeConfig({ unitCount: { player: 1, opponent: 0 } }),
      new Map([['player-1', hydrated]]),
    );

    expect(state.electronicWarfare?.ecmSuites).toEqual([
      {
        type: 'guardian',
        mode: 'off',
        operational: true,
        entityId: 'player-1:1-isguardianecm:0',
        teamId: GameSide.Player,
        position: { q: -1, r: -8 },
      },
    ]);
    expect(state.electronicWarfare?.activeProbes).toEqual([]);
  });
});
