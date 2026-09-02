/**
 * Campaign and GM lifecycle postures in the shared vocabulary
 * (umbrella 19.1 / 19.2).
 *
 * The campaign guest surface already had a sync posture, in its own
 * private vocabulary (`resyncing` / `retrying` / `catching-up`). The GM
 * surface had nothing: the host could press Approve on a proposal the
 * server was already refusing and learn about it only from a frame
 * nothing rendered. This module supplies both halves in the one
 * vocabulary `src/lib/lifecycle/lifecycleState.ts` defines.
 *
 * WHAT IS REAL AND WHAT IS RESERVED. Only one refusal reaches a client
 * on a live command path today: `CAMPAIGN_NOT_CONVERGED`, which the
 * campaign host server sends when a progression commit is attempted
 * while a retained participant is behind the campaign log head. The
 * other refusal codes are DECLARED and routed but not producible from
 * the wire - see `campaignRefusalFromServerErrorCode`, which is the
 * single door between a live signal and a posture, and which admits
 * exactly one code. Declaring them here is what lets the branch work
 * light `rewound` / `rebuilding` without touching a banner or a locator;
 * simulating them would be a lie about what the product does.
 *
 * @spec openspec/specs/campaign-persistence/spec.md ("Campaign Rebuild Is Gated")
 * @spec openspec/specs/coop-campaign-sync/spec.md ("Campaign Conflict Resolution Is Command-Based")
 */

import type {
  ICampaignSyncUxPosture,
  CampaignSyncUxState,
} from '@/lib/campaign/replica/campaignSyncUxState';
import type {
  LifecycleProjectionSignal,
  LifecycleState,
} from '@/lib/lifecycle/lifecycleState';

/**
 * Every refusal a campaign surface can be put into a posture by.
 *
 * `CAMPAIGN_NOT_CONVERGED` is live. `STALE_BRANCH` exists on the
 * event-history head guard but is not yet returned on any command path a
 * campaign surface calls, and the two projection signals are not emitted
 * at all. They are routed anyway so the day they reach the wire is a
 * one-line change in the mapper below rather than new UI.
 */
export type CampaignLifecycleRefusalCode =
  | 'CAMPAIGN_NOT_CONVERGED'
  | 'STALE_BRANCH'
  | LifecycleProjectionSignal;

/**
 * The guest posture. It EXTENDS the shipped sync posture rather than
 * replacing it: `state` and `commandsEnabled` keep meaning exactly what
 * their existing readers - an e2e spec among them - already rely on, and
 * `lifecycleState` adds the shared name on top.
 */
export interface ICampaignLifecyclePosture extends ICampaignSyncUxPosture {
  readonly lifecycleState: LifecycleState;
}

/** Campaign-side facts the replica's sync posture does not carry. */
export interface ICampaignLifecycleFacts {
  /** A proposal this guest raised is still awaiting the GM's decision. */
  readonly proposalAwaitingGm: boolean;
  /** The most recent resolved proposal committed a campaign event. */
  readonly lastProposalCommitted: boolean;
  /** A standing refusal, or null while nothing has been refused. */
  readonly refusal: CampaignLifecycleRefusalCode | null;
}

/** A recovery the host can actually take, named by the refusal. */
export interface IGmRecoveryAction {
  readonly code: CampaignLifecycleRefusalCode;
  readonly label: string;
  readonly description: string;
}

/** The GM posture. */
export interface IGmLifecyclePosture {
  readonly state: LifecycleState;
  readonly message: string;
  /**
   * Whether the server would accept a PROGRESSION commit right now.
   * Deliberately narrower than a blanket `commandsEnabled`: the server
   * refuses `AdvanceDay` and the host's approval of an `AdvanceDay`
   * proposal, and nothing else. A blanket gate would strand a host with
   * a proposal queue they are perfectly entitled to clear, and would
   * teach them that the gate does not mean what it says.
   */
  readonly progressionEnabled: boolean;
  readonly recovery: IGmRecoveryAction | null;
}

export interface IGmLifecycleInput {
  readonly refusal: CampaignLifecycleRefusalCode | null;
  readonly pendingProposalCount: number;
}

const GUEST_MESSAGES: Readonly<Record<LifecycleState, string>> = {
  pending: 'Your proposal is awaiting the campaign GM.',
  sealed: 'Your proposal is sealed until the GM reveals it.',
  finalized: 'The campaign GM decided your latest proposal.',
  syncing: 'Loading the shared campaign…',
  reconnecting: 'Reconnecting to the campaign owner…',
  behind: 'Catching up on recent campaign activity…',
  blocked: 'This shared campaign is not accepting commands right now.',
  rewound: 'The campaign projection was rewound to an authoritative branch.',
  rebuilding: 'Rebuilding the campaign projection from authoritative history…',
  live: 'Up to date with the campaign owner.',
};

const GM_MESSAGES: Readonly<Record<LifecycleState, string>> = {
  pending: 'Guest proposals are awaiting your review.',
  sealed: 'A guest declaration is sealed until you reveal it.',
  finalized: 'Your latest campaign decision was committed.',
  syncing: 'Loading the campaign…',
  reconnecting: 'Reconnecting to the campaign session…',
  behind: 'Catching up on recent campaign activity…',
  blocked: 'Campaign progression is paused until every participant catches up.',
  rewound: 'The campaign projection was rewound to an authoritative branch.',
  rebuilding: 'Rebuilding the campaign projection from authoritative history…',
  live: 'Campaign is up to date.',
};

/**
 * The recovery each refusal offers. `Check again` is deliberately the
 * only ACTION: the local block is a hint carried forward from the last
 * refusal, not a live convergence subscription, so clearing it lets the
 * host retry and lets the SERVER - which is the only authority on
 * whether the campaign converged - answer again. Nothing here commits
 * anything, which is what makes it safe to offer to an actor whose last
 * command was refused.
 */
const RECOVERIES: Readonly<
  Record<CampaignLifecycleRefusalCode, IGmRecoveryAction>
> = {
  CAMPAIGN_NOT_CONVERGED: {
    code: 'CAMPAIGN_NOT_CONVERGED',
    label: 'Check again',
    description:
      'Progression resumes once every participant has caught up. Checking again retries against the campaign server.',
  },
  STALE_BRANCH: {
    code: 'STALE_BRANCH',
    label: 'Check again',
    description:
      'This view is on a superseded branch of campaign history. Checking again retries against the active branch.',
  },
  PROJECTION_REWOUND: {
    code: 'PROJECTION_REWOUND',
    label: 'Check again',
    description:
      'The campaign projection was rewound. Checking again retries against the authoritative branch.',
  },
  PROJECTION_REBUILDING: {
    code: 'PROJECTION_REBUILDING',
    label: 'Check again',
    description:
      'The campaign projection is being rebuilt. Checking again retries once it is complete.',
  },
};

/**
 * The ONLY door between a live server error code and a lifecycle
 * refusal. Every other code - including the ones this module declares -
 * returns null, so a posture the product cannot reach cannot be reached
 * by accident either. When the branch work starts returning
 * `STALE_BRANCH` on a campaign command path, this is the one function
 * that changes.
 */
export function campaignRefusalFromServerErrorCode(
  code: string,
): CampaignLifecycleRefusalCode | null {
  return code === 'CAMPAIGN_NOT_CONVERGED' ? 'CAMPAIGN_NOT_CONVERGED' : null;
}

/**
 * Maps a refusal to its posture. Shared by both surfaces so a refusal
 * never reads as one thing to a guest and another to the host.
 */
function refusalState(refusal: CampaignLifecycleRefusalCode): LifecycleState {
  switch (refusal) {
    case 'PROJECTION_REBUILDING':
      return 'rebuilding';
    case 'PROJECTION_REWOUND':
      return 'rewound';
    // A stale branch and an unconverged campaign are both "the server
    // will not take this command from you yet", which is what `blocked`
    // says. The recovery text is what distinguishes them for a human.
    case 'STALE_BRANCH':
    case 'CAMPAIGN_NOT_CONVERGED':
      return 'blocked';
    default:
      return assertNever(refusal);
  }
}

/** Maps the shipped sync vocabulary onto the shared one. */
function lifecycleFromSyncState(state: CampaignSyncUxState): LifecycleState {
  switch (state) {
    case 'blocked':
      return 'blocked';
    // `resyncing` (a rebaseline landed) and `catching-up` (a first load)
    // are both "the stream is being brought into line" - the shared
    // vocabulary calls that `syncing`. The distinction survives in the
    // unchanged `state`/`data-sync-state` for the readers that want it.
    case 'resyncing':
    case 'catching-up':
      return 'syncing';
    case 'retrying':
      return 'reconnecting';
    case 'behind':
      return 'behind';
    case 'live':
      return 'live';
    default:
      return assertNever(state);
  }
}

/**
 * Adds the shared lifecycle name to a guest's sync posture.
 *
 * `commandsEnabled` is the shipped rule plus refusals: a refusal is a
 * server statement that this actor's command will not be taken, so
 * offering the control anyway would be offering a button that cannot
 * work. It is never LOOSENED here - a posture that already withheld the
 * controls keeps withholding them.
 */
export function toCampaignLifecyclePosture(
  sync: ICampaignSyncUxPosture,
  facts: ICampaignLifecycleFacts,
): ICampaignLifecyclePosture {
  const lifecycleState = deriveGuestLifecycleState(sync.state, facts);
  return {
    ...sync,
    lifecycleState,
    commandsEnabled: sync.commandsEnabled && facts.refusal === null,
    message: GUEST_MESSAGES[lifecycleState],
  };
}

function deriveGuestLifecycleState(
  syncState: CampaignSyncUxState,
  facts: ICampaignLifecycleFacts,
): LifecycleState {
  // A refusal outranks the transport posture: being connected to a
  // source that will not take your command is exactly the situation
  // where a hopeful "up to date" reads as permission.
  if (facts.refusal !== null) return refusalState(facts.refusal);
  const mapped = lifecycleFromSyncState(syncState);
  // The decided/undecided postures only mean anything on a converged
  // view. Reporting "awaiting the GM" while the replica is mid-backfill
  // would name the wrong reason for the wait.
  if (mapped !== 'live') return mapped;
  if (facts.proposalAwaitingGm) return 'pending';
  if (facts.lastProposalCommitted) return 'finalized';
  return 'live';
}

/**
 * The host's posture.
 *
 * `sealed` is absent by construction: a campaign has no
 * declare-then-reveal phase, so there is no honest way for this surface
 * to reach it. The tactical surface, which does have one, derives it
 * there.
 */
export function deriveGmLifecyclePosture(
  input: IGmLifecycleInput,
): IGmLifecyclePosture {
  if (input.refusal !== null) {
    const state = refusalState(input.refusal);
    return {
      state,
      message: GM_MESSAGES[state],
      progressionEnabled: false,
      recovery: RECOVERIES[input.refusal],
    };
  }
  const state: LifecycleState =
    input.pendingProposalCount > 0 ? 'pending' : 'live';
  return {
    state,
    message: GM_MESSAGES[state],
    progressionEnabled: true,
    recovery: null,
  };
}

function assertNever(value: never): never {
  throw new Error(`Unexpected campaign lifecycle input: ${String(value)}`);
}
