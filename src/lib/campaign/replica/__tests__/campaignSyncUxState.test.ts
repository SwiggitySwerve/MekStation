/**
 * Synchronization posture and the command gate (task 5.6, D5/D6).
 *
 * The property that matters is not which label renders — it is that
 * commands are offered in exactly ONE posture. A guest proposing from a
 * view that is mid-backfill, reconnecting, or refused is proposing
 * blind, and the surface already knows it.
 */

import type { ICampaignSyncUxInput } from '../campaignSyncUxState';

import {
  campaignSyncPostureFromMirrorStatus,
  deriveCampaignSyncUxPosture,
} from '../campaignSyncUxState';

/** A converged replica; every row below degrades exactly one field. */
function converged(): ICampaignSyncUxInput {
  return {
    connection: 'connected',
    refusedReason: null,
    awaitingRebaseline: false,
    deliveredSequence: 7,
    appliedSequence: 7,
    joinCompleted: true,
  };
}

describe('campaign sync posture', () => {
  it('enables commands only when fully converged', () => {
    const posture = deriveCampaignSyncUxPosture(converged());

    expect(posture.state).toBe('live');
    expect(posture.commandsEnabled).toBe(true);
  });

  it.each<[string, Partial<ICampaignSyncUxInput>, string]>([
    ['a refusal', { refusedReason: 'revoked' }, 'blocked'],
    ['a pending rebaseline', { awaitingRebaseline: true }, 'resyncing'],
    ['a dropped socket', { connection: 'disconnected' }, 'retrying'],
    ['an opening socket', { connection: 'connecting' }, 'catching-up'],
    ['an unfinished join', { joinCompleted: false }, 'catching-up'],
    ['an unapplied tail', { appliedSequence: 5 }, 'behind'],
  ])('reports %s as %s with commands disabled', (_label, degrade, expected) => {
    const posture = deriveCampaignSyncUxPosture({
      ...converged(),
      ...degrade,
    });

    expect(posture.state).toBe(expected);
    // The whole point of the table: every degraded posture, without
    // exception, withholds the command affordance.
    expect(posture.commandsEnabled).toBe(false);
  });

  it('ranks a refusal above a healthy-looking socket', () => {
    // Connected, joined, fully applied - and refused. A precedence that
    // let the happy signals win would show a live, actionable surface
    // for a share that has been withdrawn.
    const posture = deriveCampaignSyncUxPosture({
      ...converged(),
      refusedReason: 'revoked',
    });

    expect(posture.state).toBe('blocked');
  });

  it('separates a first connection from a reconnect', () => {
    // "Reconnecting..." on a first load claims something was working a
    // moment ago. The two are different events to a player even though
    // both mean "not talking to the owner right now".
    expect(
      deriveCampaignSyncUxPosture({
        ...converged(),
        connection: 'connecting',
      }).state,
    ).toBe('catching-up');
    expect(
      deriveCampaignSyncUxPosture({
        ...converged(),
        connection: 'disconnected',
      }).state,
    ).toBe('retrying');
  });

  it('ranks a rebaseline above a reconnecting socket', () => {
    const posture = deriveCampaignSyncUxPosture({
      ...converged(),
      awaitingRebaseline: true,
      connection: 'disconnected',
    });

    expect(posture.state).toBe('resyncing');
  });

  it('never says anything about how much is unseen', () => {
    // A distance on screen for a SCOPED view is an inference channel: a
    // guest comparing their lag against what they CAN see would learn how
    // much was withheld. Tasks 3.2/3.4 closed that; a status line must
    // not reopen it.
    const messages = [
      deriveCampaignSyncUxPosture(converged()),
      deriveCampaignSyncUxPosture({ ...converged(), appliedSequence: 1 }),
      deriveCampaignSyncUxPosture({ ...converged(), joinCompleted: false }),
      deriveCampaignSyncUxPosture({ ...converged(), refusedReason: 'x' }),
    ].map((posture) => posture.message);

    for (const message of messages) {
      expect(message).not.toMatch(/\d/);
      expect(message.toLowerCase()).not.toMatch(
        /hidden|withheld|omitted|events behind|remaining/,
      );
    }
  });
});

describe('mirror status bridge', () => {
  it('treats a missing credential as blocked, not as retrying', () => {
    const posture = campaignSyncPostureFromMirrorStatus('missing-token');

    // No amount of waiting produces a credential. "Reconnecting..." here
    // would leave a player waiting for something that cannot happen.
    expect(posture.state).toBe('blocked');
    expect(posture.commandsEnabled).toBe(false);
  });

  it('treats a disconnected host as retrying', () => {
    expect(campaignSyncPostureFromMirrorStatus('paused').state).toBe(
      'retrying',
    );
  });

  it('only reports live once the mirror is synced', () => {
    expect(campaignSyncPostureFromMirrorStatus('connecting').state).toBe(
      'catching-up',
    );
    const synced = campaignSyncPostureFromMirrorStatus('synced');
    expect(synced.state).toBe('live');
    expect(synced.commandsEnabled).toBe(true);
  });
});
