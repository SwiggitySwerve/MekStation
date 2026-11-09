import {
  assertMatchCreateStatus,
  assertMatchStatusTransition,
  canTransitionMatchStatus,
  InvalidMatchStatusTransitionError,
  MATCH_STATUS_TRANSITIONS,
  MATCH_STATUSES,
} from '../MatchStatus';
import { LobbyUpdatedSchema } from '../Protocol';

describe('MatchStatus', () => {
  it('pins the persisted values and the transition table', () => {
    expect([...MATCH_STATUSES]).toEqual(['lobby', 'active', 'completed']);
    expect(MATCH_STATUS_TRANSITIONS).toEqual({
      lobby: ['active', 'completed'],
      active: ['completed'],
      completed: [],
    });
  });

  it('covers every status and only targets known statuses', () => {
    expect(Object.keys(MATCH_STATUS_TRANSITIONS).sort()).toEqual(
      [...MATCH_STATUSES].sort(),
    );
    for (const targets of Object.values(MATCH_STATUS_TRANSITIONS)) {
      for (const target of targets) expect(MATCH_STATUSES).toContain(target);
    }
  });

  it('allows a same-status write and refuses a backwards edge', () => {
    for (const status of MATCH_STATUSES) {
      expect(canTransitionMatchStatus(status, status)).toBe(true);
    }
    expect(canTransitionMatchStatus('completed', 'active')).toBe(false);
    expect(canTransitionMatchStatus('active', 'lobby')).toBe(false);
  });

  it('throws a typed error naming both statuses', () => {
    expect(() => assertMatchStatusTransition('completed', 'active')).toThrow(
      InvalidMatchStatusTransitionError,
    );
    try {
      assertMatchStatusTransition('completed', 'active');
    } catch (error) {
      expect(error).toMatchObject({ from: 'completed', to: 'active' });
    }
    expect(() => assertMatchStatusTransition('lobby', 'active')).not.toThrow();
  });

  it('creates only lobby or active matches', () => {
    expect(() => assertMatchCreateStatus('lobby')).not.toThrow();
    expect(() => assertMatchCreateStatus('active')).not.toThrow();
    expect(() => assertMatchCreateStatus('completed')).toThrow(
      InvalidMatchStatusTransitionError,
    );
  });

  it('derives the LobbyUpdated wire enum from the same list', () => {
    expect(LobbyUpdatedSchema.shape.status.options).toEqual([
      ...MATCH_STATUSES,
    ]);
  });
});
