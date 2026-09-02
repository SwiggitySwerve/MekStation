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
 * WHAT IS REAL AND WHAT IS RESERVED. Three of the four refusal codes are
 * produced by a server today: `CAMPAIGN_NOT_CONVERGED` on the campaign
 * wire when a progression commit is attempted while a retained
 * participant is behind the log head; `PROJECTION_REBUILDING` from the
 * command-admission gate while a correction lease rebuilds; and the
 * staleness family from the expected-head guard and task 8.4's typed
 * conflict. `PROJECTION_REWOUND` is emitted by nothing and is the one
 * that stays reserved - declared and routed so the day something emits it
 * is a server change rather than new UI, and guarded so nothing live can
 * wander into it in the meantime. Simulating it would be a lie about what
 * the product does.
 *
 * THERE ARE TWO DOORS, because there are two refusal
 * vocabularies and they do not overlap:
 *
 *   - the WIRE door (`campaignRefusalFromServerErrorCode`) takes a member
 *     of the socket's own `ErrorCodeSchema`. That enum contains
 *     `CAMPAIGN_NOT_CONVERGED` and `PROJECTION_REBUILDING` and does NOT
 *     contain `STALE_BRANCH` or `PROJECTION_REWOUND`;
 *   - the COMMAND door (`campaignRefusalFromCommandRefusal`) takes the
 *     refusal body `/api/campaigns/[id]/commands` answers with. That is
 *     where staleness lives: `ExpectedHeadRefusalCode` in
 *     `EventHistoryExpectedHead` is `STALE_BRANCH | STALE_REVISION |
 *     STALE_GENERATION`, and `readRebuildRefusal` in
 *     `EventHistoryCommandAdmission` is the rebuild arm.
 *
 * `PROJECTION_REWOUND` is admitted by NEITHER, because it is emitted by
 * nothing - it appears in no server vocabulary, only in this one. That is
 * what the unreachability sweep still asserts, and it is now a sweep over
 * both doors rather than one.
 *
 * WHAT A REFUSAL SAYS TO DO IS THE SERVER'S TO SAY - BUT IT IS NOT WHAT
 * THE BUTTON DOES. Both admission arms ship a named action:
 * `EXPECTED_HEAD_RESYNC_ACTION` ('resync-to-active-head') and
 * `REBUILD_RETRY_ACTION` ('retry-after-rebuild'). Those reach the human
 * verbatim through `serverAction`, rendered beside the control - never as
 * the control's label, because no client here can carry either
 * instruction out: the only handler any of these controls has clears a
 * local hint so the server answers again (finding #93). Paraphrasing the
 * server would eventually paraphrase it wrongly; labelling a button with
 * it promises a movement the press cannot perform. Both are avoided by
 * keeping the two sentences apart.
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
 * `CAMPAIGN_NOT_CONVERGED` and `PROJECTION_REBUILDING` are produced live
 * today. `STALE_BRANCH` stands for the whole staleness family the
 * expected-head guard answers with - a superseded branch, a moved
 * revision and a bumped generation are three findings with ONE recovery,
 * and a surface offering three would invent a distinction the human
 * cannot act on. `PROJECTION_REWOUND` is emitted by nothing and is routed
 * anyway, so the day something emits it is a server change rather than
 * new UI.
 */
export type CampaignLifecycleRefusalCode =
  | 'CAMPAIGN_NOT_CONVERGED'
  | 'STALE_BRANCH'
  | LifecycleProjectionSignal;

/**
 * A refusal as RECEIVED: the code, plus whatever the server said to do
 * about it.
 *
 * `recoveryAction` is null when the refusal named none - the wire's
 * `Error` frame has no action field at all. The campaign commands route
 * DOES carry one since its #66 fix (a rebuild answers 409 with
 * `recoveryAction: 'retry-after-rebuild'`), and the door reads the field
 * generically, so the verbatim rule below covers both doors without a
 * special case for either.
 */
export interface ICampaignCommandRefusal {
  readonly code: CampaignLifecycleRefusalCode;
  readonly recoveryAction: string | null;
}

/**
 * The guest posture. It EXTENDS the shipped sync posture rather than
 * replacing it: `state` and `commandsEnabled` keep meaning exactly what
 * their existing readers - an e2e spec among them - already rely on, and
 * `lifecycleState` adds the shared name on top.
 */
export interface ICampaignLifecyclePosture extends ICampaignSyncUxPosture {
  readonly lifecycleState: LifecycleState;
  /**
   * What the guest can do about a standing refusal, or null when nothing
   * is refusing them. Same shape the host reads: a refusal that told the
   * host to resync must not tell the guest something else.
   */
  readonly recovery: IGmRecoveryAction | null;
}

/** Campaign-side facts the replica's sync posture does not carry. */
export interface ICampaignLifecycleFacts {
  /** A proposal this guest raised is still awaiting the GM's decision. */
  readonly proposalAwaitingGm: boolean;
  /** The most recent resolved proposal committed a campaign event. */
  readonly lastProposalCommitted: boolean;
  /** A standing refusal, or null while nothing has been refused. */
  readonly refusal: ICampaignCommandRefusal | null;
}

/** A recovery the actor can take, named by the refusal. */
export interface IGmRecoveryAction {
  readonly code: CampaignLifecycleRefusalCode;
  readonly label: string;
  readonly description: string;
  /**
   * Whether the label names something to PRESS.
   *
   * False for a rebuild, and that is the whole point of the field: the
   * stream reopens on lease expiry, release, or activation, so a button
   * here would be a control whose only effect is to let the actor
   * discover the same refusal again. Waiting is the recovery, and a
   * surface that dressed it up as an action would be lying about who is
   * in control of it.
   */
  readonly actionable: boolean;
  /**
   * What the SERVER said to do, verbatim, or null when it said nothing.
   *
   * Deliberately not the `label`. Every actionable recovery on both
   * surfaces is wired to one handler, which clears a local hint so the
   * server answers again - it resyncs nothing and rebases nothing. The
   * server's own action strings are `resync-to-active-head` and
   * `rebase-onto-active-head`, so putting one on the button would have it
   * promise a movement the press cannot perform (finding #93). The
   * instruction is still worth showing - it is the only real recovery
   * anyone has named - so it is carried here and rendered as information
   * beside the control rather than as the control's promise.
   */
  readonly serverAction: string | null;
}

/**
 * The postures the GM surface can actually reach.
 *
 * `GM_MESSAGES` has to be total over `LifecycleState` to be a Record, and
 * a total map reads as a claim that all ten are reachable here - they are
 * not. `deriveGmLifecyclePosture` returns exactly these five: a campaign
 * has no declare-then-reveal phase (`sealed`), the host is the authority
 * rather than a replica of it (`syncing` / `reconnecting` / `behind`), and
 * nothing on this surface reports a decision as `finalized`. Naming the
 * reachable set makes the compiler enforce what a comment could only
 * assert; the branch work widens this alias in one visible line rather
 * than silently satisfying a claim that was already written down.
 */
export type GmReachableState = Extract<
  LifecycleState,
  'pending' | 'blocked' | 'rewound' | 'rebuilding' | 'live'
>;

/** The GM posture. */
export interface IGmLifecyclePosture {
  readonly state: GmReachableState;
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
  /**
   * Whether the server would accept ANY command right now.
   *
   * Separate from `progressionEnabled` because the two refusals are not
   * the same shape. `CAMPAIGN_NOT_CONVERGED` is checked against the
   * intent - only `AdvanceDay` is refused - so commands stay enabled and
   * progression alone is withheld. A rebuild or a stale branch is decided
   * BEFORE the intent is looked at (`executeCampaignCommand` returns
   * `blocked` from its admission arm), so every command is refused and
   * collapsing the two flags into one would either over-gate the first
   * case or under-gate the second.
   */
  readonly commandsEnabled: boolean;
  readonly recovery: IGmRecoveryAction | null;
}

export interface IGmLifecycleInput {
  readonly refusal: ICampaignCommandRefusal | null;
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

/**
 * The host's messages for the postures a refusal does NOT produce.
 *
 * Narrowed to exactly those, rather than total over `GmReachableState`,
 * because the refusal postures now speak through `REFUSAL_MESSAGES` and
 * a second copy of those three strings here would be three chances for
 * the two to drift apart silently. The compiler rejects the copy.
 */
const GM_MESSAGES: Readonly<
  Record<Exclude<GmReachableState, RefusalPostureState>, string>
> = {
  pending: 'Guest proposals are awaiting your review.',
  live: 'Campaign is up to date.',
};

/**
 * What each refusal SAYS, as opposed to which posture it produces.
 *
 * Needed because `blocked` is reached by two different refusals and the
 * posture message is what both surfaces render as the reason on a
 * withheld control. "Progression is paused until every participant
 * catches up" is true of a convergence refusal and simply false of a
 * stale branch, and a wrong reason on a disabled button is worse than a
 * vague one - the actor goes and waits for a thing that already
 * happened. Shared by both surfaces so a refusal never reads as one
 * thing to a guest and another to the host.
 */
const REFUSAL_MESSAGES: Readonly<Record<CampaignLifecycleRefusalCode, string>> =
  {
    CAMPAIGN_NOT_CONVERGED:
      'Campaign progression is paused until every participant catches up.',
    STALE_BRANCH:
      'This view is on a superseded branch of campaign history, so the campaign will not take commands from it.',
    PROJECTION_REWOUND:
      'The campaign projection was rewound to an authoritative branch.',
    PROJECTION_REBUILDING:
      'Rebuilding the campaign projection from authoritative history…',
  };

/**
 * What each refusal offers the actor.
 *
 * TWO shapes, not four, because there are only two things a person can
 * actually do here:
 *
 *   - every ACTIONABLE refusal -> `CLEAR_HINT_LABEL`. They share one
 *     handler, which clears a local hint so the SERVER - the only
 *     authority on any of these conditions - answers again. An earlier
 *     version gave the staleness family `Resync to active head`, on the
 *     reasoning that it was the human rendering of the server's own
 *     `resync-to-active-head`. It was not: it was a promise about a
 *     movement the button does not perform, and the description repeated
 *     it (finding #93). What distinguishes the refusals lives in
 *     `REFUSAL_MESSAGES` and in the descriptions below, where a sentence
 *     can explain a situation without claiming to change it.
 *   - rebuilding -> `Wait for rebuild`, and NOT actionable. The head a
 *     client would resync to is the one the rebuild is replacing, which
 *     is exactly why `EventHistoryCommandAdmission` names its action
 *     `retry-after-rebuild` rather than a resync.
 *
 * The server's own instruction is not lost - `resolveRecovery` carries it
 * verbatim into `serverAction`, which the surfaces render beside the
 * control rather than on it.
 *
 * Nothing here commits anything, which is what makes it safe to offer to
 * an actor whose last command was refused.
 */
/**
 * What the one shared recovery handler actually does, in the user"s words.
 *
 * Every actionable recovery on both surfaces is wired to `onClearRefusal`,
 * which clears a local hint so the SERVER answers again. One handler, one
 * label: naming them differently would be describing one action three ways,
 * and two of those descriptions would be wrong (finding #93).
 */
const CLEAR_HINT_LABEL = 'Check again';

const RECOVERIES: Readonly<
  Record<CampaignLifecycleRefusalCode, IGmRecoveryAction>
> = {
  CAMPAIGN_NOT_CONVERGED: {
    code: 'CAMPAIGN_NOT_CONVERGED',
    label: CLEAR_HINT_LABEL,
    description:
      'Progression resumes once every participant has caught up. Checking again retries against the campaign server.',
    actionable: true,
    serverAction: null,
  },
  STALE_BRANCH: {
    code: 'STALE_BRANCH',
    label: CLEAR_HINT_LABEL,
    description:
      'This view is on a superseded branch of campaign history. Checking again asks the campaign server to judge the next command afresh; while the branch is superseded it will refuse again.',
    actionable: true,
    serverAction: null,
  },
  PROJECTION_REWOUND: {
    code: 'PROJECTION_REWOUND',
    label: CLEAR_HINT_LABEL,
    description:
      'The campaign projection was rewound to an authoritative branch. Checking again asks the campaign server to judge the next command afresh.',
    actionable: true,
    serverAction: null,
  },
  PROJECTION_REBUILDING: {
    code: 'PROJECTION_REBUILDING',
    label: 'Wait for rebuild',
    description:
      'The campaign projection is being rebuilt from authoritative history. It reopens on its own when the rebuild finishes.',
    actionable: false,
    serverAction: null,
  },
};

/**
 * The recovery a refusal actually offers.
 *
 * The server"s named action is carried VERBATIM into `serverAction` and
 * deliberately NOT onto the `label`. Cut A put it on the label, which made
 * the button read `resync-to-active-head` while its handler only cleared a
 * local hint - the button promised a movement pressing it cannot perform
 * (finding #93). The server names WHAT SHOULD HAPPEN; the label names WHAT
 * THIS CONTROL DOES; they are only the same sentence when the client can
 * actually carry the instruction out, and today it cannot.
 */
function resolveRecovery(refusal: ICampaignCommandRefusal): IGmRecoveryAction {
  const local = RECOVERIES[refusal.code];
  if (refusal.recoveryAction === null || refusal.recoveryAction === '') {
    return local;
  }
  return { ...local, serverAction: refusal.recoveryAction };
}

/**
 * The WIRE door: a member of the socket's `ErrorCodeSchema` to a refusal.
 *
 * Exactly two of that enum's thirteen members are campaign lifecycle
 * refusals. Everything else - `RATE_LIMITED`, `MATCH_PAUSED`,
 * `AUTH_REJECTED` and the rest - returns null, so a posture the product
 * cannot reach cannot be reached by accident either. `STALE_BRANCH` and
 * `PROJECTION_REWOUND` are not members of that enum at all and so cannot
 * arrive here however this function is written.
 *
 * A wire `Error` frame carries `code`, `reason` and `intentId` - no
 * action field - so the refusal it produces never names a recovery.
 */
const WIRE_REFUSALS: Readonly<Record<string, CampaignLifecycleRefusalCode>> = {
  CAMPAIGN_NOT_CONVERGED: 'CAMPAIGN_NOT_CONVERGED',
  PROJECTION_REBUILDING: 'PROJECTION_REBUILDING',
};

export function campaignRefusalFromServerErrorCode(
  code: string,
): ICampaignCommandRefusal | null {
  const refusal = WIRE_REFUSALS[code];
  return refusal === undefined ? null : { code: refusal, recoveryAction: null };
}

/**
 * The staleness family, collapsed onto one posture because they share one
 * recovery. Kept as a set rather than a union so a code this module has
 * never heard of cannot be mistaken for one it has.
 */
const STALE_COMMAND_CODES: ReadonlySet<string> = new Set([
  'STALE_BRANCH',
  'STALE_REVISION',
  'STALE_GENERATION',
]);

function readStringField(body: object, key: string): string | null {
  const value = Reflect.get(body, key);
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * The COMMAND door: the refusal body `/api/campaigns/[id]/commands`
 * answers with, to a refusal.
 *
 * Two arms are recognised, and they are the two the route actually
 * returns a 409 for:
 *
 *   - `blocked`, whose `reason` carries the admission code verbatim. A
 *     `blocked` for any OTHER reason - `campaign-not-on-journal-authority`
 *     among them - is deliberately NOT a lifecycle posture: it is a
 *     configuration fact about the campaign, and dressing it up as a
 *     rebuild would send the actor to wait for something that is never
 *     going to finish.
 *   - `conflict`, which means the base this command was written against
 *     is not the head. Since task 8.4 that arm is fully typed - a closed
 *     `reason`, the active `head`, a `recoveryAction` and the
 *     `conflictingFields` - and this door is deliberately blind to the
 *     reason. All five of them (`same-field-stale`,
 *     `undeclared-field-set`, `declared-field-set-mismatch`,
 *     `base-revision-unknown`, `lost-race`) mean the same thing to a
 *     SURFACE: your base is not the head. What differs is what to do
 *     about it, and the server already said that in `recoveryAction` -
 *     `resync-to-active-head` or `rebase-onto-active-head` - which is
 *     carried through verbatim rather than re-derived from the reason
 *     here. A client that mapped reasons to actions itself would be
 *     maintaining a second copy of a decision the authority already took.
 *
 * `PROJECTION_REWOUND` is admitted by neither arm, because no server
 * vocabulary contains it.
 */
export function campaignRefusalFromCommandRefusal(
  body: unknown,
): ICampaignCommandRefusal | null {
  if (typeof body !== 'object' || body === null) return null;
  const recoveryAction = readStringField(body, 'recoveryAction');
  const kind = Reflect.get(body, 'kind');
  if (kind === 'conflict') {
    return { code: 'STALE_BRANCH', recoveryAction };
  }
  if (kind !== 'blocked') return null;
  const reason = readStringField(body, 'reason');
  if (reason === 'PROJECTION_REBUILDING') {
    return { code: 'PROJECTION_REBUILDING', recoveryAction };
  }
  if (reason !== null && STALE_COMMAND_CODES.has(reason)) {
    return { code: 'STALE_BRANCH', recoveryAction };
  }
  return null;
}

/**
 * Maps a refusal to its posture. Shared by both surfaces so a refusal
 * never reads as one thing to a guest and another to the host.
 */
/**
 * The three postures a refusal can produce. Declared rather than widened
 * to `LifecycleState` so the GM posture's narrowed `state` accepts this
 * directly - and so a new refusal code cannot quietly introduce a posture
 * neither surface was written to render.
 */
type RefusalPostureState = Extract<
  LifecycleState,
  'blocked' | 'rewound' | 'rebuilding'
>;

function refusalState(
  refusal: CampaignLifecycleRefusalCode,
): RefusalPostureState {
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
    message:
      facts.refusal === null
        ? GUEST_MESSAGES[lifecycleState]
        : REFUSAL_MESSAGES[facts.refusal.code],
    recovery: facts.refusal === null ? null : resolveRecovery(facts.refusal),
  };
}

function deriveGuestLifecycleState(
  syncState: CampaignSyncUxState,
  facts: ICampaignLifecycleFacts,
): LifecycleState {
  // A refusal outranks the transport posture: being connected to a
  // source that will not take your command is exactly the situation
  // where a hopeful "up to date" reads as permission.
  if (facts.refusal !== null) return refusalState(facts.refusal.code);
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
    const state = refusalState(input.refusal.code);
    return {
      state,
      message: REFUSAL_MESSAGES[input.refusal.code],
      progressionEnabled: false,
      // Only the convergence refusal is decided against the intent, so
      // only it leaves the non-progression commands enabled. A rebuild
      // or a stale branch is refused before the intent is read.
      commandsEnabled: input.refusal.code === 'CAMPAIGN_NOT_CONVERGED',
      recovery: resolveRecovery(input.refusal),
    };
  }
  const state: LifecycleState =
    input.pendingProposalCount > 0 ? 'pending' : 'live';
  return {
    state,
    message: GM_MESSAGES[state],
    progressionEnabled: true,
    commandsEnabled: true,
    recovery: null,
  };
}

function assertNever(value: never): never {
  throw new Error(`Unexpected campaign lifecycle input: ${String(value)}`);
}
