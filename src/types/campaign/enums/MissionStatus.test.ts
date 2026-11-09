import { createMission, isTerminalStatus } from '../Mission';
import {
  ALL_MISSION_STATUSES,
  canTransitionMissionStatus,
  isTerminalMissionStatus,
  MISSION_TRANSITIONS,
  missionPayoutOutcome,
  MissionStatus,
  parseMissionStatus,
} from './MissionStatus';

describe('isTerminalMissionStatus', () => {
  it.each([
    [MissionStatus.ACTIVE, false],
    [MissionStatus.PENDING, false],
    [MissionStatus.SUCCESS, true],
    [MissionStatus.PARTIAL, true],
    [MissionStatus.FAILED, true],
    [MissionStatus.BREACH, true],
  ] as const)(
    'classifies %s and preserves the mission helper',
    (status, terminal) => {
      const mission = createMission({ id: 'mission-1', name: 'Test', status });

      expect(isTerminalStatus(mission)).toBe(terminal);
      expect(isTerminalMissionStatus(status)).toBe(terminal);
    },
  );

  it('keeps a value outside the union non-terminal, as before the table', () => {
    expect(isTerminalMissionStatus('Cancelled' as MissionStatus)).toBe(false);
    expect(isTerminalMissionStatus('constructor' as MissionStatus)).toBe(false);
  });
});

describe('MISSION_TRANSITIONS', () => {
  // The characterized edges: PENDING reaches a terminal state directly only
  // for compatibility with contracts that were never accepted through the
  // market (post-battle used to flip any non-terminal status).
  const EXPECTED: Record<MissionStatus, readonly MissionStatus[]> = {
    [MissionStatus.PENDING]: [
      MissionStatus.ACTIVE,
      MissionStatus.SUCCESS,
      MissionStatus.PARTIAL,
      MissionStatus.FAILED,
      MissionStatus.BREACH,
    ],
    [MissionStatus.ACTIVE]: [
      MissionStatus.SUCCESS,
      MissionStatus.PARTIAL,
      MissionStatus.FAILED,
      MissionStatus.BREACH,
    ],
    [MissionStatus.SUCCESS]: [],
    [MissionStatus.PARTIAL]: [],
    [MissionStatus.FAILED]: [],
    [MissionStatus.BREACH]: [],
  };

  it('lists exactly the six statuses of the union', () => {
    expect([...ALL_MISSION_STATUSES].sort()).toEqual(
      Object.keys(EXPECTED).sort(),
    );
    expect(Object.keys(MISSION_TRANSITIONS).sort()).toEqual(
      Object.keys(EXPECTED).sort(),
    );
  });

  it.each(ALL_MISSION_STATUSES)('%s has the characterized edges', (from) => {
    expect([...MISSION_TRANSITIONS[from]]).toEqual([...EXPECTED[from]]);
  });

  it.each(ALL_MISSION_STATUSES)(
    'canTransitionMissionStatus agrees with the table from %s',
    (from) => {
      for (const to of ALL_MISSION_STATUSES) {
        expect(canTransitionMissionStatus(from, to)).toBe(
          EXPECTED[from].includes(to),
        );
      }
    },
  );

  it('derives terminal from an empty edge list, so a settled mission has no way out', () => {
    for (const status of ALL_MISSION_STATUSES) {
      expect(isTerminalMissionStatus(status)).toBe(
        EXPECTED[status].length === 0,
      );
    }
  });
});

describe('missionPayoutOutcome', () => {
  it.each([
    [MissionStatus.SUCCESS, 'success'],
    [MissionStatus.PARTIAL, 'partial'],
    [MissionStatus.FAILED, 'failure'],
    [MissionStatus.BREACH, 'failure'],
    [MissionStatus.ACTIVE, 'failure'],
    [MissionStatus.PENDING, 'failure'],
  ] as const)('maps %s to %s', (status, outcome) => {
    expect(missionPayoutOutcome(status)).toBe(outcome);
  });
});

describe('parseMissionStatus (persisted-value shim)', () => {
  it.each(ALL_MISSION_STATUSES)('passes the live value %s through', (s) => {
    expect(parseMissionStatus(s)).toBe(s);
  });

  it.each(['Cancelled', 'Aborted'])(
    'maps the retired %s to FAILED, its old terminal failure payout',
    (legacy) => {
      const parsed = parseMissionStatus(legacy);

      expect(parsed).toBe(MissionStatus.FAILED);
      expect(missionPayoutOutcome(parsed!)).toBe('failure');
      expect(isTerminalMissionStatus(parsed!)).toBe(true);
    },
  );

  it.each([
    'bogus',
    '',
    'active',
    'constructor',
    '__proto__',
    'toString',
    42,
    null,
    undefined,
    {},
  ])('returns undefined for the unknown value %p', (value) => {
    expect(parseMissionStatus(value)).toBeUndefined();
  });
});
