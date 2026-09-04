/**
 * Campaign and GM lifecycle derivation (umbrella 19.1 / 19.2).
 *
 * The rows that matter most here are the GUARD rows at the bottom.
 * `rewound` and `rebuilding` are postures the product cannot reach yet -
 * they belong to `add-authoritative-history-branches` - and a reserved
 * posture is only honest if nothing live can wander into it. The
 * tactical half of this task learned that the hard way: its first guard
 * was a single sample, and a mutant that routed a live signal into the
 * reserved branch survived it. So the guard here is a SWEEP over every
 * wire error code crossed with every sync state and every fact
 * combination, plus a row proving the reserved postures are reachable
 * when the branch work does inject its typed signal - a guard that
 * nothing can satisfy is just as useless as one everything can.
 */

import type {
  CampaignLifecycleRefusalCode,
  ICampaignCommandRefusal,
  ICampaignLifecycleFacts,
} from '@/lib/campaign/lifecycle/campaignLifecycleState';
import type { CampaignSyncUxState } from '@/lib/campaign/replica/campaignSyncUxState';

import { CAMPAIGN_CONFLICT_REBASE_ACTION } from '@/lib/campaign/authority/campaignConflictDecision';
import {
  campaignRefusalFromCommandRefusal,
  campaignRefusalFromServerErrorCode,
  deriveGmLifecyclePosture,
  toCampaignLifecyclePosture,
} from '@/lib/campaign/lifecycle/campaignLifecycleState';
import { deriveCampaignSyncUxPosture } from '@/lib/campaign/replica/campaignSyncUxState';
import { REBUILD_RETRY_ACTION } from '@/lib/events/journal/EventHistoryCommandAdmission';
import { EXPECTED_HEAD_RESYNC_ACTION } from '@/lib/events/journal/EventHistoryExpectedHead';
import { ErrorCodeSchema } from '@/types/multiplayer/Protocol';

/** Builds each shipped sync posture from its real inputs, not a literal. */
const SYNC_INPUTS: Readonly<
  Record<CampaignSyncUxState, Parameters<typeof deriveCampaignSyncUxPosture>[0]>
> = {
  blocked: {
    connection: 'connected',
    refusedReason: 'revoked',
    awaitingRebaseline: false,
    deliveredSequence: 3,
    appliedSequence: 3,
    joinCompleted: true,
  },
  resyncing: {
    connection: 'connected',
    refusedReason: null,
    awaitingRebaseline: true,
    deliveredSequence: 3,
    appliedSequence: 3,
    joinCompleted: true,
  },
  retrying: {
    connection: 'disconnected',
    refusedReason: null,
    awaitingRebaseline: false,
    deliveredSequence: 3,
    appliedSequence: 3,
    joinCompleted: true,
  },
  'catching-up': {
    connection: 'connecting',
    refusedReason: null,
    awaitingRebaseline: false,
    deliveredSequence: 3,
    appliedSequence: 3,
    joinCompleted: false,
  },
  behind: {
    connection: 'connected',
    refusedReason: null,
    awaitingRebaseline: false,
    deliveredSequence: 7,
    appliedSequence: 3,
    joinCompleted: true,
  },
  live: {
    connection: 'connected',
    refusedReason: null,
    awaitingRebaseline: false,
    deliveredSequence: 3,
    appliedSequence: 3,
    joinCompleted: true,
  },
};

const SYNC_STATES = Object.keys(SYNC_INPUTS) as readonly CampaignSyncUxState[];

function sync(state: CampaignSyncUxState) {
  return deriveCampaignSyncUxPosture(SYNC_INPUTS[state]);
}

function facts(
  overrides: Partial<ICampaignLifecycleFacts> = {},
): ICampaignLifecycleFacts {
  return {
    proposalAwaitingGm: false,
    lastProposalCommitted: false,
    refusal: null,
    ...overrides,
  };
}

/** A refusal as received, with no server-named action unless one is given. */
function refusal(
  code: CampaignLifecycleRefusalCode,
  recoveryAction: string | null = null,
): ICampaignCommandRefusal {
  return { code, recoveryAction };
}

/**
 * Every code the wire can carry, READ FROM THE SCHEMA rather than typed
 * out here.
 *
 * The hand-written list this replaces had drifted: it carried
 * `STALE_BRANCH`, `STALE_OWNERSHIP` and `PROJECTION_REWOUND`, none of
 * which are members of `ErrorCodeSchema` and none of which any socket can
 * therefore deliver. A sweep over codes the wire cannot send is a sweep
 * that proves less than it claims, and it would have gone on passing
 * while a real new code was added to the enum and never swept at all.
 */
const LIVE_WIRE_CODES: readonly string[] = ErrorCodeSchema.options;

/**
 * Codes that are NOT wire codes, swept through the wire door anyway.
 *
 * `STALE_BRANCH` and `PROJECTION_REWOUND` belong to the command-admission
 * vocabulary, and the point of a two-door design is that arriving at the
 * wrong door gets you nowhere.
 */
const NON_WIRE_CODES = [
  'STALE_BRANCH',
  'STALE_REVISION',
  'STALE_GENERATION',
  'STALE_OWNERSHIP',
  'PROJECTION_REWOUND',
] as const;

/**
 * The one posture still reachable from nothing.
 *
 * `rebuilding` LEFT this list in 19.2 seam 3, and that is the point of
 * the list: `PROJECTION_REBUILDING` is a member of `ErrorCodeSchema` and
 * a real refusal from the command-admission gate, so a guard still
 * calling it unreachable would be guarding a lie. `rewound` is emitted by
 * nothing, in any vocabulary, and stays.
 *
 * `sealed` joins it, with an honest caveat: this one lands green on the
 * day it is added. The host posture cannot even name it (its state is
 * `GmReachableState`, which excludes it at compile time) and the guest
 * producers are exhaustive over a narrowed union, so the sweep confirms
 * a property the type system already enforces rather than falsifying a
 * reachable path. It is worth pinning anyway: a campaign has no
 * declare-then-reveal phase, and if a future producer widens either
 * union this row is what notices.
 */
const RESERVED_STATES = ['rewound', 'sealed'] as const;

const LIVE_REFUSALS: readonly CampaignLifecycleRefusalCode[] = [
  'CAMPAIGN_NOT_CONVERGED',
  'STALE_BRANCH',
  'PROJECTION_REWOUND',
  'PROJECTION_REBUILDING',
];

describe('guest lifecycle derivation', () => {
  it('renames each shipped sync posture into the shared vocabulary', () => {
    const named = SYNC_STATES.map(
      (state) =>
        toCampaignLifecyclePosture(sync(state), facts()).lifecycleState,
    );

    expect(named).toEqual([
      'blocked',
      'syncing',
      'reconnecting',
      'syncing',
      'behind',
      'live',
    ]);
  });

  it('keeps the shipped sync name and gate untouched underneath', () => {
    // The e2e spec and the shipped component tests read `state` and
    // `commandsEnabled`. Renaming on top must not move either.
    for (const state of SYNC_STATES) {
      const posture = toCampaignLifecyclePosture(sync(state), facts());
      expect(posture.state).toBe(state);
      expect(posture.commandsEnabled).toBe(state === 'live');
    }
  });

  it('reports a proposal awaiting the GM as pending', () => {
    const posture = toCampaignLifecyclePosture(
      sync('live'),
      facts({ proposalAwaitingGm: true }),
    );

    expect(posture.lifecycleState).toBe('pending');
    // Other actions are still legitimate - the per-action pending flag
    // is what withholds the one already in flight. Blanket-disabling
    // here would be a regression on shipped behaviour.
    expect(posture.commandsEnabled).toBe(true);
  });

  it('reports a decided proposal as finalized', () => {
    expect(
      toCampaignLifecyclePosture(
        sync('live'),
        facts({ lastProposalCommitted: true }),
      ).lifecycleState,
    ).toBe('finalized');
  });

  it('never names a decision posture on a view that is not converged', () => {
    // "Awaiting the GM" while the replica is mid-backfill would name the
    // wrong reason for the wait.
    for (const state of SYNC_STATES.filter((row) => row !== 'live')) {
      expect(
        toCampaignLifecyclePosture(
          sync(state),
          facts({ proposalAwaitingGm: true, lastProposalCommitted: true }),
        ).lifecycleState,
      ).not.toBe('pending');
    }
  });

  it('withholds the controls while a refusal stands', () => {
    const posture = toCampaignLifecyclePosture(
      sync('live'),
      facts({ refusal: refusal('CAMPAIGN_NOT_CONVERGED') }),
    );

    expect(posture.lifecycleState).toBe('blocked');
    expect(posture.commandsEnabled).toBe(false);
  });

  it('announces nothing with a digit in it', () => {
    // A spoken "twelve events behind" rebuilds the same inference
    // channel the scoped-projection proofs closed for the printed one.
    for (const state of SYNC_STATES) {
      for (const fact of [
        facts(),
        facts({ proposalAwaitingGm: true }),
        facts({ lastProposalCommitted: true }),
        facts({ refusal: refusal('CAMPAIGN_NOT_CONVERGED') }),
      ]) {
        expect(
          toCampaignLifecyclePosture(sync(state), fact).message,
        ).not.toMatch(/\d/);
      }
    }
  });
});

describe('GM lifecycle derivation', () => {
  it('is live and unrestricted with an empty queue', () => {
    const posture = deriveGmLifecyclePosture({
      refusal: null,
      pendingProposalCount: 0,
    });

    expect(posture.state).toBe('live');
    expect(posture.progressionEnabled).toBe(true);
    expect(posture.recovery).toBeNull();
  });

  it('is pending while proposals await review, without restricting anything', () => {
    const posture = deriveGmLifecyclePosture({
      refusal: null,
      pendingProposalCount: 2,
    });

    expect(posture.state).toBe('pending');
    // A queue is not a refusal. Gating here would stop the host from
    // clearing the very queue that produced the posture.
    expect(posture.progressionEnabled).toBe(true);
  });

  it('blocks progression and names a recovery when the campaign has not converged', () => {
    const posture = deriveGmLifecyclePosture({
      refusal: refusal('CAMPAIGN_NOT_CONVERGED'),
      pendingProposalCount: 1,
    });

    expect(posture.state).toBe('blocked');
    expect(posture.progressionEnabled).toBe(false);
    expect(posture.recovery?.code).toBe('CAMPAIGN_NOT_CONVERGED');
  });

  it('announces nothing with a digit in it', () => {
    for (const code of [null, ...LIVE_REFUSALS]) {
      expect(
        deriveGmLifecyclePosture({
          refusal: code === null ? null : refusal(code),
          pendingProposalCount: 4,
        }).message,
      ).not.toMatch(/\d/);
    }
  });

  it('withholds every command on a rebuild, and only progression when unconverged', () => {
    // The two refusals differ in REACH, and the posture is where that
    // difference has to survive - the surface reads these two flags and
    // cannot recover the distinction if they are collapsed here.
    const rebuilding = deriveGmLifecyclePosture({
      refusal: refusal('PROJECTION_REBUILDING'),
      pendingProposalCount: 1,
    });
    expect(rebuilding.commandsEnabled).toBe(false);
    expect(rebuilding.progressionEnabled).toBe(false);

    const unconverged = deriveGmLifecyclePosture({
      refusal: refusal('CAMPAIGN_NOT_CONVERGED'),
      pendingProposalCount: 1,
    });
    expect(unconverged.commandsEnabled).toBe(true);
    expect(unconverged.progressionEnabled).toBe(false);
  });
});

describe('the two refusal doors', () => {
  it('admits exactly the wire codes that are campaign lifecycle refusals', () => {
    const admitted = LIVE_WIRE_CODES.filter(
      (code) => campaignRefusalFromServerErrorCode(code) !== null,
    );

    expect(admitted).toStrictEqual([
      'CAMPAIGN_NOT_CONVERGED',
      'PROJECTION_REBUILDING',
      'CAMPAIGN_STALE_HEAD',
    ]);
  });

  it('admits CAMPAIGN_STALE_HEAD as the blocked posture instead of dropping it', () => {
    const mapped = campaignRefusalFromServerErrorCode('CAMPAIGN_STALE_HEAD');
    expect(mapped).not.toBeNull();
    expect(
      deriveGmLifecyclePosture({
        refusal: mapped,
        pendingProposalCount: 0,
      }).state,
    ).toBe('blocked');
  });

  it('fills serverAction from the wire frame recoveryAction verbatim', () => {
    const mapped = campaignRefusalFromServerErrorCode(
      'CAMPAIGN_STALE_HEAD',
      EXPECTED_HEAD_RESYNC_ACTION,
    );
    expect(
      deriveGmLifecyclePosture({
        refusal: mapped,
        pendingProposalCount: 0,
      }).recovery?.serverAction,
    ).toBe(EXPECTED_HEAD_RESYNC_ACTION);
  });

  it('still resolves an already-admitted wire code exactly as before', () => {
    expect(
      campaignRefusalFromServerErrorCode('CAMPAIGN_NOT_CONVERGED'),
    ).toStrictEqual({
      code: 'CAMPAIGN_NOT_CONVERGED',
      recoveryAction: null,
    });
    expect(
      campaignRefusalFromServerErrorCode('PROJECTION_REBUILDING'),
    ).toStrictEqual({
      code: 'PROJECTION_REBUILDING',
      recoveryAction: null,
    });
  });

  it('turns away the command-vocabulary codes at the wire door', () => {
    // Two doors are only two doors if arriving at the wrong one gets you
    // nowhere. None of these is a member of `ErrorCodeSchema`, so none of
    // them can arrive here in production either - this pins that the
    // function agrees with the schema rather than being more generous
    // than it.
    for (const code of NON_WIRE_CODES) {
      expect(campaignRefusalFromServerErrorCode(code)).toBeNull();
    }
  });

  it("reads a rebuild out of the commands route's blocked body", () => {
    // The body is the one PRODUCTION sends. `campaignCommandPipeline`'s
    // rebuild arm carries `recoveryAction: rebuilding.action` and the
    // route forwards it, so a fixture that omitted the field - as this
    // row's first version did - was pinning a shape the route had stopped
    // producing. The constant is imported, not retyped, so the day the
    // admission renames its action this row fails instead of drifting.
    expect(
      campaignRefusalFromCommandRefusal({
        kind: 'blocked',
        reason: 'PROJECTION_REBUILDING',
        recoveryAction: REBUILD_RETRY_ACTION,
      }),
    ).toStrictEqual({
      code: 'PROJECTION_REBUILDING',
      recoveryAction: REBUILD_RETRY_ACTION,
    });
  });

  it('does not read a lifecycle posture out of every blocked body', () => {
    // `campaign-not-on-journal-authority` is a configuration fact, not a
    // rebuild. Telling the actor to wait for it would be telling them to
    // wait for something that is never going to finish.
    expect(
      campaignRefusalFromCommandRefusal({
        kind: 'blocked',
        reason: 'campaign-not-on-journal-authority',
      }),
    ).toBeNull();
  });

  it("carries the recovery action task 8.4's typed conflict names, verbatim", () => {
    // The constants are IMPORTED, not retyped: this row is a claim about
    // what the authority actually emits, and a hand-copied string would
    // keep passing on the day the authority changed it.
    for (const reason of [
      'same-field-stale',
      'undeclared-field-set',
      'declared-field-set-mismatch',
      'base-revision-unknown',
      'lost-race',
    ]) {
      expect(
        campaignRefusalFromCommandRefusal({
          kind: 'conflict',
          reason,
          head: { branchId: 'root', revision: 7 },
          recoveryAction: CAMPAIGN_CONFLICT_REBASE_ACTION,
          conflictingFields: ['balance'],
        }),
      ).toStrictEqual({
        code: 'STALE_BRANCH',
        recoveryAction: CAMPAIGN_CONFLICT_REBASE_ACTION,
      });
    }
  });

  it("carries the server's action verbatim WITHOUT putting it on the button", () => {
    const local = deriveGmLifecyclePosture({
      refusal: refusal('STALE_BRANCH'),
      pendingProposalCount: 0,
    });
    const named = deriveGmLifecyclePosture({
      refusal: refusal('STALE_BRANCH', EXPECTED_HEAD_RESYNC_ACTION),
      pendingProposalCount: 0,
    });

    // The server's instruction is carried VERBATIM - but as its own
    // field, not as the button's label. The button says what pressing it
    // does; `serverAction` says what the authority told the client to do.
    // Those are two different sentences, and cut A had them as one.
    expect(named.recovery?.serverAction).toBe(EXPECTED_HEAD_RESYNC_ACTION);
    expect(local.recovery?.serverAction).toBeNull();
    // The label does NOT move when the server names an action, because
    // the handler does not move either.
    expect(local.recovery?.label).toBe('Check again');
    expect(named.recovery?.label).toBe('Check again');
    expect(named.recovery?.description).toBe(local.recovery?.description);
    expect(named.recovery?.actionable).toBe(true);
  });

  it('offers no action to press while a rebuild is running', () => {
    expect(
      deriveGmLifecyclePosture({
        refusal: refusal('PROJECTION_REBUILDING'),
        pendingProposalCount: 0,
      }).recovery,
    ).toStrictEqual({
      code: 'PROJECTION_REBUILDING',
      label: 'Wait for rebuild',
      description:
        'The campaign projection is being rebuilt from authoritative history. It reopens on its own when the rebuild finishes.',
      actionable: false,
      // The rebuild refusal DOES carry a server action in production
      // (`retry-after-rebuild`); this row is the no-action-supplied case,
      // so the field is null rather than absent. `toStrictEqual` is what
      // makes a silently-dropped field fail here.
      serverAction: null,
    });
  });

  it('ignores a body that is not a refusal at all', () => {
    for (const body of [
      null,
      undefined,
      'blocked',
      42,
      {},
      { kind: 'committed' },
      { kind: 'rejected', reason: 'insufficient-funds' },
      { kind: 'duplicate', commandId: 'c-1' },
    ]) {
      expect(campaignRefusalFromCommandRefusal(body)).toBeNull();
    }
  });
});

/**
 * Finding #93. Every actionable recovery on both surfaces is wired to the
 * SAME handler - `onClearRefusal`, which clears a local hint so the server
 * answers again. It resyncs nothing, rebases nothing, and commits nothing.
 * So a label promising a resync is a promise the button cannot keep, and
 * the person who trusts it goes and waits for a state change that never
 * happens.
 *
 * These rows derive from the recovery table THROUGH the real derivation
 * rather than reading a literal, so a future entry whose handler clears a
 * hint cannot quietly claim a resync.
 */
describe('a recovery label says what pressing it does', () => {
  /** Every refusal the vocabulary admits - the whole table, not a sample. */
  const ALL_REFUSALS: readonly CampaignLifecycleRefusalCode[] = [
    'CAMPAIGN_NOT_CONVERGED',
    'STALE_BRANCH',
    'PROJECTION_REWOUND',
    'PROJECTION_REBUILDING',
  ];

  /** What the one shared handler actually does, in the user's words. */
  const CLEAR_HINT_LABEL = 'Check again';

  /** Words that promise the client will move itself to another head. */
  const MOVEMENT_PROMISE = /resync|rebase/i;

  it('gives every pressable recovery the one label its handler earns', () => {
    for (const code of ALL_REFUSALS) {
      const recovery = deriveGmLifecyclePosture({
        refusal: refusal(code),
        pendingProposalCount: 0,
      }).recovery;
      if (recovery?.actionable !== true) continue;
      expect(recovery.label).toBe(CLEAR_HINT_LABEL);
    }
  });

  it('never promises movement on a control that only clears a hint', () => {
    // The sweep that closes the second door. The table is one source of a
    // label; a server-supplied `recoveryAction` is the other, and it is
    // literally `resync-to-active-head` / `rebase-onto-active-head`. A row
    // that checked only the table would stay green while production put
    // the server's instruction on the button.
    const serverActions = [
      null,
      EXPECTED_HEAD_RESYNC_ACTION,
      CAMPAIGN_CONFLICT_REBASE_ACTION,
    ];
    for (const code of ALL_REFUSALS) {
      for (const serverAction of serverActions) {
        const recovery = deriveGmLifecyclePosture({
          refusal: refusal(code, serverAction),
          pendingProposalCount: 0,
        }).recovery;
        if (recovery?.actionable !== true) continue;
        expect(recovery.label).not.toMatch(MOVEMENT_PROMISE);
      }
    }
  });

  it('does not let the description keep the promise the label gave up', () => {
    // Moving the lie from the button to the sentence under it would be no
    // fix at all.
    for (const code of ALL_REFUSALS) {
      const recovery = deriveGmLifecyclePosture({
        refusal: refusal(code),
        pendingProposalCount: 0,
      }).recovery;
      if (recovery?.actionable !== true) continue;
      expect(recovery.description).not.toMatch(MOVEMENT_PROMISE);
    }
  });

  it("still carries the server's instruction where it can be read", () => {
    // Truthful labelling must not become silence: the authority DID say
    // what to do, and dropping it would lose the only real recovery
    // instruction that exists.
    const recovery = deriveGmLifecyclePosture({
      refusal: refusal('STALE_BRANCH', EXPECTED_HEAD_RESYNC_ACTION),
      pendingProposalCount: 0,
    }).recovery;

    expect(recovery?.serverAction).toBe(EXPECTED_HEAD_RESYNC_ACTION);
  });
});

describe('rewound is still reachable from nothing', () => {
  it('is reached by NO live signal through EITHER door', () => {
    // The sweep, not a sample. Every code the wire can carry and every
    // refusal body the commands route can answer with, crossed with every
    // sync state and every fact combination.
    //
    // `rebuilding` deliberately left this guard in 19.2 seam 3 - it is a
    // real refusal now, and the row above proves the door admits it. What
    // is left is the posture nothing emits.
    const doorProducts = [
      ...LIVE_WIRE_CODES.map((code) =>
        campaignRefusalFromServerErrorCode(code),
      ),
      ...NON_WIRE_CODES.map((code) => campaignRefusalFromServerErrorCode(code)),
      ...[
        { kind: 'blocked', reason: 'PROJECTION_REBUILDING' },
        { kind: 'blocked', reason: 'campaign-not-on-journal-authority' },
        { kind: 'blocked', reason: 'STALE_BRANCH' },
        { kind: 'blocked', reason: 'STALE_REVISION' },
        { kind: 'blocked', reason: 'STALE_GENERATION' },
        { kind: 'blocked', reason: 'PROJECTION_REWOUND' },
        { kind: 'conflict', reason: 'same-field-stale' },
        { kind: 'conflict', reason: 'lost-race' },
        { kind: 'rejected', reason: 'insufficient-funds' },
      ].map((body) => campaignRefusalFromCommandRefusal(body)),
    ];

    for (const produced of doorProducts) {
      for (const state of SYNC_STATES) {
        for (const proposalAwaitingGm of [false, true]) {
          for (const lastProposalCommitted of [false, true]) {
            const guest = toCampaignLifecyclePosture(
              sync(state),
              facts({
                proposalAwaitingGm,
                lastProposalCommitted,
                refusal: produced,
              }),
            );
            expect(RESERVED_STATES).not.toContain(guest.lifecycleState);
          }
        }
      }
      for (const pendingProposalCount of [0, 1, 5]) {
        const host = deriveGmLifecyclePosture({
          refusal: produced,
          pendingProposalCount,
        });
        expect(RESERVED_STATES).not.toContain(host.state);
      }
    }
  });

  it('is reached the moment something injects the typed signal', () => {
    // A guard nothing can satisfy is as useless as one everything can.
    // This is the one call the branch work makes to light the posture
    // without touching a banner or a locator.
    expect(
      deriveGmLifecyclePosture({
        refusal: refusal('PROJECTION_REWOUND'),
        pendingProposalCount: 0,
      }).state,
    ).toBe('rewound');
    expect(
      toCampaignLifecyclePosture(
        sync('live'),
        facts({ refusal: refusal('PROJECTION_REWOUND') }),
      ).lifecycleState,
    ).toBe('rewound');
  });

  it('lights rebuilding from a signal that is real today', () => {
    // The counterpart. This one is NOT reserved any more, and the row
    // says so through the door rather than by handing the posture in.
    expect(
      toCampaignLifecyclePosture(
        sync('live'),
        facts({
          refusal: campaignRefusalFromServerErrorCode('PROJECTION_REBUILDING'),
        }),
      ).lifecycleState,
    ).toBe('rebuilding');
  });
});
