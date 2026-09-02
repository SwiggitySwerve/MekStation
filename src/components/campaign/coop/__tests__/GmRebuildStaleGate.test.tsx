/**
 * Gating the GM decision surface during a REBUILD and on a STALE BRANCH
 * (umbrella 19.2, two of the four gates seam 1 left typed-and-guarded).
 *
 * Seam 1 gated required convergence and surfaced the blocked posture. The
 * other two gates were routed but unreachable, and the shapes they need
 * are now shipped server-side rather than hypothetical:
 *
 *   - `PROJECTION_REBUILDING` is a member of the wire's own
 *     `ErrorCodeSchema` and a real refusal from `executeCampaignCommand`'s
 *     blocked arm (a 409 from `/api/campaigns/[id]/commands`);
 *   - `STALE_BRANCH` is not a wire code at all - it belongs to the COMMAND
 *     admission vocabulary (`EventHistoryExpectedHead`), which is why it
 *     arrives through a different door.
 *
 * THE DISTINCTION THESE ROWS EXIST TO HOLD. The convergence refusal is
 * checked against the intent, so it withholds ONE approval and leaves the
 * queue workable. A rebuild is decided before the intent is read, so it
 * withholds every approval. Both directions are asserted, because a gate
 * that is too wide and a gate that is too narrow are both lies about what
 * the server will do - and each of them passes the other's test.
 *
 * The rows are also split between the two things that can be wrong
 * independently: whether the surface WITHHOLDS the control, and whether
 * it SAYS WHY. A disabled control with no rendered reason is a dead
 * button - the failure mode finding #42 was filed for - and it satisfies
 * every gate assertion on its own.
 */

import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';

import type {
  CampaignLifecycleRefusalCode,
  ICampaignCommandRefusal,
} from '@/lib/campaign/lifecycle/campaignLifecycleState';
import type { IPendingProposal } from '@/lib/multiplayer/server/CampaignGmArbiter';

import { CAMPAIGN_CONFLICT_REBASE_ACTION } from '@/lib/campaign/authority/campaignConflictDecision';
import { deriveGmLifecyclePosture } from '@/lib/campaign/lifecycle/campaignLifecycleState';

import { HostGmReviewSurface } from '../HostGmReviewSurface';

// =============================================================================
// Fixtures
// =============================================================================

/** A refusal as received, with no server-named action unless one is given. */
function refusal(
  code: CampaignLifecycleRefusalCode,
  recoveryAction: string | null = null,
): ICampaignCommandRefusal {
  return { code, recoveryAction };
}

/** The host posture under one refusal, built through the real derivation. */
function postureUnder(
  code: CampaignLifecycleRefusalCode | null,
  pendingProposalCount = 1,
) {
  return deriveGmLifecyclePosture({
    refusal: code === null ? null : refusal(code),
    pendingProposalCount,
  });
}

function pendingProposal(id: string, kind: string): IPendingProposal {
  return {
    proposal: {
      proposalId: id,
      campaignId: 'campaign-1',
      proposingPlayerId: 'guest-player',
      ts: '2026-09-01T10:00:00.000Z',
      intent: {
        kind,
        campaignId: 'campaign-1',
        intentId: `intent-${id}`,
        payload:
          kind === 'AdvanceDay' ? { days: 1 } : { amount: 1, reason: 'x' },
      },
    },
    balanceAtSubmit: 600_000,
    relevantStanding: null,
    effectSummary: `Proposal ${id}`,
  } as unknown as IPendingProposal;
}

/** Both proposal kinds, so the per-intent gate has something to be precise about. */
const QUEUE = [
  pendingProposal('p-day', 'AdvanceDay'),
  pendingProposal('p-spend', 'SpendFunds'),
];

/**
 * Asserts the anti-dead-button contract on one control: disabled, and
 * pointing at an element that EXISTS and actually says something. A
 * `data-` attribute is not a reason - nothing reads it to a human.
 */
function expectDisabledWithReason(control: HTMLElement): void {
  expect(control).toBeDisabled();
  const describedBy = control.getAttribute('aria-describedby');
  expect(describedBy).toBeTruthy();
  const reason = document.getElementById(describedBy as string);
  expect(reason).not.toBeNull();
  expect((reason as HTMLElement).textContent?.trim() ?? '').not.toBe('');
}

afterEach(() => {
  cleanup();
});

// =============================================================================
// The gate's reach
// =============================================================================

describe('GM decision controls under a rebuild', () => {
  it('withholds approval of EVERY proposal, not only progression', () => {
    // `executeCampaignCommand` returns `blocked` from its admission arm
    // before it looks at the intent, so an approval of a SpendFunds
    // proposal is refused just as hard as an AdvanceDay.
    render(
      <HostGmReviewSurface
        pending={QUEUE}
        onDecide={() => {}}
        lifecycle={postureUnder('PROJECTION_REBUILDING', 2)}
      />,
    );

    expectDisabledWithReason(screen.getByTestId('approve-p-day'));
    expectDisabledWithReason(screen.getByTestId('approve-p-spend'));
  });

  it('withholds every approval on a stale branch too', () => {
    render(
      <HostGmReviewSurface
        pending={QUEUE}
        onDecide={() => {}}
        lifecycle={postureUnder('STALE_BRANCH', 2)}
      />,
    );

    expectDisabledWithReason(screen.getByTestId('approve-p-day'));
    expectDisabledWithReason(screen.getByTestId('approve-p-spend'));
  });

  it('keeps veto live while the projection rebuilds', () => {
    // A veto removes a proposal from the arbiter's queue and appends no
    // campaign event, so no admission gate sees it. Gating it would
    // strand the host with a queue they are entitled to clear, and would
    // teach them the gate does not mean what it says.
    render(
      <HostGmReviewSurface
        pending={QUEUE}
        onDecide={() => {}}
        lifecycle={postureUnder('PROJECTION_REBUILDING', 2)}
      />,
    );

    const veto = screen.getByTestId('veto-p-day');
    expect(veto).toBeEnabled();
    // Enabled AND not carrying the withheld-control marking. A veto that
    // was merely clickable while dressed as blocked would still tell the
    // host the wrong thing about what the server will take.
    expect(veto).not.toHaveAttribute('aria-describedby');
    expect(veto).not.toHaveAttribute('data-lifecycle-blocked');
  });

  it('keeps the per-intent precision the convergence refusal has', () => {
    // The precision row. Widening the gate for the rebuild must not
    // flatten the convergence gate into a global disable.
    render(
      <HostGmReviewSurface
        pending={QUEUE}
        onDecide={() => {}}
        lifecycle={postureUnder('CAMPAIGN_NOT_CONVERGED', 2)}
      />,
    );

    expect(screen.getByTestId('approve-p-day')).toBeDisabled();
    expect(screen.getByTestId('approve-p-spend')).toBeEnabled();
    expect(screen.getByTestId('approve-p-spend')).not.toHaveAttribute(
      'aria-describedby',
    );
  });

  it('offers every decision when nothing is refusing them', () => {
    // The inverse. A gate that never opens teaches nothing about the gate.
    render(
      <HostGmReviewSurface
        pending={QUEUE}
        onDecide={() => {}}
        lifecycle={postureUnder(null, 2)}
      />,
    );

    expect(screen.getByTestId('approve-p-day')).toBeEnabled();
    expect(screen.getByTestId('approve-p-spend')).toBeEnabled();
    expect(screen.queryByTestId('gm-command-blocked-reason')).toBeNull();
  });
});

// =============================================================================
// The reason has to be TRUE, not merely present
// =============================================================================

describe('the rendered reason names the refusal that actually happened', () => {
  /** Renders the surface under one refusal and returns the reason text. */
  function reasonUnder(code: CampaignLifecycleRefusalCode): string {
    const { unmount } = render(
      <HostGmReviewSurface
        pending={[pendingProposal('p-day', 'AdvanceDay')]}
        onDecide={() => {}}
        lifecycle={postureUnder(code)}
      />,
    );
    const text = screen.getByTestId('gm-command-blocked-reason').textContent;
    unmount();
    return text ?? '';
  }

  it('does not give three different refusals the same sentence', () => {
    // The anti-dead-button rows only prove a reason EXISTS. A single
    // generic string would satisfy every one of them while telling a host
    // on a stale branch to wait for participants to catch up - which is a
    // wrong instruction, and a wrong instruction is worse than a vague
    // one: the host goes and waits for a thing that already happened.
    const reasons = [
      reasonUnder('CAMPAIGN_NOT_CONVERGED'),
      reasonUnder('STALE_BRANCH'),
      reasonUnder('PROJECTION_REBUILDING'),
    ];

    expect(new Set(reasons).size).toBe(3);
  });

  it('names convergence only where convergence is the problem', () => {
    // The specific half of the row above: distinctness alone could be
    // satisfied by three equally wrong sentences.
    expect(reasonUnder('CAMPAIGN_NOT_CONVERGED')).toMatch(/catches up/i);
    expect(reasonUnder('STALE_BRANCH')).not.toMatch(/catches up/i);
    expect(reasonUnder('STALE_BRANCH')).toMatch(/superseded branch/i);
    expect(reasonUnder('PROJECTION_REBUILDING')).toMatch(/rebuild/i);
  });
});

// =============================================================================
// Recovery per posture
// =============================================================================

describe('recovery actions per posture', () => {
  it('tells a host to wait out a rebuild, and offers no button to press', () => {
    // There is nothing to press. The stream reopens on lease expiry,
    // release, or activation, so a button here would be a control whose
    // only effect is to let the host discover the same refusal again.
    render(
      <HostGmReviewSurface
        pending={[]}
        onDecide={() => {}}
        lifecycle={postureUnder('PROJECTION_REBUILDING', 0)}
      />,
    );

    // The recovery is STATED and there is no button. Both halves matter:
    // no text at all leaves the host guessing.
    expect(screen.getByTestId('gm-lifecycle-recovery-wait')).toHaveTextContent(
      'Wait for rebuild',
    );
    expect(screen.queryByTestId('gm-lifecycle-recovery')).toBeNull();
  });

  it('offers a stale-branch host the one thing the control actually does', () => {
    // This row used to be named "sends a host on a stale branch back to
    // the active head" and asserted a button labelled `Resync to active
    // head`. It sent nobody anywhere: the handler clears a local hint
    // (finding #93). The row now pins the honest label, and the branch it
    // is stale against is explained in the description instead - where a
    // sentence can say something the button cannot do.
    render(
      <HostGmReviewSurface
        pending={[]}
        onDecide={() => {}}
        lifecycle={postureUnder('STALE_BRANCH', 0)}
      />,
    );

    expect(screen.getByTestId('gm-lifecycle-recovery')).toHaveTextContent(
      'Check again',
    );
    expect(
      screen.getByTestId('gm-lifecycle-recovery-description'),
    ).toHaveTextContent(/superseded branch/i);
  });

  it('renders no recovery at all for a posture that has none', () => {
    // A recovery invented for a healthy posture is worse than none: it
    // implies something is wrong.
    render(
      <HostGmReviewSurface
        pending={[]}
        onDecide={() => {}}
        lifecycle={postureUnder(null, 0)}
      />,
    );

    expect(screen.queryByTestId('gm-lifecycle-recovery')).toBeNull();
    expect(
      screen.queryByTestId('gm-lifecycle-recovery-description'),
    ).toBeNull();
    expect(screen.queryByTestId('gm-lifecycle-recovery-wait')).toBeNull();
  });

  it("shows the server's own recovery action verbatim when it names one", () => {
    // The constant is IMPORTED, not retyped: this row is a claim about
    // what task 8.4's conflict decision actually emits, and a hand-copied
    // string would keep passing on the day the authority changed it.
    render(
      <HostGmReviewSurface
        pending={[]}
        onDecide={() => {}}
        lifecycle={deriveGmLifecyclePosture({
          refusal: refusal('STALE_BRANCH', CAMPAIGN_CONFLICT_REBASE_ACTION),
          pendingProposalCount: 0,
        })}
      />,
    );

    // Rendered verbatim in its OWN element. Not on the button: the
    // button's handler clears a local hint and rebases nothing, so
    // labelling it `rebase-onto-active-head` would promise a movement
    // pressing it cannot perform (finding #93).
    expect(
      screen.getByTestId('gm-lifecycle-recovery-server-action'),
    ).toHaveTextContent(CAMPAIGN_CONFLICT_REBASE_ACTION);
    expect(screen.getByTestId('gm-lifecycle-recovery')).toHaveTextContent(
      'Check again',
    );
  });

  it('never puts a movement promise on a control that only clears a hint', () => {
    // The rendered half of the #93 sweep. The derivation rows pin the
    // label; this pins what actually reaches the DOM, for a refusal with a
    // server action and one without - the two ways a label is produced.
    for (const serverAction of [null, CAMPAIGN_CONFLICT_REBASE_ACTION]) {
      const { unmount } = render(
        <HostGmReviewSurface
          pending={[]}
          onDecide={() => {}}
          lifecycle={deriveGmLifecyclePosture({
            refusal: refusal('STALE_BRANCH', serverAction),
            pendingProposalCount: 0,
          })}
        />,
      );

      expect(
        screen.getByTestId('gm-lifecycle-recovery').textContent ?? '',
      ).not.toMatch(/resync|rebase/i);
      unmount();
    }
  });
});
