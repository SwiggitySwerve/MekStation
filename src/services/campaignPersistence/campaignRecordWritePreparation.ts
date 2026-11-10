/** Source identity preparation for a campaign row write; no IO or domain rules. */
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import {
  evaluateSourceMutationGate,
  REPLICA_NOT_SOURCE_REFUSAL_REASON,
  sourceCampaignAuthority,
  UNKNOWN_AUTHORITY_ROLE_REASON,
} from '@/lib/campaign/authority/campaignAuthority';
import { hydrateCampaignRecord } from '@/lib/campaign/authority/campaignAuthorityHydrate';

type PreparedWrite =
  | {
      readonly kind: 'ok';
      readonly record: SerializedCampaign;
      readonly storedBody: SerializedCampaign['body'] | null;
    }
  | {
      readonly kind: 'refused';
      readonly reason: typeof REPLICA_NOT_SOURCE_REFUSAL_REASON;
    }
  | {
      readonly kind: 'failed';
      readonly reason: typeof UNKNOWN_AUTHORITY_ROLE_REASON;
    };

/**
 * Hydrate incoming and stored envelopes, refuse replica mutation, and
 * pin instanceId/authority. Extracted so saveCampaign stays the CAS
 * writer rather than mixing identity rules with SQL.
 */
export function prepareCampaignWrite(args: {
  readonly envelope: SerializedCampaign;
  readonly hostInstanceId: string;
  readonly row: { version: number; payload: string } | undefined;
}): PreparedWrite {
  const incoming = hydrateCampaignRecord(args.envelope, args.hostInstanceId);
  if (incoming.kind === 'failed') {
    return incoming;
  }
  const incomingGate = evaluateSourceMutationGate(incoming.record.authority);
  if (incomingGate.kind !== 'ok') {
    return incomingGate;
  }

  if (!args.row) {
    return {
      kind: 'ok',
      storedBody: null,
      record: {
        ...incoming.record,
        instanceId: args.hostInstanceId,
        authority: sourceCampaignAuthority(),
      },
    };
  }

  let storedJson: unknown;
  try {
    storedJson = JSON.parse(args.row.payload);
  } catch {
    return {
      kind: 'ok',
      storedBody: null,
      record: {
        ...incoming.record,
        instanceId: args.hostInstanceId,
        authority: sourceCampaignAuthority(),
      },
    };
  }

  const stored = hydrateCampaignRecord(storedJson, args.hostInstanceId);
  if (stored.kind === 'failed') {
    return stored;
  }
  const storedGate = evaluateSourceMutationGate(stored.record.authority);
  if (storedGate.kind !== 'ok') {
    return storedGate;
  }
  return {
    kind: 'ok',
    storedBody: stored.record.body,
    record: {
      ...incoming.record,
      instanceId: stored.record.instanceId,
      authority: stored.record.authority,
    },
  };
}
