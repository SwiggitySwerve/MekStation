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
  it('seeds unambiguous Nova CEWS networks from hydrated BattleMech equipment', () => {
    const config = makeConfig({ unitCount: { player: 2, opponent: 0 } });
    const hydration = new Map([
      [
        'player-1',
        hydratedC3Unit('player-1', 'Nova A', [
          { id: 'CL Nova CEWS', location: 'RIGHT_TORSO' },
        ]),
      ],
      [
        'player-2',
        hydratedC3Unit('player-2', 'Nova B', [
          { id: 'CL Nova CEWS', location: 'LEFT_TORSO' },
        ]),
      ],
    ]);
    const state = createInitialState(config, hydration);
    const seedUnits = synthesizeGameUnits(config, hydration);

    expect(state.c3Network?.networks).toEqual([
      {
        networkId: 'player-nova-cews-1',
        type: 'nova',
        teamId: GameSide.Player,
        members: [
          {
            entityId: 'player-1',
            teamId: GameSide.Player,
            role: 'nova',
            position: { q: -1, r: -8 },
            operational: true,
            ecmDisrupted: false,
          },
          {
            entityId: 'player-2',
            teamId: GameSide.Player,
            role: 'nova',
            position: { q: 0, r: -8 },
            operational: true,
            ecmDisrupted: false,
          },
        ],
      },
    ]);
    expect(seedUnits.find((unit) => unit.id === 'player-1')).toMatchObject({
      c3Equipment: [{ role: 'nova' }],
    });
  });

  it('stamps runner C3 network state onto GameCreated payloads', () => {
    const hydration = new Map([
      [
        'player-1',
        hydratedC3Unit('player-1', 'Master', [
          { id: 'c3-master', location: 'HEAD' },
        ]),
      ],
      [
        'player-2',
        hydratedC3Unit('player-2', 'Slave', [
          { id: '1-c3-slave', location: 'RIGHT_TORSO' },
        ]),
      ],
    ]);
    const runner = new SimulationRunner(
      42,
      undefined,
      undefined,
      () => new StandStillAIPlayer(),
      undefined,
      hydration,
    );
    const result = runner.run(
      makeConfig({
        turnLimit: 1,
        unitCount: { player: 2, opponent: 0 },
      }),
    );
    const payload = result.events[0].payload as IGameCreatedPayload;

    expect(payload.c3Network?.networks).toEqual([
      expect.objectContaining({
        networkId: 'player-c3-master-slave-1',
        type: 'master-slave',
        teamId: GameSide.Player,
        members: [
          expect.objectContaining({
            entityId: 'player-1',
            role: 'master',
            position: { q: -1, r: -8 },
          }),
          expect.objectContaining({
            entityId: 'player-2',
            role: 'slave',
            position: { q: 0, r: -8 },
          }),
        ],
      }),
    ]);
    expect(payload.units.find((unit) => unit.id === 'player-1')).toMatchObject({
      c3Equipment: [{ role: 'master' }],
    });
  });

  it('leaves ambiguous C3 equipment unassembled instead of guessing networks', () => {
    const state = createInitialState(
      makeConfig({ unitCount: { player: 3, opponent: 0 } }),
      new Map([
        [
          'player-1',
          hydratedC3Unit('player-1', 'Master A', [
            { id: 'c3-master', location: 'HEAD' },
          ]),
        ],
        [
          'player-2',
          hydratedC3Unit('player-2', 'Master B', [
            { id: 'C3 Boosted System (Master)', location: 'CENTER_TORSO' },
          ]),
        ],
        [
          'player-3',
          hydratedC3Unit('player-3', 'Slave', [
            { id: '1-c3-slave', location: 'RIGHT_TORSO' },
          ]),
        ],
      ]),
    );

    expect(state.c3Network).toBeUndefined();
  });

  it('leaves oversized hydrated master/slave C3 equipment unassembled instead of splitting networks', () => {
    const state = createInitialState(
      makeConfig({ unitCount: { player: 5, opponent: 0 } }),
      new Map([
        [
          'player-1',
          hydratedC3Unit('player-1', 'Master', [
            { id: 'c3-master', location: 'HEAD' },
          ]),
        ],
        ...Array.from({ length: 4 }, (_, index) => {
          const unitNumber = index + 2;
          return [
            `player-${unitNumber}`,
            hydratedC3Unit(`player-${unitNumber}`, `Slave ${index + 1}`, [
              { id: '1-c3-slave', location: 'RIGHT_TORSO' },
            ]),
          ] as const;
        }),
      ]),
    );

    expect(state.c3Network).toBeUndefined();
  });

  it('leaves oversized hydrated C3i equipment unassembled instead of splitting networks', () => {
    const state = createInitialState(
      makeConfig({ unitCount: { player: 0, opponent: 7 } }),
      new Map([
        ...Array.from({ length: 7 }, (_, index) => {
          const unitNumber = index + 1;
          return [
            `opponent-${unitNumber}`,
            hydratedC3Unit(`opponent-${unitNumber}`, `C3i ${unitNumber}`, [
              { id: 'Improved C3 Computer (C3I)', location: 'HEAD' },
            ]),
          ] as const;
        }),
      ]),
    );

    expect(state.c3Network).toBeUndefined();
  });

  it('uses slot id as the unit name when no hydration is provided', () => {
    const runner = new SimulationRunner(42);
    const result = runner.run(
      makeConfig({ unitCount: { player: 1, opponent: 1 } }),
    );

    const payload = result.events[0].payload as IGameCreatedPayload;
    const playerUnit = payload.units.find((u) => u.id === 'player-1');
    expect(playerUnit?.name).toBe('player-1');
  });

  it('falls back to default skills when no hydration is provided', () => {
    const runner = new SimulationRunner(42);
    const result = runner.run(
      makeConfig({ unitCount: { player: 1, opponent: 1 } }),
    );

    const payload = result.events[0].payload as IGameCreatedPayload;
    // DEFAULT_GUNNERY === 4, DEFAULT_PILOTING === 5 per
    // SimulationRunnerConstants.ts
    expect(payload.units[0].gunnery).toBe(4);
    expect(payload.units[0].piloting).toBe(5);
  });

  it('emits GameCreated exactly once per run', () => {
    const runner = new SimulationRunner(42);
    const result = runner.run(makeConfig());

    const seedEvents = result.events.filter(
      (e) => e.type === GameEventType.GameCreated,
    );
    expect(seedEvents).toHaveLength(1);
  });

  it('event sequences are monotonically increasing', () => {
    const runner = new SimulationRunner(42);
    const result = runner.run(makeConfig());

    for (let i = 1; i < result.events.length; i += 1) {
      expect(result.events[i].sequence).toBe(result.events[i - 1].sequence + 1);
    }
  });
});
