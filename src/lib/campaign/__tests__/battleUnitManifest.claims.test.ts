/**
 * T1: a legacy match never takes a roster unit the launch manifest already
 * names, at launch-time completion and at apply (one helper owns the rule).
 */
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

import {
  completeLaunchManifest,
  planOutcomeUnitWrites,
} from '../battleUnitManifest';

const LINKED = 'player-1-locust-lct-1v';
const UNLINKED = 'player-2-atlas-as7-d';
const campaign = { forces: new Map() as never };
const rosterUnits = [
  {
    unitId: 'roster-a',
    unitName: 'Atlas A',
    unitRef: 'atlas-as7-d',
    pilotId: 'pilot-a',
  },
] as unknown as IRosterUnitProjection[];

describe('a legacy match never takes a unit the launch manifest already names', () => {
  it('at launch: the colliding unit is recorded unresolved and the manifest incomplete', () => {
    const result = completeLaunchManifest(campaign, rosterUnits, {
      units: { [LINKED]: { rosterUnitId: 'roster-a' } },
      playerUnits: [
        { unitId: LINKED, unitRef: 'locust-lct-1v' },
        { unitId: UNLINKED, unitRef: 'atlas-as7-d', pilotRef: 'pilot-a' },
      ],
      scenarioId: null,
    });
    expect(result).toEqual({
      units: {
        [LINKED]: { rosterUnitId: 'roster-a' },
        [UNLINKED]: { unresolved: true, candidates: [] },
      },
      complete: false,
    });
  });

  it('at apply: the colliding delta is unapplied, the named one written', () => {
    const delta = (unitId: string, unitRef: string, pilotRef?: string) => ({
      unitId,
      unitRef,
      side: GameSide.Player,
      ...(pilotRef ? { pilotRef } : {}),
    });
    const plan = planOutcomeUnitWrites(
      {
        ...campaign,
        battleUnitManifests: {
          m1: {
            units: { [LINKED]: { rosterUnitId: 'roster-a' } },
            complete: false,
            recordedOn: '3025-06-15T00:00:00.000Z',
          },
        },
      },
      rosterUnits,
      {
        matchId: 'm1',
        scenarioId: null,
        unitDeltas: [
          delta(LINKED, 'locust-lct-1v'),
          delta(UNLINKED, 'atlas-as7-d', 'pilot-a'),
        ],
      } as unknown as ICombatOutcome,
    );
    expect(
      plan.writes.map((write) => [write.delta.unitId, write.rosterUnitId]),
    ).toEqual([[LINKED, 'roster-a']]);
    expect(plan.unapplied.map((entry) => entry.delta.unitId)).toEqual([
      UNLINKED,
    ]);
  });
});
