import { createMission, isTerminalStatus } from '../Mission';
import { isTerminalMissionStatus, MissionStatus } from './MissionStatus';

describe('isTerminalMissionStatus', () => {
  it.each([
    [MissionStatus.ACTIVE, false],
    [MissionStatus.PENDING, false],
    [MissionStatus.SUCCESS, true],
    [MissionStatus.PARTIAL, true],
    [MissionStatus.FAILED, true],
    [MissionStatus.BREACH, true],
    [MissionStatus.CANCELLED, true],
    [MissionStatus.ABORTED, true],
  ] as const)(
    'classifies %s and preserves the mission helper',
    (status, terminal) => {
      const mission = createMission({ id: 'mission-1', name: 'Test', status });

      expect(isTerminalStatus(mission)).toBe(terminal);
      expect(isTerminalMissionStatus(status)).toBe(terminal);
    },
  );
});
