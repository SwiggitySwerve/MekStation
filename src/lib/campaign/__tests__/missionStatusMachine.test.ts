import { createCampaign } from '@/types/campaign/Campaign';
import { ALL_MISSION_STATUSES, MissionStatus } from '@/types/campaign/enums';
import { createContract } from '@/types/campaign/Mission';

import { acceptContract } from '../contractMarket';
import {
  missionTransitionRefusal,
  reconcileMissionCopy,
  transitionMissionStatus,
} from '../missionStatusMachine';

describe('reconcileMissionCopy', () => {
  const copy = (status: MissionStatus, name: string) => ({
    ...createContract({
      id: 'contract-1',
      name,
      employerId: 'davion',
      targetId: 'liao',
      status,
    }),
  });

  it.each(
    ALL_MISSION_STATUSES.flatMap((kept) =>
      ALL_MISSION_STATUSES.map((other) => [kept, other] as const),
    ),
  )(
    'with kept=%s and other=%s keeps `other` only when it is a legal move forward',
    (keptStatus, otherStatus) => {
      const kept = copy(keptStatus, 'kept');
      const other = copy(otherStatus, 'other');

      const picked = reconcileMissionCopy(kept, other);

      const otherIsAhead =
        keptStatus !== otherStatus &&
        missionTransitionRefusal(keptStatus, otherStatus) === null;
      expect(picked).toBe(otherIsAhead ? other : kept);
    },
  );

  it('keeps `kept` when there is no other copy', () => {
    const kept = copy(MissionStatus.ACTIVE, 'kept');

    expect(reconcileMissionCopy(kept, undefined)).toBe(kept);
  });

  it.each([
    [MissionStatus.ACTIVE, MissionStatus.SUCCESS, 'other'],
    [MissionStatus.PENDING, MissionStatus.ACTIVE, 'other'],
    [MissionStatus.SUCCESS, MissionStatus.ACTIVE, 'kept'],
    [MissionStatus.FAILED, MissionStatus.SUCCESS, 'kept'],
    [MissionStatus.ACTIVE, MissionStatus.PENDING, 'kept'],
    [MissionStatus.ACTIVE, MissionStatus.ACTIVE, 'kept'],
  ] as const)('%s vs %s -> %s', (keptStatus, otherStatus, winner) => {
    const kept = copy(keptStatus, 'kept');
    const other = copy(otherStatus, 'other');

    expect(reconcileMissionCopy(kept, other).name).toBe(winner);
  });
});

describe('missionTransitionRefusal', () => {
  it.each([
    [MissionStatus.PENDING, MissionStatus.ACTIVE, null],
    [MissionStatus.ACTIVE, MissionStatus.ACTIVE, null],
    [MissionStatus.ACTIVE, MissionStatus.SUCCESS, null],
    [MissionStatus.ACTIVE, MissionStatus.PENDING, 'not-allowed'],
    [MissionStatus.SUCCESS, MissionStatus.SUCCESS, 'terminal'],
    [MissionStatus.FAILED, MissionStatus.ACTIVE, 'terminal'],
    [MissionStatus.BREACH, MissionStatus.PENDING, 'terminal'],
  ] as const)('%s -> %s is %p', (from, to, expected) => {
    expect(missionTransitionRefusal(from, to)).toBe(expected);
  });
});

const STALE = '2020-01-01T00:00:00.000Z';

function contract(status: MissionStatus) {
  return {
    ...createContract({
      id: 'contract-1',
      name: 'Guard Test',
      employerId: 'davion',
      targetId: 'liao',
      status,
    }),
    updatedAt: STALE,
  };
}

describe('transitionMissionStatus', () => {
  it('moves PENDING to ACTIVE and stamps updatedAt without touching the input', () => {
    const before = contract(MissionStatus.PENDING);
    const frozen = { ...before };

    const result = transitionMissionStatus(
      before,
      MissionStatus.ACTIVE,
      'accept',
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changed).toBe(true);
    expect(result.mission.status).toBe(MissionStatus.ACTIVE);
    expect(result.mission.updatedAt).not.toBe(STALE);
    expect(result.mission.employerId).toBe('davion');
    expect(before).toEqual(frozen);
  });

  it.each([
    MissionStatus.SUCCESS,
    MissionStatus.PARTIAL,
    MissionStatus.FAILED,
    MissionStatus.BREACH,
  ])('lets an ACTIVE contract settle as %s', (to) => {
    const result = transitionMissionStatus(
      contract(MissionStatus.ACTIVE),
      to,
      'post-battle',
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.mission.status).toBe(to);
  });

  it('treats a same-status request on a live contract as an unchanged, restamped no-op', () => {
    const result = transitionMissionStatus(
      contract(MissionStatus.ACTIVE),
      MissionStatus.ACTIVE,
      'post-battle',
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changed).toBe(false);
    expect(result.mission.status).toBe(MissionStatus.ACTIVE);
  });

  it.each([[MissionStatus.ACTIVE, MissionStatus.PENDING]])(
    'refuses the edge %s -> %s that is not in the table',
    (from, to) => {
      const input = contract(from);

      const result = transitionMissionStatus(input, to, 'post-battle');

      expect(result).toEqual({
        ok: false,
        mission: input,
        reason: 'not-allowed',
      });
      expect(result.mission).toBe(input);
    },
  );

  describe.each([
    MissionStatus.SUCCESS,
    MissionStatus.PARTIAL,
    MissionStatus.FAILED,
    MissionStatus.BREACH,
  ])('a contract settled as %s', (settled) => {
    it.each(ALL_MISSION_STATUSES)(
      'refuses a move to %s and hands back the same object',
      (to) => {
        const input = contract(settled);

        const result = transitionMissionStatus(input, to, 'repair-merge');

        expect(result.ok).toBe(false);
        expect(result.mission).toBe(input);
        if (!result.ok) expect(result.reason).toBe('terminal');
      },
    );
  });
});

describe('acceptContract through the guard', () => {
  it('still activates a pending offer', () => {
    const campaign = createCampaign('Guard accept', 'mercenary');

    const next = acceptContract(campaign, contract(MissionStatus.PENDING));

    expect(next.missions.get('contract-1')?.status).toBe(MissionStatus.ACTIVE);
  });

  it('refuses to reactivate a settled contract instead of silently reopening it', () => {
    const campaign = createCampaign('Guard accept', 'mercenary');

    expect(() =>
      acceptContract(campaign, contract(MissionStatus.SUCCESS)),
    ).toThrow(/terminal/);
  });
});
