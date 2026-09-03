/**
 * Durable campaign-GM probe for match-tier host migration (LAW 62).
 *
 * HostMigration must not value-import SQLite: the match store already
 * carries an optional `ICampaignSessionParticipantPort` from durable
 * compose. ServerMatchHost binds this default at construction; tests
 * inject a stub or omit the port so ordinary D4 migration stays intact.
 */

import {
  hasParticipantStore,
  isParticipantStoreReady,
} from '@/lib/events/storeCapabilityPorts';

import type { IMatchStore } from '../IMatchStore';

export interface ICampaignGmHostProbe {
  /**
   * Whether this player holds the active `gm` seat for the match's
   * campaign session. WHY: that row is written at co-op creation
   * (`seat: 'gm'`) and is the durable GM identity; `hostPlayerId`
   * alone is also the tactical host and would migrate.
   */
  isCampaignGmHost(input: {
    readonly matchId: string;
    readonly campaignId: string;
    readonly playerId: string;
  }): boolean | Promise<boolean>;
}

/**
 * Bind the store-backed GM probe used by ServerMatchHost.
 * WHY: production must read the durable seat, while an in-memory store
 * or unreadied DurableMatchStore still answers false so D4 is unchanged.
 */
export function bindCampaignGmHostProbe(
  store: IMatchStore,
): ICampaignGmHostProbe {
  return {
    isCampaignGmHost(input) {
      return isDurableCampaignGmSeat(store, input);
    },
  };
}

/**
 * Positive evidence only: missing port, unreadied capability DB, or
 * no active `gm` row all answer false so host migration runs as today.
 */
function isDurableCampaignGmSeat(
  store: IMatchStore,
  input: {
    readonly matchId: string;
    readonly campaignId: string;
    readonly playerId: string;
  },
): boolean {
  if (!hasParticipantStore(store) || !isParticipantStoreReady(store)) {
    return false;
  }
  const membership = store.activeCampaignSessionMembership(
    input.campaignId,
    input.matchId,
    input.playerId,
  );
  return membership !== null && membership.seat === 'gm';
}
