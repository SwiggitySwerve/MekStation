/**
 * Force ownership on campaign participation.
 *
 * A campaign has one shared roster, so `forceUnits` knowing a force only
 * proves it exists. The `foreign-force` refusal was named for ownership
 * but only ever fired for an unknown force, which let a player file
 * participation for a teammate's force.
 */

import { ForceRole, FormationLevel } from '@/types/campaign/enums';

import type { ICampaignParticipationRecord } from '../CampaignHostRegistry';

import { admitCampaignParticipation } from '../authorizeCampaignParticipation';

const FORCE_UNITS = {
  'force-a': ['unit-a1', 'unit-a2'],
  'force-b': ['unit-b1'],
};

function claim(
  playerId: string,
  forceId: string,
): ICampaignParticipationRecord {
  return {
    matchId: 'm1',
    missionId: 'mission-1',
    playerId,
    role: playerId === 'pid_host' ? 'host' : 'guest',
    choice: 'deploy',
    force: {
      id: forceId,
      name: forceId,
      subForceIds: [],
      unitIds: FORCE_UNITS[forceId as keyof typeof FORCE_UNITS],
      forceType: ForceRole.STANDARD,
      formationLevel: FormationLevel.LANCE,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    revision: 3,
  } as unknown as ICampaignParticipationRecord;
}

function admit(
  verifiedPlayerId: string,
  forceId: string,
  records: readonly ICampaignParticipationRecord[],
) {
  return admitCampaignParticipation({
    matchId: 'm1',
    currentRevision: 3,
    acknowledgedRevision: 3,
    verifiedPlayerId,
    hostPlayerId: 'pid_host',
    forceUnits: FORCE_UNITS,
    records,
    payload: {
      missionId: 'mission-1',
      forceId,
      choice: 'deploy',
    } as never,
  });
}

describe('campaign participation force ownership', () => {
  it('refuses a force another participant already claimed', () => {
    const result = admit('pid_guest', 'force-a', [
      claim('pid_host', 'force-a'),
    ]);

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe('foreign-force');
  });

  it('admits a force nobody else has claimed', () => {
    // Control. A guard that refused whenever any claim existed would
    // pass the row above while breaking a two-player mission.
    const result = admit('pid_guest', 'force-b', [
      claim('pid_host', 'force-a'),
    ]);

    expect(result.ok).toBe(true);
  });

  it('lets a participant re-send their own claim', () => {
    // Control. Ownership must not turn a participant into a stranger to
    // their own force - the idempotent resend has to keep working.
    const result = admit('pid_host', 'force-a', [claim('pid_host', 'force-a')]);

    expect(result.ok).toBe(true);
    expect(result.ok === true && result.idempotent).toBe(true);
  });
});
