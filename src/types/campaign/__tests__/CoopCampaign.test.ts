/**
 * Tests for the CO2 co-op-play type set (task 1.4).
 *
 * Covers the type guards, the runtime proposal/decision validators, and
 * a JSON serialization round-trip for proposals and decisions.
 *
 * @spec openspec/changes/add-coop-campaign-play/specs/coop-campaign-sync/spec.md
 */

import type { ICampaignIntent } from '../CampaignSync';
import type { IGuestProposal } from '../CoopCampaign';

import {
  PROPOSAL_VETOED,
  isCoopParticipationChoice,
  isGmArbitrationMode,
  isGmDecision,
  toProposalVetoError,
} from '../CoopCampaign';
import { parseGmDecision, parseGuestProposal } from '../coopCampaignSchemas';

const SPEND_INTENT: ICampaignIntent = {
  kind: 'SpendFunds',
  campaignId: 'campaign-1',
  intentId: 'intent-1',
  payload: { amount: 50_000, reason: 'Ammo restock' },
};

function makeProposal(): IGuestProposal {
  return {
    proposalId: 'proposal-1',
    campaignId: 'campaign-1',
    proposingPlayerId: 'guest-player',
    ts: '2026-05-19T10:00:00.000Z',
    intent: SPEND_INTENT,
  };
}

describe('CoopParticipationChoice guard', () => {
  it('accepts the two valid choices', () => {
    expect(isCoopParticipationChoice('deploy')).toBe(true);
    expect(isCoopParticipationChoice('command-hq')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isCoopParticipationChoice('spectate')).toBe(false);
    expect(isCoopParticipationChoice(null)).toBe(false);
    expect(isCoopParticipationChoice(42)).toBe(false);
  });
});

describe('GmArbitrationMode guard', () => {
  it('accepts the two valid modes', () => {
    expect(isGmArbitrationMode('auto-approve')).toBe(true);
    expect(isGmArbitrationMode('host-review')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isGmArbitrationMode('manual')).toBe(false);
    expect(isGmArbitrationMode(undefined)).toBe(false);
  });
});

describe('GmDecision guard', () => {
  it('accepts approve and veto', () => {
    expect(isGmDecision('approve')).toBe(true);
    expect(isGmDecision('veto')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isGmDecision('reject')).toBe(false);
    expect(isGmDecision({})).toBe(false);
  });
});

describe('parseGuestProposal', () => {
  it('accepts a well-formed proposal', () => {
    const parsed = parseGuestProposal(makeProposal());
    expect(parsed).not.toBeNull();
    expect(parsed?.proposalId).toBe('proposal-1');
    expect(parsed?.intent.kind).toBe('SpendFunds');
  });

  it('rejects a proposal missing the proposalId', () => {
    const { proposalId, ...rest } = makeProposal();
    void proposalId;
    expect(parseGuestProposal(rest)).toBeNull();
  });

  it('rejects a proposal wrapping a malformed intent', () => {
    expect(
      parseGuestProposal({ ...makeProposal(), intent: { kind: 'NotAKind' } }),
    ).toBeNull();
  });

  it('rejects a non-object candidate', () => {
    expect(parseGuestProposal('proposal')).toBeNull();
    expect(parseGuestProposal(null)).toBeNull();
  });
});

describe('parseGmDecision', () => {
  it('accepts approve and veto', () => {
    expect(parseGmDecision('approve')).toBe('approve');
    expect(parseGmDecision('veto')).toBe('veto');
  });

  it('rejects an invalid decision', () => {
    expect(parseGmDecision('maybe')).toBeNull();
    expect(parseGmDecision(null)).toBeNull();
  });
});

describe('toProposalVetoError', () => {
  it('builds a typed PROPOSAL_VETOED error carrying the proposalId', () => {
    const error = toProposalVetoError('proposal-7');
    expect(error.ok).toBe(false);
    expect(error.code).toBe(PROPOSAL_VETOED);
    expect(error.code).not.toBe('INVALID_CAMPAIGN_INTENT');
    expect(error.proposalId).toBe('proposal-7');
  });
});

describe('serialization round-trip', () => {
  it('a proposal survives JSON.parse(JSON.stringify(x)) without loss', () => {
    const proposal = makeProposal();
    const roundTripped = JSON.parse(JSON.stringify(proposal)) as IGuestProposal;
    expect(roundTripped).toEqual(proposal);
    // The round-tripped proposal still parses at the boundary.
    expect(parseGuestProposal(roundTripped)).not.toBeNull();
  });

  it('a decision survives a JSON round-trip and re-parses', () => {
    for (const decision of ['approve', 'veto'] as const) {
      const roundTripped = JSON.parse(JSON.stringify(decision));
      expect(parseGmDecision(roundTripped)).toBe(decision);
    }
  });

  it('a veto error survives a JSON round-trip', () => {
    const error = toProposalVetoError('proposal-9');
    expect(JSON.parse(JSON.stringify(error))).toEqual(error);
  });
});
