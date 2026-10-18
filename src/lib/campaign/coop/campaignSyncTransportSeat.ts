/**
 * G2-RESEAT-1: follows the active campaign transport bound to one seat.
 *
 * The registry notification is an invalidation signal only; every use
 * re-reads the getter. A seat detaches from transport A before it attaches
 * to B, a transport bound to another campaign, player or role is never
 * attached, adopted or closed, and nothing here creates or closes a socket.
 */
import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import {
  campaignSnapshotFromMessage,
  getActiveCampaignSyncTransport,
  subscribeActiveCampaignSyncTransport,
  type ICampaignSyncTransport,
} from './campaignSyncTransport';

export interface ICampaignSyncSeat {
  readonly matchId: string;
  readonly campaignId: string;
  readonly playerId: string;
  readonly role: 'host' | 'guest';
}

/** The active transport for `seat`'s match, only while bound to that seat. */
export function boundCampaignSyncTransport(
  seat: ICampaignSyncSeat,
): ICampaignSyncTransport | null {
  const active = getActiveCampaignSyncTransport(seat.matchId);
  return active?.campaignId === seat.campaignId &&
    active.playerId === seat.playerId &&
    active.role === seat.role
    ? active
    : null;
}

/**
 * Calls `attach` for each transport bound to `seat` in turn (subscribe, then
 * reconcile, so no change between the first read and the subscription is
 * missed). `replaced` is false for the first one. The returned disposer
 * ends the subscription and calls the current transport's own detach.
 */
export function followCampaignSyncSeat(
  seat: ICampaignSyncSeat,
  attach: (transport: ICampaignSyncTransport, replaced: boolean) => () => void,
): () => void {
  let seated: ICampaignSyncTransport | null = null;
  let seatedOnce = false;
  let detach = (): void => undefined;
  let live = true;
  const reconcile = (): void => {
    const next = live ? boundCampaignSyncTransport(seat) : null;
    if (next === seated) return;
    const previous = detach;
    detach = () => undefined;
    seated = next;
    previous();
    if (!next) return;
    const replaced = seatedOnce;
    seatedOnce = true;
    const off = attach(next, replaced);
    if (seated === next) detach = off;
    else off();
  };
  const unsubscribe = subscribeActiveCampaignSyncTransport(
    seat.matchId,
    reconcile,
  );
  reconcile();
  return () => {
    live = false;
    unsubscribe();
    reconcile();
  };
}

/**
 * The first snapshot heard on whichever transport is bound to `seat`. It
 * rejects on that transport's error, a snapshot for another campaign, the
 * one fixed timeout or `signal`, and always disposes its listeners first.
 */
export function waitForSeatCampaignSnapshot(
  seat: ICampaignSyncSeat,
  signal: AbortSignal,
  timeoutMs: number,
): Promise<ICampaignEvent<'CampaignSnapshotPublished'>> {
  return new Promise((resolve, reject) => {
    const settle = (
      error: Error | null,
      snapshot?: ICampaignEvent<'CampaignSnapshotPublished'>,
    ): void => {
      clearTimeout(timeout);
      stopFollowing();
      signal.removeEventListener('abort', cancel);
      if (snapshot && !error) resolve(snapshot);
      else reject(error ?? new Error('Campaign sync error'));
    };
    const cancel = (): void => settle(new Error('Campaign join cancelled'));
    const timeout = setTimeout(() => {
      settle(new Error('Timed out waiting for the host campaign snapshot'));
    }, timeoutMs);
    const stopFollowing = followCampaignSyncSeat(seat, (transport) => {
      const offFrame = transport.onFrame((message) => {
        const snapshot = campaignSnapshotFromMessage(message);
        if (!snapshot) return;
        const ours =
          snapshot.campaignId === seat.campaignId &&
          snapshot.payload.state.campaignId === seat.campaignId;
        settle(
          ours ? null : new Error('The host snapshot is for another campaign'),
          snapshot,
        );
      });
      const offError = transport.onError((error) => {
        settle(error instanceof Error ? error : null);
      });
      return () => {
        offFrame();
        offError();
      };
    });
    signal.addEventListener('abort', cancel);
  });
}
