import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import {
  CURRENT_REPLAY_FIDELITY_VERSION,
  REPLAY_FIDELITY_RULES,
  readReplayFidelityVersion,
  validateReplayFidelityVersion,
  assertReplayFidelityRuleRelease,
  isReplayFidelityRuleEnabled,
} from '@/types/gameplay/ReplayFidelityVersion';
import { createGameCreatedEvent } from '@/utils/gameplay/gameEvents/lifecycle';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSessionCore';

import { R11A_RELEASE, C1C_2B_WITNESS } from './replayFidelityVersion.rules.fixture';

describe('producer-rules version contract', () => {
  it('reads absent as 1 without adding a key or changing imported bytes', () => {
    const payload = Object.freeze({ schemaVersion: 2, replaySource: 'quick' });
    const before = JSON.stringify(payload);
    expect(readReplayFidelityVersion(payload)).toBe(1);
    expect(JSON.stringify(payload)).toBe(before);
    expect(Object.hasOwn(payload, 'replayFidelityVersion')).toBe(false);
  });

  it.each([1, 2])('preserves explicit %s', (version) => {
    const payload = Object.freeze({ replayFidelityVersion: version });
    expect(readReplayFidelityVersion(payload)).toBe(version);
    expect(payload.replayFidelityVersion).toBe(version);
  });

  it.each([undefined, null, 0, -1, 1.5, '2', false, NaN, Infinity, 3, 99])(
    'rejects invalid or unsupported explicit %s', (value) => {
      expect(() => validateReplayFidelityVersion(value)).toThrow();
      expect(() => readReplayFidelityVersion({ replayFidelityVersion: value })).toThrow();
    },
  );

  it('stamps both factory overloads with the shared writer 2', () => {
    const config = { mapRadius: 3, turnLimit: 1, victoryConditions: [], optionalRules: [] };
    expect(CURRENT_REPLAY_FIDELITY_VERSION).toBe(2);
    for (const event of [
      createGameCreatedEvent('stamp-test', config, []),
      createGameCreatedEvent({ gameId: 'stamp-test', config, units: [] }),
    ]) expect(event.payload).toHaveProperty('replayFidelityVersion', 2);
  });

  it('keeps the historical recording raw bytes and absent stamp unchanged on import/export', () => {
    const bytes = readFileSync('e2e/scenario-packs/encounter/combat-midbattle.matchlog.json');
    expect(createHash('sha256').update(bytes).digest('hex')).toBe('4366ce6cb897f79ea9f75e9b88a48f21db16864e56c58cbe790d7fa72c6833a9');
    const stored = JSON.parse(bytes.toString('utf8'));
    const before = JSON.stringify(stored.events);
    const session = hydrateGameSessionFromEvents(stored.matchId, stored.events);
    expect(readReplayFidelityVersion(session.events[0].payload)).toBe(1);
    expect(Object.hasOwn(session.events[0].payload, 'replayFidelityVersion')).toBe(false);
    expect(JSON.stringify(session.events)).toBe(before);
    expect(readFileSync('e2e/scenario-packs/encounter/combat-midbattle.matchlog.json')).toEqual(bytes);
  });

  it('freezes release 2 without a counter rule and requires the next semantic release to be 3', () => {
    expect(REPLAY_FIDELITY_RULES).toEqual(R11A_RELEASE.rules);
    const next = { writer: C1C_2B_WITNESS.writer, rules: { counter: C1C_2B_WITNESS.rule } };
    expect(() => assertReplayFidelityRuleRelease(R11A_RELEASE, next)).not.toThrow();
    expect(() => assertReplayFidelityRuleRelease(R11A_RELEASE, { ...next, writer: 4 })).toThrow();
    expect(() => assertReplayFidelityRuleRelease(R11A_RELEASE, { ...next, rules: { counter: { ...next.rules.counter, introducedIn: 2 } } })).toThrow();
    const counter = (version: number) => isReplayFidelityRuleEnabled(version, next.rules.counter)
      ? C1C_2B_WITNESS.after : C1C_2B_WITNESS.before;
    expect(counter(2)).toBe(7);
    expect(counter(3)).toBe(8);
    expect(counter(4)).toBe(8);
    expect(() => assertReplayFidelityRuleRelease(next, { writer: 4, rules: { counter: { introducedIn: 3, definition: 'changed old rule' } } })).toThrow();
  });
});
