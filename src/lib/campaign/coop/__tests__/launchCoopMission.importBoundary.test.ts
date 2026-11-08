jest.mock('better-sqlite3', () => {
  throw new Error('Client launcher loaded better-sqlite3');
});
jest.mock('@/services/persistence/SQLiteService', () => {
  throw new Error('Client launcher loaded SQLiteService');
});
jest.mock('@/services/encounter/EncounterRepository', () => {
  throw new Error('Client launcher loaded EncounterRepository');
});

it('imports the co-op launcher without loading server persistence', () => {
  jest.isolateModules(() => {
    const launcher = jest.requireActual<
      typeof import('@/lib/campaign/coop/launchCoopMission')
    >('@/lib/campaign/coop/launchCoopMission');
    expect(launcher.launchCoopMission).toEqual(expect.any(Function));
    expect(launcher.prepareCoopMissionLaunch).toEqual(expect.any(Function));
  });
});
