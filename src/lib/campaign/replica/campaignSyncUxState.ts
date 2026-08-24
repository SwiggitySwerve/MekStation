/**
 * Synchronization state a guest can actually act on (task 5.6; design
 * D5/D6, merging the 3.6 scoped-perspective seam).
 *
 * The guest surface has, until now, offered its command controls
 * whenever it rendered. That is wrong in a way a player experiences
 * directly: a guest whose replica is mid-backfill, retrying a dropped
 * socket, or sitting on a stream the source refused is looking at a view
 * that does not match the campaign, and every control on it proposes
 * against state that has already moved. The proposal is not corrupt - the
 * GM arbitrates it - but it is made blind, and the guest is given no
 * reason to think so.
 *
 * So the states are PERSISTENT rather than a toast. A transient
 * notification answers "what just happened"; a player mid-session needs
 * "can I act right now", and that has to be readable at any moment
 * without having caught a message that already faded.
 *
 * Five states, in strict precedence, because more than one can be true
 * and only the most severe is worth acting on:
 *
 *   blocked > resyncing > retrying > catching-up > behind > live
 *
 * Commands are enabled in exactly ONE of them. Anything else is a claim
 * that the local view is authoritative when the code already knows it is
 * not.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D5, D6)
 */

/** The five degraded postures plus the converged one. */
export type CampaignSyncUxState =
  | 'blocked'
  | 'resyncing'
  | 'retrying'
  | 'catching-up'
  | 'behind'
  | 'live';

export interface ICampaignSyncUxInput {
  /** Transport posture reported by the replica dialler. */
  readonly connection: 'connecting' | 'connected' | 'disconnected';
  /**
   * A refusal the source returned for this grant - revoked access, a
   * delivery-identity fault, anything that will not fix itself by
   * waiting. Null while nothing has been refused.
   */
  readonly refusedReason: string | null;
  /** A rebaseline frame arrived and the fresh baseline is not yet applied. */
  readonly awaitingRebaseline: boolean;
  /** Highest sequence the source has delivered to this replica. */
  readonly deliveredSequence: number;
  /** Highest sequence this replica has actually applied. */
  readonly appliedSequence: number;
  /** False until the join handshake's first delivery frame lands. */
  readonly joinCompleted: boolean;
}

export interface ICampaignSyncUxPosture {
  readonly state: CampaignSyncUxState;
  /**
   * Whether campaign command affordances may be offered. True in `live`
   * and nowhere else - see the module note.
   */
  readonly commandsEnabled: boolean;
  /** One sentence a player can act on, never a status code. */
  readonly message: string;
}

const MESSAGES: Readonly<Record<CampaignSyncUxState, string>> = {
  blocked:
    'This shared campaign is no longer syncing. Ask the campaign owner to re-share it.',
  resyncing:
    'The campaign owner changed what is shared with you. Reloading the shared view…',
  retrying: 'Reconnecting to the campaign owner…',
  'catching-up': 'Loading the shared campaign…',
  behind: 'Catching up on recent campaign activity…',
  live: 'Up to date with the campaign owner.',
};

/**
 * Derives the posture. Deliberately total and pure: the same inputs give
 * the same answer, so a surface can render it during a transition
 * without a stale flag deciding whether a button is live.
 */
export function deriveCampaignSyncUxPosture(
  input: ICampaignSyncUxInput,
): ICampaignSyncUxPosture {
  const state = deriveState(input);
  return {
    state,
    // The single place command availability is decided. A caller cannot
    // enable commands by reading a state name it happens to like.
    commandsEnabled: state === 'live',
    message: MESSAGES[state],
  };
}

function deriveState(input: ICampaignSyncUxInput): CampaignSyncUxState {
  // Refused first and unconditionally. A refusal outranks a live socket:
  // being connected to a source that will not serve you is exactly the
  // situation where a hopeful "connected" reads as permission.
  if (input.refusedReason !== null) return 'blocked';
  // A rebaseline means the numbering the replica holds no longer applies.
  // Until the new baseline lands, the local view describes a share that
  // has changed underneath it.
  if (input.awaitingRebaseline) return 'resyncing';
  // A DROPPED connection is a reconnect; a first one is a load. The
  // product already distinguishes them (the guest mirror reports a
  // host-disconnected `paused` separately from an opening `connecting`),
  // and a player reads them differently: "reconnecting" says something
  // was working a moment ago.
  if (input.connection === 'disconnected') return 'retrying';
  if (input.connection === 'connecting') return 'catching-up';
  if (!input.joinCompleted) return 'catching-up';
  // Connected and joined, but the replica has not applied everything it
  // was sent. Acting here proposes against a view known to be short.
  if (input.appliedSequence < input.deliveredSequence) return 'behind';
  return 'live';
}

/**
 * Bridges the co-op guest mirror's status to a posture.
 *
 * The mirror reports one coarse status and ONE sequence number, so this
 * mapper cannot produce `behind` - that state needs both a delivered and
 * an applied position, which the D6 replica dialler tracks but the guest
 * mirror does not carry today. Rather than synthesise it from a single
 * number, the mapper stays within what the client actually knows; a
 * surface fed by the dialler gets the full six.
 *
 * `missing-token` is `blocked` rather than a retry posture on purpose:
 * no amount of waiting produces a credential, and telling a player
 * "reconnecting..." while nothing can reconnect is the kind of hopeful
 * status that makes people sit and wait for a thing that will not happen.
 */
export function campaignSyncPostureFromMirrorStatus(
  status: 'connecting' | 'synced' | 'missing-token' | 'paused',
): ICampaignSyncUxPosture {
  return deriveCampaignSyncUxPosture({
    // `paused` is the host having disconnected, so it is a transport
    // posture, not a refusal.
    connection:
      status === 'synced'
        ? 'connected'
        : status === 'paused'
          ? 'disconnected'
          : 'connecting',
    refusedReason: status === 'missing-token' ? 'missing-grant-token' : null,
    awaitingRebaseline: false,
    deliveredSequence: 0,
    appliedSequence: 0,
    joinCompleted: status === 'synced',
  });
}
