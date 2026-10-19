/**
 * Mounted consumer of transport-issued campaign application offers (P2CF2),
 * active only on a transport bound to the mounted campaign (none in
 * production before Task 14). Offers settle in receipt order (fold or
 * mirror, projection, launch facts, a GM's awaited guarded record refresh)
 * before one `confirmApplied`; a failure sends no receipt, a stale binding
 * reports nothing, and every recovery signal rejoins once from EMPTY.
 * Quiet-window rejoins are bounded per mounted campaign seat (CF-H7).
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D4, D9)
 */

import { useCallback, useRef, useState, type MutableRefObject } from 'react';

import type { ICampaignAuthoritativeFold } from '@/lib/campaign/coop/campaignAuthoritativeFold';
import type {
  CampaignAppliedOutcome,
  ICampaignSyncTransport,
} from '@/lib/campaign/coop/campaignSyncTransport';
import type { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';
import type {
  ICampaignApplicationOffer,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import {
  foldCampaignEvent,
  foldCampaignHydration,
  foldCampaignSnapshot,
} from '@/lib/campaign/coop/campaignAuthoritativeFold';
import { projectAuthoritativeStateOntoCampaign } from '@/lib/campaign/coop/campaignMirrorProjection';
import {
  APPLICATION_CONFIRMATION_TIMEOUT_MS,
  campaignEventFromMessage,
} from '@/lib/campaign/coop/campaignSyncTransport';
import { useCampaignMirrorStore } from '@/lib/p2p/campaignMirrorStore';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import { isCampaignWireEvent } from '@/types/campaign/CampaignSync';

type Failure = Extract<CampaignAppliedOutcome, { status: 'failed' }>['reason'];

export type CampaignApplicationBinding = {
  readonly transport: ICampaignSyncTransport;
  readonly campaignId: string;
  readonly store: ReturnType<typeof useCampaignStore>;
} & (
  | {
      readonly role: 'host';
      readonly fold: MutableRefObject<ICampaignAuthoritativeFold>;
    }
  | { readonly role: 'guest'; readonly playerId: string }
);

export interface ICampaignApplicationConsumer {
  /** Takes one frame off the stream; true when the legacy fold must skip it. */
  readonly consume: (message: IServerMessage) => boolean;
  /** Ends the binding: nothing it started writes, reports or rejoins after. */
  readonly dispose: () => void;
}

/** An application-path Error: never a command refusal or a GM gate. */
export function isCampaignApplicationError(message: IServerMessage): boolean {
  return (
    message.kind === 'Error' &&
    message.reason?.startsWith('campaign-application-') === true
  );
}

function isOffer(
  message: IServerMessage,
): message is ICampaignApplicationOffer {
  return (
    (message.kind === 'CampaignSnapshot' || message.kind === 'CampaignEvent') &&
    message.appliedView !== undefined
  );
}

/** A baseline's bundle; absent elsewhere or malformed, so it certifies nothing. */
function bundleOf(
  offer: ICampaignApplicationOffer,
): readonly ICampaignEvent[] | undefined {
  const facts: readonly unknown[] | undefined =
    offer.kind === 'CampaignSnapshot' ? offer.hydrationFacts : undefined;
  return facts?.every(isCampaignWireEvent) ? facts : undefined;
}

/**
 * A view's baseline is an authorized replacement from EMPTY, adopted at -1:
 * the receipt chain orders what follows, so an event at 0 is not refused.
 */
function applyOffer(
  binding: CampaignApplicationBinding,
  offer: ICampaignApplicationOffer,
): ICampaignAuthoritativeFold | null {
  const event = campaignEventFromMessage(offer);
  const facts = bundleOf(offer);
  if (!event) return null;
  const baseline = offer.appliedView.previousReceiptId === null;
  if (binding.role === 'host') {
    const fold = binding.fold.current;
    if (baseline) return foldCampaignHydration(fold, event, facts, true, -1);
    return event.type === 'CampaignSnapshotPublished'
      ? foldCampaignSnapshot(fold, event)
      : foldCampaignEvent(fold, event);
  }
  const mirror = useCampaignMirrorStore.getState();
  if (!baseline) {
    return event.type === 'CampaignSnapshotPublished'
      ? mirror.applySnapshot(event)
      : mirror.applyEvent(event);
  }
  if (!mirror.peers) {
    const guestPeerId = binding.playerId;
    mirror.beginMirror(
      { hostPeerId: event.authorPlayerId, guestPeerId },
      guestPeerId,
    );
  }
  return mirror.applySnapshot(event, -1, true, facts);
}

/**
 * A baseline holds exactly its bundle, a launch ends the held facts and
 * anything else keeps a complete set; state equality cannot certify one.
 */
function retainsLaunchFacts(
  offer: ICampaignApplicationOffer,
  { launchFacts }: ICampaignAuthoritativeFold,
): boolean {
  if (!launchFacts) return false;
  if (offer.appliedView.previousReceiptId === null)
    return JSON.stringify(launchFacts) === JSON.stringify(bundleOf(offer));
  return (
    offer.event.type !== 'CampaignMissionLaunched' ||
    JSON.stringify(launchFacts[launchFacts.length - 1]) ===
      JSON.stringify(offer.event)
  );
}

/**
 * CF-G3: the transport cursor each transport stood at when a binding last
 * consumed one of its campaign frames. A rebind arms no new pre-receipt
 * window while the transport is still there: every frame it dispatched
 * reached a binding. A first frame, or one that arrives while nothing is
 * bound, leaves no matching mark, so that rebind keeps its window.
 */
const heardAt = new WeakMap<ICampaignSyncTransport, number>();

/**
 * CF-H1: transports a binding was disposed from while an offer it consumed
 * was still settling. No binding can confirm that offer any more, so the
 * transport withholds every later ACK; the next binding rejoins at once.
 */
const cutTransports = new WeakSet<ICampaignSyncTransport>();

/** Automatic quiet-window rejoins per mounted seat episode (CF-H7/CF-G4). */
const QUIET_RETRIES = 2;
const SYNC_EXHAUSTED =
  'Campaign sync could not connect. Reload this campaign to try again.';

interface IRecoveryEpisode {
  readonly rejoin: () => void;
  /** A quiet window elapsed: true while the episode may rejoin again. */
  readonly quiet: () => boolean;
  /** The server confirmed an applied view: the episode is healthy. */
  readonly healthy: () => void;
}

function bindCampaignApplicationConsumer(
  binding: CampaignApplicationBinding,
  episode: IRecoveryEpisode,
): ICampaignApplicationConsumer {
  const { transport, campaignId, store } = binding;
  const confirm = transport.confirmApplied;
  const active = transport.campaignId === campaignId && confirm !== undefined;
  let live = active;
  let latched = false;
  let queue = Promise.resolve();
  let settling = 0;
  // A close before receipt mode latches is silent, so a bound view that
  // hears no campaign frame within one confirmation window rejoins, while
  // its episode still has a retry.
  const quiet =
    active && heardAt.get(transport) !== transport.lastSeq()
      ? setTimeout(() => rejoin(true), APPLICATION_CONFIRMATION_TIMEOUT_MS)
      : undefined;
  const heard = (): void => clearTimeout(quiet);

  const offError = active
    ? transport.onError((error) => {
        // Every recovery signal, the unrequested receipt-mode close included.
        const message = error instanceof Error ? error.message : '';
        if (message.startsWith('Campaign application recovery required:'))
          rejoin();
      })
    : () => undefined;
  // Only a validated server confirmation is healthy: never a heartbeat, a
  // frame or a rebind.
  const offHealthy =
    (active &&
      transport.onAppliedViewConfirmed?.(() => {
        if (live) episode.healthy();
      })) ||
    (() => undefined);
  function rejoin(quietWindow = false): void {
    if (!live) return;
    live = false;
    heard();
    offError();
    offHealthy();
    transport.close();
    // An exhausted episode closes the unproductive socket and stops here.
    if (!quietWindow || episode.quiet()) episode.rejoin();
  }

  const project = (state: ICampaignAuthoritativeState | null): boolean => {
    const projected = projectAuthoritativeStateOntoCampaign(
      store.getState().campaign,
      campaignId,
      state,
    );
    if (projected) store.setState({ campaign: projected });
    return projected !== null;
  };

  const settle = async (
    offer: ICampaignApplicationOffer,
    release: () => void,
  ): Promise<void> => {
    if (!live) return;
    let failure: Failure | null = null;
    try {
      const next = applyOffer(binding, offer);
      if (!next) failure = 'fold-rejected';
      else if (!retainsLaunchFacts(offer, next)) failure = 'adjunct-failed';
      else {
        if (binding.role === 'host') binding.fold.current = next;
        if (!project(next.state)) failure = 'projection-failed';
      }
      if (
        !failure &&
        binding.role === 'host' &&
        offer.kind === 'CampaignEvent'
      ) {
        // The command may have rewritten the saved row: adopt its version
        // first, then put the held fold back over the record it replaced.
        const adopted = await useCampaignPersistenceStore
          .getState()
          .refreshAfterCommittedCommand(
            {
              kind: 'committed',
              state: { campaignId: offer.event.campaignId },
            },
            { isCurrent: () => live },
          );
        if (!adopted || !live || !project(binding.fold.current.state))
          failure = 'adjunct-failed';
      }
    } catch {
      failure = 'projection-failed';
    }
    if (!live || !confirm) return;
    const outcome: CampaignAppliedOutcome = failure
      ? { status: 'failed', reason: failure }
      : { status: 'applied' };
    // CF-H14: this offer is settled before confirm, which may dispose now or
    // in its next microtask.
    release();
    const result = confirm(offer, outcome);
    if (result.status === 'refused' || result.status === 'recovery-required')
      rejoin();
  };

  if (active && cutTransports.has(transport)) rejoin();

  return {
    consume: (message) => {
      if (!active) return isOffer(message);
      if (campaignEventFromMessage(message)) {
        heardAt.set(transport, transport.lastSeq());
        heard();
      }
      // INTERNAL_ERROR precedes a server close; INVALID_INTENT is the transport's.
      if (
        message.kind === 'Error' &&
        message.code !== 'INVALID_INTENT' &&
        isCampaignApplicationError(message)
      )
        rejoin();
      // Once offers flow, an unoffered frame would fold out of receipt order.
      if (!isOffer(message))
        return latched && campaignEventFromMessage(message) !== null;
      latched = true;
      // A step that throws, confirmApplied included, rejoins once; it never
      // rejects the queue, so later steps still run and see the dead binding.
      // CF-H15: counted from consume, so a same-tick dispose still cuts.
      settling += 1;
      let released = false;
      const release = (): void => {
        if (!released) settling -= 1;
        released = true;
      };
      queue = queue
        .then(() => settle(message, release))
        .catch(() => rejoin())
        .then(release);
      return true;
    },
    dispose: () => {
      if (live && settling > 0) cutTransports.add(transport);
      live = false;
      heard();
      offError();
      offHealthy();
    },
  };
}

/**
 * Binds each connected transport; `rejoins` changes so the effects reconnect.
 * One recovery episode per mounted seat (campaign, match, player) spans its
 * replacement transports. It is hook-local: a remount, reloading the
 * campaign, is the explicit retry and starts a fresh episode.
 */
export function useCampaignApplicationConsumer(): {
  readonly rejoins: number;
  readonly recoveryError: string | null;
  readonly bind: (
    binding: CampaignApplicationBinding,
  ) => ICampaignApplicationConsumer;
} {
  const [rejoins, setRejoins] = useState(0);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const episode = useRef({ key: '', retries: 0 });
  const bind = useCallback((binding: CampaignApplicationBinding) => {
    const { matchId, playerId } = binding.transport;
    const key = JSON.stringify([binding.campaignId, matchId, playerId]);
    if (episode.current.key !== key) {
      episode.current = { key, retries: 0 };
      setRecoveryError(null);
    }
    const current = (): boolean => episode.current.key === key;
    return bindCampaignApplicationConsumer(binding, {
      rejoin: () => setRejoins((count) => count + 1),
      quiet: () => {
        if (!current()) return false;
        if (episode.current.retries >= QUIET_RETRIES) {
          setRecoveryError(SYNC_EXHAUSTED);
          return false;
        }
        episode.current.retries += 1;
        return true;
      },
      healthy: () => {
        if (!current()) return;
        episode.current.retries = 0;
        setRecoveryError(null);
      },
    });
  }, []);
  return { rejoins, recoveryError, bind };
}
