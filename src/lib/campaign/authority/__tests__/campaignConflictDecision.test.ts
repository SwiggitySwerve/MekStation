/**
 * The command-based conflict decision (umbrella task 8.4).
 *
 * `Campaign Conflict Resolution Is Command-Based` asks for three
 * outcomes and one prohibition: a disjoint stale command MAY revalidate
 * and serialize; a same-field stale command SHALL be refused with the
 * current revision and a recovery action; and nothing is appended on a
 * refusal. The prohibition is structural - this module is pure and has
 * no store - so the rows below cover the outcomes and the taxonomy.
 *
 * The row that matters most is the declared field-set: the client's
 * claim about what its command changes is CHECKED against what the
 * server derived, and never used as an input to the verdict. A
 * declaration that could steer the decision would let a client describe
 * its overwrite as disjoint and have it serialized.
 */

import {
  EXPECTED_HEAD_RESYNC_ACTION,
  type ExpectedHeadRefusalCode,
} from '@/lib/events/journal/EventHistoryExpectedHead';

import type { ICampaignConflictHead } from '../campaignConflictDecision';

import {
  CAMPAIGN_CONFLICT_REBASE_ACTION,
  decideCampaignConflict,
} from '../campaignConflictDecision';

const HEAD: ICampaignConflictHead = { branchId: 'root', revision: 7 };

describe('decideCampaignConflict', () => {
  it('lets a command at the head through untouched', () => {
    expect(decideCampaignConflict(HEAD, { kind: 'at-head' })).toEqual({
      kind: 'current',
    });
  });

  it('serializes a stale command whose fields are disjoint', () => {
    const decision = decideCampaignConflict(HEAD, {
      kind: 'reconstructed',
      touchedFields: ['balance'],
      interveningFields: ['rosterUnits[unit-a]'],
      declaredFields: ['balance'],
    });

    expect(decision).toEqual({
      kind: 'revalidate',
      interveningFields: ['rosterUnits[unit-a]'],
    });
  });

  it('refuses a same-field stale command with the head and a resync', () => {
    const decision = decideCampaignConflict(HEAD, {
      kind: 'reconstructed',
      touchedFields: ['balance', 'day'],
      interveningFields: ['balance', 'rosterUnits[unit-a]'],
      declaredFields: ['day', 'balance'],
    });

    expect(decision).toEqual({
      kind: 'refused',
      code: 'STALE_REVISION' satisfies ExpectedHeadRefusalCode,
      reason: 'same-field-stale',
      head: HEAD,
      recoveryAction: EXPECTED_HEAD_RESYNC_ACTION,
      conflictingFields: ['balance'],
    });
  });

  it('refuses a stale command that declares nothing, and says rebase', () => {
    const decision = decideCampaignConflict(HEAD, {
      kind: 'reconstructed',
      touchedFields: ['balance'],
      interveningFields: ['rosterUnits[unit-a]'],
      declaredFields: null,
    });

    expect(decision).toMatchObject({
      kind: 'refused',
      reason: 'undeclared-field-set',
      head: HEAD,
      recoveryAction: CAMPAIGN_CONFLICT_REBASE_ACTION,
      conflictingFields: [],
    });
  });

  it('refuses a declaration that does not match what the server derived', () => {
    // Disjoint from the intervening facts, so a decision that trusted the
    // declaration would happily serialize this.
    const decision = decideCampaignConflict(HEAD, {
      kind: 'reconstructed',
      touchedFields: ['balance', 'day'],
      interveningFields: ['rosterUnits[unit-a]'],
      declaredFields: ['balance'],
    });

    expect(decision).toMatchObject({
      kind: 'refused',
      reason: 'declared-field-set-mismatch',
      recoveryAction: CAMPAIGN_CONFLICT_REBASE_ACTION,
    });
  });

  it('checks the declaration before the overlap, so a bad claim never gets a substantive verdict', () => {
    // Both defects at once: the declaration is wrong AND the command
    // collides. The mismatch is the more fundamental one.
    expect(
      decideCampaignConflict(HEAD, {
        kind: 'reconstructed',
        touchedFields: ['balance'],
        interveningFields: ['balance'],
        declaredFields: ['day'],
      }),
    ).toMatchObject({ reason: 'declared-field-set-mismatch' });
  });

  it('compares the declaration as a set, not as a sequence', () => {
    expect(
      decideCampaignConflict(HEAD, {
        kind: 'reconstructed',
        touchedFields: ['balance', 'day'],
        interveningFields: [],
        declaredFields: ['day', 'balance', 'day'],
      }),
    ).toMatchObject({ kind: 'revalidate' });
  });

  it('refuses a base revision the stream never had', () => {
    expect(
      decideCampaignConflict(HEAD, { kind: 'revision-unknown' }),
    ).toMatchObject({
      kind: 'refused',
      reason: 'base-revision-unknown',
      head: HEAD,
      recoveryAction: EXPECTED_HEAD_RESYNC_ACTION,
    });
  });

  it('carries the head verbatim on every refusal', () => {
    const other: ICampaignConflictHead = { branchId: 'root', revision: 42 };
    const decision = decideCampaignConflict(other, {
      kind: 'reconstructed',
      touchedFields: ['balance'],
      interveningFields: ['balance'],
      declaredFields: ['balance'],
    });

    expect(decision).toMatchObject({ head: other });
  });
});
