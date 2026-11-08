import type { IEncounter } from '@/types/encounter';

import { EncounterStatus, TerrainPreset } from '@/types/encounter';

import { recalculateEncounterLifecycleStatus } from '../EncounterLifecycle';

function encounter(status: EncounterStatus): IEncounter {
  return {
    id: 'enc',
    name: 'Encounter',
    status,
    mapConfig: {
      radius: 6,
      terrain: TerrainPreset.Clear,
      playerDeploymentZone: 'south',
      opponentDeploymentZone: 'north',
    },
    victoryConditions: [],
    optionalRules: [],
    createdAt: '',
    updatedAt: '',
  };
}

describe('encounter lifecycle classification', () => {
  it.each([
    EncounterStatus.Draft,
    EncounterStatus.Ready,
    EncounterStatus.Launched,
  ])(
    'preserves existing empty configuration classification from %s',
    (status) => {
      expect(recalculateEncounterLifecycleStatus(encounter(status))).toBe(
        EncounterStatus.Draft,
      );
    },
  );
  it('never demotes completed history', () => {
    expect(
      recalculateEncounterLifecycleStatus(encounter(EncounterStatus.Completed)),
    ).toBe(EncounterStatus.Completed);
  });
  it('retains launched when one force remains', () => {
    expect(
      recalculateEncounterLifecycleStatus({
        ...encounter(EncounterStatus.Launched),
        playerForce: {
          forceId: 'force',
          forceName: '',
          totalBV: 0,
          unitCount: 0,
        },
      }),
    ).toBe(EncounterStatus.Launched);
  });
});
