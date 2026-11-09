import type { IEncounter } from '@/types/encounter';

import { EncounterStatus, TerrainPreset } from '@/types/encounter';

import {
  encounterTransitionError,
  recalculateEncounterLifecycleStatus,
} from '../EncounterLifecycle';

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
    [EncounterStatus.Draft, EncounterStatus.Draft, true],
    [EncounterStatus.Draft, EncounterStatus.Ready, true],
    [EncounterStatus.Draft, EncounterStatus.Launched, true],
    [EncounterStatus.Draft, EncounterStatus.Completed, false],
    [EncounterStatus.Ready, EncounterStatus.Draft, true],
    [EncounterStatus.Ready, EncounterStatus.Ready, true],
    [EncounterStatus.Ready, EncounterStatus.Launched, true],
    [EncounterStatus.Ready, EncounterStatus.Completed, false],
    [EncounterStatus.Launched, EncounterStatus.Draft, false],
    [EncounterStatus.Launched, EncounterStatus.Ready, false],
    [EncounterStatus.Launched, EncounterStatus.Launched, true],
    [EncounterStatus.Launched, EncounterStatus.Completed, true],
    [EncounterStatus.Completed, EncounterStatus.Draft, false],
    [EncounterStatus.Completed, EncounterStatus.Ready, false],
    [EncounterStatus.Completed, EncounterStatus.Launched, false],
    [EncounterStatus.Completed, EncounterStatus.Completed, true],
  ] as const)('guards %s -> %s', (from, to, allowed) => {
    const current = {
      ...encounter(from),
      gameSessionId:
        from === EncounterStatus.Launched || from === EncounterStatus.Completed
          ? 'game-a'
          : undefined,
    };
    expect(
      encounterTransitionError(
        current,
        to,
        to === EncounterStatus.Launched || to === EncounterStatus.Completed
          ? 'game-a'
          : current.gameSessionId,
      ) === null,
    ).toBe(allowed);
  });
  it('permits cascade demotion only with both slots cleared', () => {
    const current = {
      ...encounter(EncounterStatus.Launched),
      gameSessionId: 'game-a',
    };
    expect(
      encounterTransitionError(current, EncounterStatus.Draft, 'game-a', true),
    ).toBeNull();
    expect(
      encounterTransitionError(
        {
          ...current,
          opponentForce: {
            forceId: 'force',
            forceName: '',
            totalBV: 0,
            unitCount: 0,
          },
        },
        EncounterStatus.Draft,
        'game-a',
        true,
      ),
    ).not.toBeNull();
  });
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
