import { AuthorizedViewerResolver, type IMembershipRecord, type IMembershipSource } from '../authorization/AuthorizedViewer';
import { authorizeGmCombatCorrection } from '../gmCorrectionAuthority';

function membership(role: 'gm' | 'player' = 'gm'): IMembershipRecord {
  return { principalId: 'gm', principalKind: 'human', campaignId: 'campaign', campaignSessionId: 'match', matchId: 'match', participantId: 'participant', role, ownedForceIds: [], membershipRevision: 1, active: true };
}

describe('hosted GM correction authority', () => {
  it('accepts a durable GM without own-unit grants or a playing seat', async () => {
    const row = membership();
    const source: IMembershipSource = { lookupMembership: async () => row, currentMembershipRevision: async () => row.membershipRevision };
    const resolver = new AuthorizedViewerResolver(source);
    await expect(authorizeGmCombatCorrection(resolver, 'gm', 'gm', 'match')).resolves.toMatchObject({ role: 'gm', ownedForceIds: [] });
  });

  it('refuses a host/player rather than elevating it to GM', async () => {
    const row = membership('player');
    const source: IMembershipSource = { lookupMembership: async () => row, currentMembershipRevision: async () => row.membershipRevision };
    await expect(authorizeGmCombatCorrection(new AuthorizedViewerResolver(source), 'gm', 'gm', 'match')).rejects.toThrow('gm-correction-gm-required');
  });

  it('refuses an envelope principal mismatch before looking up membership', async () => {
    const lookupMembership = jest.fn(async () => membership());
    const resolver = new AuthorizedViewerResolver({ lookupMembership, currentMembershipRevision: async () => 1 });
    await expect(authorizeGmCombatCorrection(resolver, 'connection', 'gm', 'match')).rejects.toThrow('gm-correction-principal-mismatch');
    expect(lookupMembership).not.toHaveBeenCalled();
  });

  it('rechecks revocation after an earlier authorized preview', async () => {
    let row = membership();
    const resolver = new AuthorizedViewerResolver({ lookupMembership: async () => row, currentMembershipRevision: async () => row.membershipRevision });
    await authorizeGmCombatCorrection(resolver, 'gm', 'gm', 'match');
    row = { ...row, active: false, membershipRevision: 2 };
    await expect(authorizeGmCombatCorrection(resolver, 'gm', 'gm', 'match')).rejects.toThrow();
  });
});
