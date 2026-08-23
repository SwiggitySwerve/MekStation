/**
 * D2 authority parse/gate tests. Unknown roles fail closed; replica
 * mutation is a typed refusal distinct from a generic failure.
 */

import {
  evaluateSourceMutationGate,
  parseCampaignAuthority,
  REPLICA_NOT_SOURCE_REFUSAL_REASON,
  UNKNOWN_AUTHORITY_ROLE_REASON,
} from '@/lib/campaign/authority/campaignAuthority';
import { hydrateCampaignRecord } from '@/lib/campaign/authority/campaignAuthorityHydrate';

describe('campaign authority (D2)', () => {
  it('parses source and replica; unknown roles fail closed', () => {
    expect(parseCampaignAuthority({ role: 'source' })).toEqual({
      kind: 'ok',
      authority: { role: 'source' },
    });
    expect(
      parseCampaignAuthority({
        role: 'replica',
        sourceInstanceId: 'src-1',
        grantId: 'grant-1',
        scopes: ['campaign'],
      }).kind,
    ).toBe('ok');
    expect(parseCampaignAuthority({ role: 'typo' })).toEqual({
      kind: 'failed',
      reason: UNKNOWN_AUTHORITY_ROLE_REASON,
    });
    expect(parseCampaignAuthority(undefined)).toEqual({
      kind: 'failed',
      reason: UNKNOWN_AUTHORITY_ROLE_REASON,
    });
  });

  it('refuses replica mutation and fails unknown roles with distinct kinds', () => {
    const replicaGate = evaluateSourceMutationGate({
      role: 'replica',
      sourceInstanceId: 'src-1',
      grantId: 'grant-1',
      scopes: ['campaign'],
    });
    expect(replicaGate).toEqual({
      kind: 'refused',
      reason: REPLICA_NOT_SOURCE_REFUSAL_REASON,
    });
    const unknownGate = evaluateSourceMutationGate({ role: 'typo' });
    expect(unknownGate).toEqual({
      kind: 'failed',
      reason: UNKNOWN_AUTHORITY_ROLE_REASON,
    });
    expect(replicaGate.kind).not.toBe(unknownGate.kind);
    expect(evaluateSourceMutationGate({ role: 'source' })).toEqual({
      kind: 'ok',
    });
  });

  it('hydrates a v2 unknown-role record as failed, not as source', () => {
    const corrupt = {
      schemaVersion: 2,
      campaignId: 'camp-corrupt-role',
      savedAt: '2026-08-23T00:00:00.000Z',
      originDeviceId: 'device-x',
      version: 1,
      instanceId: 'host-x',
      authority: { role: 'typo' },
      body: { id: 'camp-corrupt-role' },
    };
    const hydrated = hydrateCampaignRecord(corrupt, 'host-fallback');
    expect(hydrated.kind).toBe('failed');
    if (hydrated.kind === 'failed') {
      expect(hydrated.reason).toBe(UNKNOWN_AUTHORITY_ROLE_REASON);
    }
  });
});
