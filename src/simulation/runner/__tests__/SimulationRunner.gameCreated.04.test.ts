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
  it('seeds active probes and combined CEWS into runner electronic-warfare state', () => {
    const hydrated: IHydratedUnitData = {
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit: {
        id: 'cews-probe-test',
        chassis: 'Raven',
        variant: 'EW',
        model: 'EW',
        tonnage: 35,
        techBase: 'Mixed',
        era: '3050',
        unitType: 'BattleMech',
        equipment: [
          { id: '1-isbeagleactiveprobe', location: 'HEAD' },
          { id: '1-clwatchdogcews', location: 'RIGHT_TORSO' },
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
        type: 'clan',
        mode: 'ecm',
        operational: true,
        entityId: 'player-1:1-clwatchdogcews:0',
        teamId: GameSide.Player,
        position: { q: -1, r: -8 },
      },
    ]);
    expect(state.electronicWarfare?.activeProbes).toEqual([
      {
        type: 'beagle',
        operational: true,
        entityId: 'player-1',
        teamId: GameSide.Player,
        position: { q: -1, r: -8 },
      },
      {
        type: 'watchdog-cews',
        operational: true,
        entityId: 'player-1',
        teamId: GameSide.Player,
        position: { q: -1, r: -8 },
      },
    ]);
  });

  it('seeds Eagle Eyes active-probe range bonus from hydrated pilot ability state', () => {
    const hydrated: IHydratedUnitData = {
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit: {
        id: 'eagle-eyes-probe-test',
        chassis: 'Raven',
        variant: 'EW',
        model: 'EW',
        tonnage: 35,
        techBase: 'Inner Sphere',
        era: '3050',
        unitType: 'BattleMech',
        abilities: ['eagle_eyes'],
        equipment: [{ id: '1-isbeagleactiveprobe', location: 'HEAD' }],
      },
      aiWeapons: [],
      gunnery: 3,
      piloting: 4,
    };

    const state = createInitialState(
      makeConfig({ unitCount: { player: 1, opponent: 0 } }),
      new Map([['player-1', hydrated]]),
    );

    expect(state.electronicWarfare?.activeProbes).toEqual([
      {
        type: 'beagle',
        operational: true,
        entityId: 'player-1',
        teamId: GameSide.Player,
        position: { q: -1, r: -8 },
        eagleEyesRangeBonus: true,
      },
    ]);
  });
});
