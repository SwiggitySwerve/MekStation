import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
/**
 * Accessibility of every campaign lifecycle state (umbrella 19.3/19.4).
 *
 * The banner tells a player whether to trust what is on screen. A
 * sighted player watches it flip from "up to date" to "reconnecting";
 * before this, a screen-reader user got nothing at all, because a status
 * that changes outside a live region is announced to nobody.
 *
 * Every state is exercised rather than one representative, because the
 * per-state tone classes are the kind of thing that silently breaks
 * contrast for exactly one posture — and the broken one would be a
 * failure state, which is when the message matters most.
 */
import React from 'react';

import type { ICampaignLifecyclePosture } from '@/lib/campaign/lifecycle/campaignLifecycleState';
import type { CampaignSyncUxState } from '@/lib/campaign/replica/campaignSyncUxState';
import type { LifecycleState } from '@/lib/lifecycle/lifecycleState';

import { CampaignSyncStateBanner } from '@/components/campaign/coop/CampaignSyncStateBanner';
import { HostGmReviewSurface } from '@/components/campaign/coop/HostGmReviewSurface';
import {
  deriveGmLifecyclePosture,
  toCampaignLifecyclePosture,
} from '@/lib/campaign/lifecycle/campaignLifecycleState';
import { deriveCampaignSyncUxPosture } from '@/lib/campaign/replica/campaignSyncUxState';

const STATES: readonly CampaignSyncUxState[] = [
  'blocked',
  'resyncing',
  'retrying',
  'catching-up',
  'behind',
  'live',
];

/**
 * The lifecycle name each sync posture publishes since 19.1. Written out
 * rather than derived so a silent change to the mapping shows up here as
 * a diff, on the suite that pins what a screen reader is handed.
 */
const LIFECYCLE_NAME: Readonly<Record<CampaignSyncUxState, LifecycleState>> = {
  blocked: 'blocked',
  resyncing: 'syncing',
  retrying: 'reconnecting',
  'catching-up': 'syncing',
  behind: 'behind',
  live: 'live',
};

function posture(state: CampaignSyncUxState): ICampaignLifecyclePosture {
  return {
    state,
    lifecycleState: LIFECYCLE_NAME[state],
    message: `Synchronization posture: ${state}.`,
    commandsEnabled: state === 'live',
    // These rows drive the banner from a SYNC state, and no sync state
    // is a refusal - only a refusal carries a recovery.
    recovery: null,
  };
}

/**
 * The four lifecycle postures the campaign surface reaches that no SYNC
 * state maps onto (umbrella 19.4). `pending` and `finalized` come from
 * the guest's own proposal traffic; `rewound` and `rebuilding` from the
 * reserved projection signals. They are DERIVED through the real
 * function rather than written as literals, so a row here cannot pass
 * against a posture the product could never build.
 *
 * `sealed` is absent on purpose and is not an omission: a campaign has
 * no declare-then-reveal phase, so `deriveGuestLifecycleState` cannot
 * return it. The tactical surface, which does have one, covers it.
 */
const CONVERGED_SYNC = {
  connection: 'connected',
  refusedReason: null,
  awaitingRebaseline: false,
  deliveredSequence: 3,
  appliedSequence: 3,
  joinCompleted: true,
} as const;

const DECISION_AND_PROJECTION_POSTURES: ReadonlyArray<
  readonly [LifecycleState, ICampaignLifecyclePosture]
> = [
  [
    'pending',
    toCampaignLifecyclePosture(deriveCampaignSyncUxPosture(CONVERGED_SYNC), {
      proposalAwaitingGm: true,
      lastProposalCommitted: false,
      refusal: null,
    }),
  ],
  [
    'finalized',
    toCampaignLifecyclePosture(deriveCampaignSyncUxPosture(CONVERGED_SYNC), {
      proposalAwaitingGm: false,
      lastProposalCommitted: true,
      refusal: null,
    }),
  ],
  [
    'rewound',
    toCampaignLifecyclePosture(deriveCampaignSyncUxPosture(CONVERGED_SYNC), {
      proposalAwaitingGm: false,
      lastProposalCommitted: false,
      refusal: { code: 'PROJECTION_REWOUND', recoveryAction: null },
    }),
  ],
  [
    'rebuilding',
    toCampaignLifecyclePosture(deriveCampaignSyncUxPosture(CONVERGED_SYNC), {
      proposalAwaitingGm: false,
      lastProposalCommitted: false,
      refusal: { code: 'PROJECTION_REBUILDING', recoveryAction: null },
    }),
  ],
];

describe('campaign lifecycle postures beyond the sync vocabulary', () => {
  it.each(DECISION_AND_PROJECTION_POSTURES)(
    'derives %s rather than accepting it as a literal',
    (expected, built) => {
      expect(built.lifecycleState).toBe(expected);
    },
  );

  it.each(DECISION_AND_PROJECTION_POSTURES)(
    'renders %s with no axe violations',
    async (_expected, built) => {
      const { container } = render(<CampaignSyncStateBanner posture={built} />);

      expect(await axe(container)).toHaveNoViolations();
    },
  );

  it.each(DECISION_AND_PROJECTION_POSTURES)(
    'announces %s through a polite, atomic live region',
    (_expected, built) => {
      render(<CampaignSyncStateBanner posture={built} />);

      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
      expect(status).toHaveAttribute('aria-atomic', 'true');
      expect(status).not.toHaveAttribute('aria-live', 'assertive');
      expect(status.textContent ?? '').not.toMatch(/\d/);
    },
  );
});

describe('campaign sync banner a11y', () => {
  it.each(STATES)('renders %s with no axe violations', async (state) => {
    const { container } = render(
      <CampaignSyncStateBanner posture={posture(state)} />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it.each(STATES)('announces %s through a live region', (state) => {
    render(<CampaignSyncStateBanner posture={posture(state)} />);

    // `role="status"` is what makes a CHANGE audible. Querying by role
    // rather than testid is the point: it asserts the accessibility tree
    // a screen reader actually walks, not a hook only tests can see.
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(`Synchronization posture: ${state}.`);
    expect(status).toHaveAttribute('aria-live', 'polite');
    // Atomic, so the whole sentence is re-read. Without it a reader may
    // announce only the changed words, turning "you are up to date" into
    // a fragment that means nothing alone.
    expect(status).toHaveAttribute('aria-atomic', 'true');
  });

  it('never interrupts with an assertive region, even when blocked', () => {
    // Assertive cuts off whatever the reader is currently speaking. A
    // sync posture is never more urgent than the sentence the player is
    // in the middle of, and the blocked state also disables the
    // controls, so it is discoverable by trying.
    render(<CampaignSyncStateBanner posture={posture('blocked')} />);

    expect(screen.getByRole('status')).not.toHaveAttribute(
      'aria-live',
      'assertive',
    );
  });

  it('carries no digits, so the announcement leaks no distance', () => {
    // The same privacy rule the visual banner follows (tasks 3.2/3.4):
    // a spoken "12 events behind" would rebuild the inference channel
    // just as surely as a printed one.
    for (const state of STATES) {
      const { unmount } = render(
        <CampaignSyncStateBanner posture={posture(state)} />,
      );
      expect(screen.getByRole('status').textContent ?? '').not.toMatch(/\d/);
      unmount();
    }
  });
});

/**
 * The GM half (umbrella 19.1/19.2). Same discipline, same reasons: the
 * host's posture decides whether a control they are looking at will be
 * taken, and a host who cannot see the screen has to be told.
 */
const GM_REFUSALS = [
  null,
  'CAMPAIGN_NOT_CONVERGED',
  'STALE_BRANCH',
  'PROJECTION_REWOUND',
  'PROJECTION_REBUILDING',
] as const;

describe('GM lifecycle banner a11y', () => {
  it.each(GM_REFUSALS)('renders %s with no axe violations', async (refusal) => {
    const { container } = render(
      <HostGmReviewSurface
        pending={[]}
        onDecide={() => {}}
        lifecycle={deriveGmLifecyclePosture({
          refusal:
            refusal === null ? null : { code: refusal, recoveryAction: null },
          pendingProposalCount: 0,
        })}
      />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it.each(GM_REFUSALS)('announces %s through a live region', (refusal) => {
    // By ROLE, not by testid: it pins the accessibility tree a screen
    // reader actually walks rather than a hook only tests can see.
    render(
      <HostGmReviewSurface
        pending={[]}
        onDecide={() => {}}
        lifecycle={deriveGmLifecyclePosture({
          refusal:
            refusal === null ? null : { code: refusal, recoveryAction: null },
          pendingProposalCount: 0,
        })}
      />,
    );

    // The surface now carries TWO status regions - the posture strip and
    // the decision announcement (19.3) - so this resolves the posture one
    // by testid and then asserts it is AMONG the elements exposed as
    // `status`. That keeps the original point of the row: the posture
    // reaches the accessibility tree a screen reader walks, not merely a
    // hook only tests can see.
    const status = screen.getByTestId('gm-lifecycle-state');
    expect(screen.getAllByRole('status')).toContain(status);
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-atomic', 'true');
    expect(status).not.toHaveAttribute('aria-live', 'assertive');
    // No digits, for the same reason the guest banner carries none. This
    // rule governs the POSTURE, which is derived from stream distance;
    // the decision announcement beside it names the host's own proposal
    // and is not bound by it.
    expect(status.textContent ?? '').not.toMatch(/\d/);
  });

  it('announces the pending posture, which no refusal produces', () => {
    // `pending` is the one GM posture that comes from the QUEUE rather
    // than a refusal, so the refusal-driven rows above never reach it -
    // and 19.4 asks for every state, not every code path.
    render(
      <HostGmReviewSurface
        pending={[]}
        onDecide={() => {}}
        lifecycle={deriveGmLifecyclePosture({
          refusal: null,
          pendingProposalCount: 2,
        })}
      />,
    );

    const status = screen.getByTestId('gm-lifecycle-state');
    expect(status).toHaveAttribute('data-state', 'pending');
    expect(screen.getAllByRole('status')).toContain(status);
    expect(status).toHaveAttribute('aria-live', 'polite');
    // Two proposals are queued, and the announcement still carries no
    // digit: a spoken count is a number on screen by another route.
    expect(status.textContent ?? '').not.toMatch(/\d/);
  });

  it('keeps the recovery action reachable from the keyboard', () => {
    // A recovery offered only to a mouse is not a recovery. A real
    // <button> is focusable and Enter/Space-activated by the platform,
    // which is why it is one rather than a clickable div.
    render(
      <HostGmReviewSurface
        pending={[]}
        onDecide={() => {}}
        lifecycle={deriveGmLifecyclePosture({
          refusal: { code: 'CAMPAIGN_NOT_CONVERGED', recoveryAction: null },
          pendingProposalCount: 0,
        })}
      />,
    );

    const recovery = screen.getByTestId('gm-lifecycle-recovery');
    expect(recovery.tagName).toBe('BUTTON');
    recovery.focus();
    expect(recovery).toHaveFocus();
  });
});
