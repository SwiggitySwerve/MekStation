/**
 * The host GM correction controls, one press at a time (roadmap U36).
 *
 * Every control here either works once per press within the route's
 * bounds or is not rendered. Two ways the baseline broke that:
 *
 *   - Approve GM Fix and Preview GM Fix started a new request on every
 *     press. Two presses that land before React re-renders - a double
 *     click - sent two commits. The rows press twice INSIDE ONE `act`, so
 *     the second press meets the button before any re-render could have
 *     disabled it; only a synchronous guard stops it. A row that pressed,
 *     waited, and pressed again would pass on the `disabled` attribute
 *     alone and prove nothing about the double click.
 *   - The private-reason field accepted any length, while the commit
 *     route refuses a reason longer than its bound. The first row pins
 *     that bound by asking the route's own body check, so the input rows
 *     are measured against what the server takes, not a copied number.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/e2e-testing/spec.md
 */

import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { GmRewindPreviewOutcome } from '@/components/multiplayer/gmRewindPreviewPhrasing';
import type { GmCombatRewindCommitResult } from '@/lib/multiplayer/server/history/GmCombatRewindCommit';

import { isRewindCommitBody } from '@/pages-modules/api/rewindCommitDeps';

import { NetworkedHostGmControls } from '../NetworkedGameSurface.gmCorrection';

// =============================================================================
// Fixtures
// =============================================================================

/** The reason bound the commit route enforces; the first row proves it. */
const ROUTE_REASON_BOUND = 2000;

/** A commit body the route accepts apart from whatever reason is added. */
const VALID_BODY = {
  targetRevision: 3,
  expectedBranchId: 'root',
  expectedRevision: 4,
  expectedDigest: 'digest-4',
  expectedGeneration: 1,
};

const COMMITTED: GmCombatRewindCommitResult = {
  kind: 'committed',
  matchId: 'match-1',
  activatedBranchId: 'candidate-1',
  priorBranchId: 'root',
  effectiveGeneration: 2,
  invalidations: [],
} as unknown as GmCombatRewindCommitResult;

const UNAVAILABLE: GmRewindPreviewOutcome = { kind: 'unavailable' };

/** A promise the test settles by hand, so "pending" lasts as long as needed. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Two presses in one frame: no re-render can land between them. */
function doublePress(button: HTMLElement): void {
  act(() => {
    button.click();
    button.click();
  });
}

// =============================================================================
// The route bound (read-only anchor)
// =============================================================================

describe('the rewind-commit route reason bound', () => {
  it('accepts a reason of the bound and refuses one unit more', () => {
    expect(
      isRewindCommitBody({
        ...VALID_BODY,
        reason: 'r'.repeat(ROUTE_REASON_BOUND),
      }),
    ).toBe(true);
    expect(
      isRewindCommitBody({
        ...VALID_BODY,
        reason: 'r'.repeat(ROUTE_REASON_BOUND + 1),
      }),
    ).toBe(false);
  });
});

// =============================================================================
// Approve GM Fix
// =============================================================================

describe('Approve GM Fix', () => {
  it('sends one commit for a double press', async () => {
    const commit = deferred<GmCombatRewindCommitResult>();
    const onApprove = jest.fn(() => commit.promise);
    render(
      <NetworkedHostGmControls onPreview={jest.fn()} onApprove={onApprove} />,
    );

    doublePress(screen.getByTestId('networked-gm-approve-btn'));
    expect(onApprove).toHaveBeenCalledTimes(1);

    await act(async () => {
      commit.resolve(COMMITTED);
    });
  });

  it('renders disabled while its commit is pending and works again once it settles', async () => {
    const first = deferred<GmCombatRewindCommitResult>();
    const onApprove = jest
      .fn<Promise<GmCombatRewindCommitResult>, []>()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(COMMITTED);
    render(
      <NetworkedHostGmControls onPreview={jest.fn()} onApprove={onApprove} />,
    );
    const approve = screen.getByTestId('networked-gm-approve-btn');

    fireEvent.click(approve);
    expect(approve).toBeDisabled();
    fireEvent.click(approve);
    expect(onApprove).toHaveBeenCalledTimes(1);

    await act(async () => {
      first.resolve(COMMITTED);
    });
    expect(approve).toBeEnabled();
    expect(
      screen.getByTestId('networked-gm-correction-status'),
    ).toBeInTheDocument();

    // A press after the answer is a new press, and it is sent.
    await act(async () => {
      fireEvent.click(approve);
    });
    expect(onApprove).toHaveBeenCalledTimes(2);
  });

  it('is enabled again after a commit that failed in transport', async () => {
    const commit = deferred<GmCombatRewindCommitResult>();
    const onApprove = jest.fn(() => commit.promise);
    render(
      <NetworkedHostGmControls onPreview={jest.fn()} onApprove={onApprove} />,
    );
    const approve = screen.getByTestId('networked-gm-approve-btn');

    fireEvent.click(approve);
    await act(async () => {
      commit.reject(new Error('socket closed'));
    });

    expect(approve).toBeEnabled();
    expect(
      screen.getByTestId('networked-gm-correction-status'),
    ).toBeInTheDocument();
  });

  it('keeps working for a caller whose handler answers nothing', async () => {
    const onApprove = jest.fn();
    render(
      <NetworkedHostGmControls onPreview={jest.fn()} onApprove={onApprove} />,
    );
    const approve = screen.getByTestId('networked-gm-approve-btn');

    await act(async () => {
      fireEvent.click(approve);
    });
    await act(async () => {
      fireEvent.click(approve);
    });

    expect(onApprove).toHaveBeenCalledTimes(2);
    expect(approve).toBeEnabled();
    expect(
      screen.queryByTestId('networked-gm-correction-status'),
    ).not.toBeInTheDocument();
  });
});

// =============================================================================
// Preview GM Fix
// =============================================================================

describe('Preview GM Fix', () => {
  it('sends one preview for a double press', async () => {
    const preview = deferred<GmRewindPreviewOutcome>();
    const onPreview = jest.fn(() => preview.promise);
    render(
      <NetworkedHostGmControls onPreview={onPreview} onApprove={jest.fn()} />,
    );

    doublePress(screen.getByTestId('networked-gm-preview-btn'));
    expect(onPreview).toHaveBeenCalledTimes(1);

    await act(async () => {
      preview.resolve(UNAVAILABLE);
    });
  });

  it('renders disabled while its preview is pending and works again once it settles', async () => {
    const first = deferred<GmRewindPreviewOutcome>();
    const onPreview = jest
      .fn<Promise<GmRewindPreviewOutcome>, []>()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(UNAVAILABLE);
    render(
      <NetworkedHostGmControls onPreview={onPreview} onApprove={jest.fn()} />,
    );
    const previewButton = screen.getByTestId('networked-gm-preview-btn');

    fireEvent.click(previewButton);
    expect(previewButton).toBeDisabled();
    fireEvent.click(previewButton);
    expect(onPreview).toHaveBeenCalledTimes(1);

    await act(async () => {
      first.resolve(UNAVAILABLE);
    });
    expect(previewButton).toBeEnabled();

    await act(async () => {
      fireEvent.click(previewButton);
    });
    expect(onPreview).toHaveBeenCalledTimes(2);
  });
});

// =============================================================================
// The private reason
// =============================================================================

describe('the private-reason input', () => {
  it('is bounded at the route bound', () => {
    render(
      <NetworkedHostGmControls
        onPreview={jest.fn()}
        onApprove={jest.fn()}
        onPrivateReasonChange={jest.fn()}
      />,
    );
    const input = screen.getByTestId('networked-gm-private-reason');

    expect(input).toHaveAttribute('maxlength', String(ROUTE_REASON_BOUND));
  });

  it('hands the producer no more than the route takes', async () => {
    const onPrivateReasonChange = jest.fn();
    render(
      <NetworkedHostGmControls
        onPreview={jest.fn()}
        onApprove={jest.fn()}
        onPrivateReasonChange={onPrivateReasonChange}
      />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByTestId('networked-gm-private-reason'));
    await user.paste('r'.repeat(ROUTE_REASON_BOUND + 1));

    const handed = onPrivateReasonChange.mock.calls.at(-1)?.[0] as string;
    expect(handed).toHaveLength(ROUTE_REASON_BOUND);
    expect(isRewindCommitBody({ ...VALID_BODY, reason: handed })).toBe(true);
  });
});
