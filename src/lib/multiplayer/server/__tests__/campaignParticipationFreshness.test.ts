/**
 * Only the affected player's mission choice goes stale (task 9.2).
 *
 * The task's wording is exact — "clear ONLY affected readiness" — so
 * the load-bearing rows here are as much about what SURVIVES as what
 * clears. A check that invalidated everyone on any campaign change
 * would satisfy the obvious case and quietly ruin co-op: one player
 * losing a mech would reset the other player's choice too.
 */

import type { ICampaignRosterUnit } from '@/types/campaign/CampaignSync';

import { ForceRole, FormationLevel } from '@/types/campaign/enums';

import type { ICampaignParticipationRecord } from '../CampaignHostRegistry';

import {
  participationIsFresh,
  unitIsDeployable,
} from '../campaignParticipationFreshness';

function roster(
  entries: Array<[string, ICampaignRosterUnit['status']]>,
): Record<string, ICampaignRosterUnit> {
  const out: Record<string, ICampaignRosterUnit> = {};
  for (const [unitId, status] of entries) {
    out[unitId] = { unitId, designation: unitId, status };
  }
  return out;
}

function participation(
  playerId: string,
  unitIds: string[],
  choice: 'deploy' | 'command-hq' = 'deploy',
): ICampaignParticipationRecord {
  return {
    matchId: 'm1',
    missionId: 'mission-1',
    playerId,
    role: playerId === 'host' ? 'host' : 'guest',
    choice,
    force: {
      id: `force-${playerId}`,
      name: `force-${playerId}`,
      subForceIds: [],
      unitIds,
      forceType: ForceRole.STANDARD,
      formationLevel: FormationLevel.LANCE,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  } as ICampaignParticipationRecord;
}

describe('unitIsDeployable', () => {
  it('accepts an operational or damaged unit', () => {
    // Damaged still fights. Treating it as unusable would clear choices
    // after every scratch.
    const units = roster([
      ['ok', 'operational'],
      ['hurt', 'damaged'],
    ]);

    expect(unitIsDeployable('ok', units)).toBe(true);
    expect(unitIsDeployable('hurt', units)).toBe(true);
  });

  it('refuses a destroyed unit', () => {
    expect(unitIsDeployable('dead', roster([['dead', 'destroyed']]))).toBe(
      false,
    );
  });

  it('refuses a unit that left the roster entirely', () => {
    // Removal is at least as final as destruction, and a missing entry
    // read as "fine" is how a choice survives the unit behind it.
    expect(unitIsDeployable('gone', roster([['other', 'operational']]))).toBe(
      false,
    );
  });
});

describe('participationIsFresh', () => {
  it('keeps a choice whose whole force still stands', () => {
    const units = roster([
      ['a1', 'operational'],
      ['a2', 'damaged'],
    ]);

    expect(
      participationIsFresh(participation('host', ['a1', 'a2']), units),
    ).toBe(true);
  });

  it('stales a choice when ANY of its units is destroyed', () => {
    // Not just when all of them are. A lance with one dead mech is not
    // the force the player chose.
    const units = roster([
      ['a1', 'operational'],
      ['a2', 'destroyed'],
    ]);

    expect(
      participationIsFresh(participation('host', ['a1', 'a2']), units),
    ).toBe(false);
  });

  it('leaves the OTHER player alone', () => {
    // The row the task's wording is about. Host loses a mech; guest is
    // untouched and stays ready.
    const units = roster([
      ['a1', 'destroyed'],
      ['b1', 'operational'],
    ]);

    expect(participationIsFresh(participation('host', ['a1']), units)).toBe(
      false,
    );
    expect(participationIsFresh(participation('guest', ['b1']), units)).toBe(
      true,
    );
  });

  it('keeps a command-hq choice whatever happens to its force', () => {
    // That player puts nothing on the map, so the state of their units
    // cannot invalidate the choice. Staling it would drag a player out
    // of a mission they were never deploying into.
    const units = roster([['a1', 'destroyed']]);

    expect(
      participationIsFresh(participation('host', ['a1'], 'command-hq'), units),
    ).toBe(true);
  });

  it('keeps a deploy choice with an empty force', () => {
    // Nothing to invalidate. `every` over an empty list is true, and
    // that is the right answer rather than an accident worth guarding.
    expect(participationIsFresh(participation('host', []), roster([]))).toBe(
      true,
    );
  });
});
