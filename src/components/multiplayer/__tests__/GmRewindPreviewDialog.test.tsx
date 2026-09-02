/**
 * The GM's rewind preview dialog (umbrella 19.3).
 *
 * The dialog shows a blast radius the GM did not cause by looking at it,
 * and asks before anything is applied. These rows cover the keyboard
 * contract, where focus lands after a decision or a refusal, and the two
 * halves of the confirm arm - disabled while no producer can apply a
 * rewind, enabled once one exists.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { useRef } from 'react';

import type { GmCombatRewindCommitResult } from '@/lib/multiplayer/server/history/GmCombatRewindCommit';
import type { GmCombatRewindPreviewResult } from '@/lib/multiplayer/server/history/GmCombatRewindPreview';

import {
  GmRewindPreviewDialog,
  type GmRewindPreviewOutcome,
} from '../GmRewindPreviewDialog';

const PREVIEW: GmCombatRewindPreviewResult = {
  kind: 'preview',
  matchId: 'match-1',
  targetRevision: 3,
  priorHead: { branchId: 'root', revision: 7, effectiveGeneration: 1 },
  changedViewerIds: ['pid_host', 'pid_guest'],
  entries: [
    { artifactKind: 'checkpoint', artifactId: 'cp-1', sourceRevision: 5 },
  ],
};

const REFUSED: GmCombatRewindPreviewResult = {
  kind: 'refused',
  reason: 'campaign-receipt-delivered',
  detail:
    "A campaign has taken delivery of outcome 'outcome-9'; raw operator text",
};

const COMMITTED: GmCombatRewindCommitResult = {
  kind: 'committed',
  matchId: 'match-1',
  activatedBranchId: 'candidate-1',
  priorBranchId: 'root',
  effectiveGeneration: 2,
  invalidations: [
    { artifactKind: 'checkpoint', artifactId: 'cp-1', sourceRevision: 5 },
  ],
};

const COMMIT_REFUSED: GmCombatRewindCommitResult = {
  kind: 'refused',
  reason: 'campaign-receipt-delivered',
  detail: "A campaign has taken delivery of outcome 'outcome-9'",
};

/**
 * A harness with a real opener and a real fallback target, because both
 * halves of the focus-restoration contract need a document to restore in.
 */
function Harness({
  outcome,
  onConfirmRewind,
  onCancel = jest.fn(),
  onRetryPreview = jest.fn(),
  openerPresent = true,
  open = true,
}: {
  readonly outcome: GmRewindPreviewOutcome | null;
  readonly onConfirmRewind?: () => Promise<GmCombatRewindCommitResult>;
  readonly onCancel?: () => void;
  readonly onRetryPreview?: () => void;
  readonly openerPresent?: boolean;
  readonly open?: boolean;
}): React.ReactElement {
  const fallbackRef = useRef<HTMLElement | null>(null);
  return (
    <section
      ref={fallbackRef as React.RefObject<HTMLElement>}
      tabIndex={-1}
      data-testid="surface"
    >
      {openerPresent && (
        <button type="button" data-testid="opener">
          Preview rewind
        </button>
      )}
      {open && (
        <GmRewindPreviewDialog
          outcome={outcome}
          onCancel={onCancel}
          onRetryPreview={onRetryPreview}
          onConfirmRewind={onConfirmRewind}
          fallbackFocusRef={fallbackRef}
        />
      )}
    </section>
  );
}

describe('GmRewindPreviewDialog — the preview body', () => {
  it('names itself to a screen reader on the element carrying the role', () => {
    render(<Harness outcome={PREVIEW} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const labelId = dialog.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId as string)?.textContent).toMatch(
      /rewind/i,
    );
  });

  it('states the blast radius from the preview rows', () => {
    render(<Harness outcome={PREVIEW} />);
    const body = screen.getByTestId('gm-rewind-preview-blast-radius');
    expect(body).toHaveTextContent('revision 3');
    expect(body).toHaveTextContent('1 saved artifact');
    expect(body).toHaveTextContent('2 players see');
  });

  it('keeps both answers reachable on a narrow viewport', () => {
    render(<Harness outcome={PREVIEW} />);
    const actions = screen.getByTestId('gm-rewind-preview-actions');
    expect(actions.className).toContain('flex-wrap');
    for (const button of Array.from(actions.querySelectorAll('button'))) {
      expect(button.className).toContain('min-h-[44px]');
    }
  });
});

describe('GmRewindPreviewDialog — keyboard completeness', () => {
  it('puts focus on the primary action when it can be taken', () => {
    render(<Harness outcome={PREVIEW} onConfirmRewind={jest.fn()} />);
    expect(screen.getByTestId('gm-rewind-confirm')).toHaveFocus();
  });

  it('puts focus on a control that can be used when confirm is disabled', () => {
    render(<Harness outcome={PREVIEW} />);
    expect(screen.getByTestId('gm-rewind-cancel')).toHaveFocus();
  });

  it('traps Tab inside the dialog', () => {
    render(<Harness outcome={PREVIEW} onConfirmRewind={jest.fn()} />);
    const dialog = screen.getByRole('dialog');
    const confirm = screen.getByTestId('gm-rewind-confirm');
    confirm.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByTestId('gm-rewind-cancel'));
  });

  it('cancels on Escape and commits nothing', () => {
    const onCancel = jest.fn();
    const onConfirmRewind = jest.fn();
    render(
      <Harness
        outcome={PREVIEW}
        onCancel={onCancel}
        onConfirmRewind={onConfirmRewind}
      />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirmRewind).not.toHaveBeenCalled();
  });
});

describe('GmRewindPreviewDialog — focus restoration', () => {
  it('returns focus to the opener', () => {
    const { rerender } = render(<Harness outcome={PREVIEW} open={false} />);
    const opener = screen.getByTestId('opener');
    opener.focus();
    // The dialog steals focus on open; closing it must give focus back to
    // the control the GM pressed, not to <body>.
    rerender(<Harness outcome={PREVIEW} open />);
    expect(opener).not.toHaveFocus();
    rerender(<Harness outcome={PREVIEW} open={false} />);
    expect(opener).toHaveFocus();
  });

  it('falls back to the surface when the opener has left the document', () => {
    const { rerender } = render(<Harness outcome={PREVIEW} open={false} />);
    screen.getByTestId('opener').focus();
    rerender(<Harness outcome={PREVIEW} open />);
    // The opener is gone by the time the dialog closes - the shape a
    // committed decision leaves behind. Focus must land on the surface,
    // which is programmatically focusable for exactly this.
    rerender(<Harness outcome={PREVIEW} open={false} openerPresent={false} />);
    expect(screen.getByTestId('surface')).toHaveFocus();
  });
});

describe('GmRewindPreviewDialog — a refusal arriving while open', () => {
  it('stays open and swaps the body to GM phrasing', () => {
    const { rerender } = render(<Harness outcome={null} />);
    rerender(<Harness outcome={REFUSED} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.queryByTestId('gm-rewind-preview-blast-radius'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('gm-rewind-refusal')).toHaveTextContent(
      /campaign has already taken delivery/i,
    );
  });

  it('never uses the server detail as the accessible description', () => {
    render(<Harness outcome={REFUSED} />);
    const describedBy = screen
      .getByRole('dialog')
      .getAttribute('aria-describedby');
    const description = document.getElementById(describedBy as string);
    expect(description?.textContent).not.toContain('raw operator text');
    expect(document.body.textContent).not.toContain('raw operator text');
  });

  it('moves focus to the refusal rather than leaving it on a dead control', () => {
    const { rerender } = render(<Harness outcome={PREVIEW} />);
    rerender(<Harness outcome={REFUSED} />);
    expect(screen.getByTestId('gm-rewind-refusal')).toHaveFocus();
  });

  it('offers asking the server again as the primary, which commits nothing', () => {
    const onRetryPreview = jest.fn();
    const onConfirmRewind = jest.fn();
    render(
      <Harness
        outcome={REFUSED}
        onRetryPreview={onRetryPreview}
        onConfirmRewind={onConfirmRewind}
      />,
    );
    fireEvent.click(screen.getByTestId('gm-rewind-recovery'));
    expect(onRetryPreview).toHaveBeenCalledTimes(1);
    expect(onConfirmRewind).not.toHaveBeenCalled();
    expect(screen.queryByTestId('gm-rewind-confirm')).not.toBeInTheDocument();
  });

  it('phrases a transport failure without leaking what threw', () => {
    render(<Harness outcome={{ kind: 'unavailable' }} />);
    expect(screen.getByTestId('gm-rewind-refusal')).toHaveTextContent(
      /could not answer/i,
    );
  });
});

describe('GmRewindPreviewDialog — the confirm arm', () => {
  it('renders confirm disabled with a reason a screen reader reaches', () => {
    render(<Harness outcome={PREVIEW} />);
    const confirm = screen.getByTestId('gm-rewind-confirm');
    expect(confirm).toBeDisabled();
    const reasonId = confirm.getAttribute('aria-describedby');
    expect(reasonId).toBeTruthy();
    expect(document.getElementById(reasonId as string)?.textContent).toMatch(
      /cannot apply one yet/i,
    );
  });

  it('confirm calls the producer once and phrases committed', async () => {
    const onConfirmRewind = jest.fn().mockResolvedValue(COMMITTED);
    render(<Harness outcome={PREVIEW} onConfirmRewind={onConfirmRewind} />);
    fireEvent.click(screen.getByTestId('gm-rewind-confirm'));
    expect(onConfirmRewind).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.getByTestId('gm-rewind-committed')).toHaveTextContent(
        /committed/i,
      ),
    );
    expect(screen.getByTestId('gm-rewind-committed')).toHaveTextContent(
      /generation advanced to 2/i,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('gm-rewind-confirm')).toBeDisabled();
  });

  it('a campaign-receipt-delivered refusal keeps the dialog open with its phrasing', async () => {
    const onConfirmRewind = jest.fn().mockResolvedValue(COMMIT_REFUSED);
    render(<Harness outcome={PREVIEW} onConfirmRewind={onConfirmRewind} />);
    fireEvent.click(screen.getByTestId('gm-rewind-confirm'));
    await waitFor(() =>
      expect(screen.getByTestId('gm-rewind-refusal')).toHaveTextContent(
        /campaign has already taken delivery/i,
      ),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByTestId('gm-rewind-committed')).not.toBeInTheDocument();
  });

  it('confirm is disabled while in flight so a second click does not call the producer again', async () => {
    let resolveCommit: (value: GmCombatRewindCommitResult) => void =
      () => undefined;
    const onConfirmRewind = jest.fn(
      () =>
        new Promise<GmCombatRewindCommitResult>((resolve) => {
          resolveCommit = resolve;
        }),
    );
    render(<Harness outcome={PREVIEW} onConfirmRewind={onConfirmRewind} />);
    const confirm = screen.getByTestId('gm-rewind-confirm');
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(onConfirmRewind).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(confirm).toBeDisabled());
    fireEvent.click(confirm);
    expect(onConfirmRewind).toHaveBeenCalledTimes(1);
    resolveCommit(COMMITTED);
    await waitFor(() =>
      expect(screen.getByTestId('gm-rewind-committed')).toBeInTheDocument(),
    );
  });
});
