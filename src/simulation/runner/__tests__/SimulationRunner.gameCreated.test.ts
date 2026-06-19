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
  it('seeds hydrated pilot abilities and generic Edge points into state and GameCreated units', () => {
    const hydrated: IHydratedUnitData = {
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit: {
        id: 'edge-game-created-test',
        chassis: 'Grasshopper',
        variant: 'GHR-5H',
        model: 'GHR-5H',
        tonnage: 70,
        techBase: 'Inner Sphere',
        era: '3025',
        unitType: 'BattleMech',
        unitRef: 'grasshopper-ghr-5h',
        abilities: ['edge', 'edge_when_headhit'],
      },
      aiWeapons: [],
      gunnery: 3,
      piloting: 4,
    };
    const hydration = new Map([['player-1', hydrated]]);

    const state = createInitialState(
      makeConfig({ unitCount: { player: 1, opponent: 0 } }),
      hydration,
    );
    const units = synthesizeGameUnits(
      makeConfig({ unitCount: { player: 1, opponent: 0 } }),
      hydration,
    );

    expect(state.units['player-1'].abilities).toEqual([
      'edge',
      'edge_when_headhit',
    ]);
    expect(state.units['player-1'].edgePointsRemaining).toBe(1);
    expect(units[0]).toMatchObject({
      id: 'player-1',
      abilities: ['edge', 'edge_when_headhit'],
      edgePointsRemaining: 1,
    });
  });

  it('seeds hydrated Targeting Computer equipment into state and GameCreated units', () => {
    const hydrated: IHydratedUnitData = {
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit: {
        id: 'targeting-computer-game-created-test',
        chassis: 'Warhammer',
        variant: 'TC',
        model: 'TC',
        tonnage: 70,
        techBase: 'Inner Sphere',
        era: '3060',
        unitType: 'BattleMech',
        equipment: [{ id: 'targeting-computer', location: 'RIGHT_TORSO' }],
      },
      aiWeapons: [],
      gunnery: 3,
      piloting: 4,
    };
    const hydration = new Map([['player-1', hydrated]]);

    const state = createInitialState(
      makeConfig({ unitCount: { player: 1, opponent: 0 } }),
      hydration,
    );
    const units = synthesizeGameUnits(
      makeConfig({ unitCount: { player: 1, opponent: 0 } }),
      hydration,
    );

    expect(state.units['player-1'].targetingComputerEquipment).toBe(true);
    expect(units[0]).toMatchObject({
      id: 'player-1',
      targetingComputerEquipment: true,
    });
  });

  it('seeds unambiguous C3 and C3i networks from hydrated BattleMech equipment', () => {
    const config = makeConfig({ unitCount: { player: 2, opponent: 2 } });
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
      [
        'opponent-1',
        hydratedC3Unit('opponent-1', 'C3i A', [
          { id: 'Improved C3 Computer (C3I)', location: 'HEAD' },
        ]),
      ],
      [
        'opponent-2',
        hydratedC3Unit('opponent-2', 'C3i B', [
          { id: 'IS C3i Computer', location: 'CENTER_TORSO' },
        ]),
      ],
    ]);
    const state = createInitialState(config, hydration);
    const seedUnits = synthesizeGameUnits(config, hydration);

    expect(state.c3Network?.networks).toEqual([
      {
        networkId: 'player-c3-master-slave-1',
        type: 'master-slave',
        teamId: GameSide.Player,
        members: [
          {
            entityId: 'player-1',
            teamId: GameSide.Player,
            role: 'master',
            position: { q: -1, r: -8 },
            operational: true,
            ecmDisrupted: false,
          },
          {
            entityId: 'player-2',
            teamId: GameSide.Player,
            role: 'slave',
            position: { q: 0, r: -8 },
            operational: true,
            ecmDisrupted: false,
          },
        ],
      },
      {
        networkId: 'opponent-c3i-1',
        type: 'improved',
        teamId: GameSide.Opponent,
        members: [
          {
            entityId: 'opponent-1',
            teamId: GameSide.Opponent,
            role: 'c3i',
            position: { q: -1, r: 8 },
            operational: true,
            ecmDisrupted: false,
          },
          {
            entityId: 'opponent-2',
            teamId: GameSide.Opponent,
            role: 'c3i',
            position: { q: 0, r: 8 },
            operational: true,
            ecmDisrupted: false,
          },
        ],
      },
    ]);
    expect(seedUnits.find((unit) => unit.id === 'player-1')).toMatchObject({
      c3Equipment: [{ role: 'master' }],
    });
    expect(seedUnits.find((unit) => unit.id === 'player-2')).toMatchObject({
      c3Equipment: [{ role: 'slave' }],
    });
    expect(seedUnits.find((unit) => unit.id === 'opponent-1')).toMatchObject({
      c3Equipment: [{ role: 'c3i' }],
    });
  });

  it('seeds unambiguous C3i networks from Boosted Comm Implant pilot ability state', () => {
    const config = makeConfig({ unitCount: { player: 2, opponent: 0 } });
    const hydration = new Map([
      [
        'player-1',
        hydratedC3Unit(
          'player-1',
          'Boosted Comm A',
          [],
          ['boost_comm_implant'],
        ),
      ],
      [
        'player-2',
        hydratedC3Unit(
          'player-2',
          'Boosted Comm B',
          [],
          ['boost_comm_implant'],
        ),
      ],
    ]);
    const state = createInitialState(config, hydration);
    const seedUnits = synthesizeGameUnits(config, hydration);

    expect(state.c3Network?.networks).toEqual([
      {
        networkId: 'player-c3i-1',
        type: 'improved',
        teamId: GameSide.Player,
        members: [
          {
            entityId: 'player-1',
            teamId: GameSide.Player,
            role: 'c3i',
            position: { q: -1, r: -8 },
            operational: true,
            ecmDisrupted: false,
          },
          {
            entityId: 'player-2',
            teamId: GameSide.Player,
            role: 'c3i',
            position: { q: 0, r: -8 },
            operational: true,
            ecmDisrupted: false,
          },
        ],
      },
    ]);
    expect(seedUnits.find((unit) => unit.id === 'player-1')).toMatchObject({
      abilities: ['boost_comm_implant'],
      c3Equipment: [
        {
          role: 'c3i',
          sourceEquipmentId: 'boost_comm_implant',
        },
      ],
    });
  });
});
