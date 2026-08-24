/**
 * The consuming device's own sync client (design D6, needed by task 4.5).
 *
 * D6 says the replica DEVICE's server process stores the scoped stream
 * it receives. Everything needed for that existed except the part that
 * actually goes and gets it: the grant channel serves a source, the
 * replica store ingests, but nothing dialled out from a consuming
 * device. This is that dialler - the piece that makes "each downstream
 * device has its own kind of server" true across two real processes
 * rather than only within one.
 *
 * Deliberate properties:
 *
 * - It RESUMES. The cursor comes from the replica store, so a restart
 *   continues where it left off instead of re-backfilling from zero,
 *   and the source can enforce exactly-once against it.
 * - It is strictly downstream. It only ever reads frames and writes its
 *   OWN replica stream; it holds no path back into the source, so a
 *   fault here cannot propagate upstream.
 * - Ingest failure is FATAL to the connection, not silently skipped. A
 *   gap or collision means the local copy no longer matches the source,
 *   and continuing to append onto a diverged stream would bury that.
 * - The socket factory is injected, so the client is testable without a
 *   real server and usable with any ws implementation.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D6)
 */

import type { ICampaignGrantDeliveryItem } from '@/lib/campaign/delivery/campaignDeliveryTypes';

import {
  CampaignGrantDeliverySchema,
  type ICampaignGrantDelivery,
} from '@/types/multiplayer/CampaignGrantProtocol';

import type { SQLiteCampaignReplicaStore } from './SQLiteCampaignReplicaStore';

/** Minimal socket surface, so any ws implementation can drive this. */
export interface IReplicaSyncSocket {
  send(data: string): void;
  close(): void;
  on(event: 'message', listener: (data: unknown) => void): void;
  on(event: 'open' | 'close' | 'error', listener: () => void): void;
}

export type ReplicaSyncStatus = 'connecting' | 'connected' | 'disconnected';

export interface ICampaignReplicaSyncOptions {
  readonly url: string;
  readonly matchId: string;
  readonly campaignId: string;
  readonly grantId: string;
  readonly playerId: string;
  /**
   * The signed grant token, forwarded VERBATIM. Typed as unknown on
   * purpose: a replica has no business interpreting a token, only
   * presenting it, and depending on the grant-store module here would
   * put the consuming device one import away from the issuing surface.
   */
  readonly token: unknown;
  readonly store: SQLiteCampaignReplicaStore;
  readonly socketFactory: (url: string) => IReplicaSyncSocket;
  readonly nowIso: () => string;
  /** Called when a delivery is durably ingested, for test observation. */
  readonly onIngested?: (throughSequence: number) => void;
  /** Called when the connection ends, with the reason if it failed. */
  readonly onClosed?: (reason: string | null) => void;
}

/**
 * Parses a server frame without trusting it. Anything that is not a
 * delivery for this campaign is ignored rather than throwing: the
 * channel legitimately carries control frames too.
 */
function asDelivery(
  data: unknown,
  campaignId: string,
): ICampaignGrantDelivery | null {
  const raw = typeof data === 'string' ? data : String(data);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  // Validate with the wire schema rather than casting a raw parse. The
  // channel legitimately carries control frames, and a frame that does
  // not match is ignored rather than thrown on.
  const result = CampaignGrantDeliverySchema.safeParse(parsed);
  if (!result.success) return null;
  if (result.data.campaignId !== campaignId) return null;
  return result.data;
}

export class CampaignReplicaSyncClient {
  private socket: IReplicaSyncSocket | null = null;
  private statusValue: ReplicaSyncStatus = 'disconnected';

  public constructor(private readonly options: ICampaignReplicaSyncOptions) {}

  /** Current posture, so a UI can say offline rather than guess. */
  public status(): ReplicaSyncStatus {
    return this.statusValue;
  }

  /**
   * Dials the source and joins with this device's grant, resuming from
   * the cursor the replica store already holds.
   */
  public async connect(): Promise<void> {
    const { options } = this;
    this.statusValue = 'connecting';
    const socket = options.socketFactory(options.url);
    this.socket = socket;

    socket.on('open', () => {
      this.statusValue = 'connected';
      void (async () => {
        const cursor = await options.store.lastCursor(
          options.campaignId,
          options.grantId,
        );
        socket.send(
          JSON.stringify({
            kind: 'CampaignGrantJoin',
            matchId: options.matchId,
            ts: options.nowIso(),
            playerId: options.playerId,
            campaignId: options.campaignId,
            grantId: options.grantId,
            token: options.token,
            // Resume: a restart continues where it left off, which is also
            // what lets the source enforce exactly-once against us.
            cursor,
          }),
        );
      })();
    });

    socket.on('message', (data) => {
      void this.handleFrame(data);
    });

    socket.on('close', () => {
      this.statusValue = 'disconnected';
      options.onClosed?.(null);
    });

    socket.on('error', () => {
      this.statusValue = 'disconnected';
      options.onClosed?.('socket-error');
    });
  }

  /** Stops consuming. The source is unaffected either way. */
  public disconnect(): void {
    this.statusValue = 'disconnected';
    this.socket?.close();
    this.socket = null;
  }

  /**
   * Ingests one delivery into the local replica stream. A refusal ends
   * the connection: a gap or collision means the local copy no longer
   * matches the source, and appending onto a diverged stream would hide
   * that rather than surface it.
   */
  private async handleFrame(data: unknown): Promise<void> {
    const delivery = asDelivery(data, this.options.campaignId);
    if (delivery === null) return;
    if (delivery.items.length === 0) return;

    const result = await this.options.store.ingest(
      this.options.campaignId,
      this.options.grantId,
      {
        deliveryEpochId: delivery.deliveryEpochId,
        // The schema above is the runtime guarantee. The remaining gap
        // is a TYPE-modelling one: the wire schema describes an event
        // loosely, while the store's item type is a distributive Omit
        // over the event union, and a JSON round-trip cannot carry that
        // discriminant through. One narrow cast at the validated
        // boundary, rather than loosening the store's type for everyone.
        items:
          delivery.items as unknown as readonly ICampaignGrantDeliveryItem[],
      },
    );
    if (result.kind !== 'applied' && result.kind !== 'duplicate') {
      this.statusValue = 'disconnected';
      this.socket?.close();
      this.socket = null;
      this.options.onClosed?.(result.reason);
      return;
    }
    const last = delivery.items[delivery.items.length - 1];
    if (last !== undefined) {
      this.acknowledge(delivery.deliveryEpochId, last.deliverySequence);
      this.options.onIngested?.(last.deliverySequence);
    }
  }

  /**
   * Reports the applied high-water mark so the source can resume this
   * participant from it. Sent only AFTER a successful ingest - an
   * acknowledgement for something not yet durable here would let a
   * later resume skip it.
   *
   * Fire-and-forget by design: the durable cursor is an optimisation,
   * and a failed acknowledgement costs a fuller backfill next time,
   * which the replica applies idempotently. Making the sync connection
   * depend on it would trade a real guarantee for a convenience.
   */
  private acknowledge(deliveryEpochId: string, ackedSequence: number): void {
    const socket = this.socket;
    if (socket === null) return;
    try {
      socket.send(
        JSON.stringify({
          kind: 'CampaignGrantAck',
          matchId: this.options.matchId,
          ts: this.options.nowIso(),
          playerId: this.options.playerId,
          campaignId: this.options.campaignId,
          grantId: this.options.grantId,
          deliveryEpochId,
          ackedSequence,
        }),
      );
    } catch {
      // See above: never fatal to the sync connection.
    }
  }
}
