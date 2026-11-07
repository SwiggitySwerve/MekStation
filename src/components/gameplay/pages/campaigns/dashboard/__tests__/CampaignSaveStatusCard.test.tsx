/**
 * The save-status card's conflict block (umbrella task 8.3).
 *
 * A refused save used to offer two buttons, and the dangerous one was
 * the default: "Keep My Version" re-sent the same stale envelope at the
 * version the server had just reported, which the server accepts,
 * discarding whatever the other writer committed. These rows pin what
 * replaced it - the server's typed reason, and exactly one action.
 *
 * The launch-conflict rows also pin when resync may clear its banner.
 */

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import React from 'react';

import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';

import { CampaignSaveStatusCard } from '../CampaignSaveStatusCard';

describe('CampaignSaveStatusCard launch resync', () => {
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
    useCampaignPersistenceStore.getState().reset();
  });

  it.each([false, true])(
    'clears the launch banner only when resync succeeds (result: %s)',
    async (adopted) => {
      useCampaignPersistenceStore.getState().reportLaunchConflict({
        code: 'STALE_REVISION',
        reason: 'The campaign moved on',
        activeHead: { branchId: 'main', revision: 7, effectiveGeneration: 1 },
        resyncAction: 'resync-to-active-head',
      });
      const resolve = jest
        .spyOn(
          useCampaignPersistenceStore.getState(),
          'resolveConflictTakeServer',
        )
        .mockResolvedValue(adopted);
      render(<CampaignSaveStatusCard />);

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: 'Resync to Current' }),
        );
      });

      expect(resolve).toHaveBeenCalledTimes(1);
      if (adopted) {
        expect(
          screen.queryByTestId('campaign-launch-conflict'),
        ).not.toBeInTheDocument();
        expect(
          useCampaignPersistenceStore.getState().launchConflict,
        ).toBeNull();
      } else {
        expect(
          screen.getByTestId('campaign-launch-conflict'),
        ).toHaveTextContent('STALE_REVISION');
        expect(
          useCampaignPersistenceStore.getState().launchConflict,
        ).not.toBeNull();
      }
    },
  );

  it('shows unsaved changes for a pending edit after an earlier save completed', () => {
    useCampaignPersistenceStore.setState({ dirty: true, saveState: 'idle' });
    render(<CampaignSaveStatusCard />);
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });
});

describe('CampaignSaveStatusCard conflict block', () => {
  afterEach(() => {
    cleanup();
    useCampaignPersistenceStore.getState().reset();
  });

  /** Put the store in the state a refused save leaves behind. */
  function seedConflict(
    conflict: ReturnType<
      typeof useCampaignPersistenceStore.getState
    >['saveConflict'],
  ): void {
    useCampaignPersistenceStore.setState({
      saveState: 'conflict',
      saveConflict: conflict,
    });
  }

  it('names the reason and the version the server holds', () => {
    seedConflict({
      reason: 'base-state-unavailable',
      recoveryAction: 'resync-to-active-head',
      conflictingFields: [],
      currentVersion: 7,
    });

    render(<CampaignSaveStatusCard />);

    const message = screen.getByTestId('campaign-save-conflict');
    expect(message).toHaveTextContent('base-state-unavailable');
    expect(message).toHaveTextContent('version 7');
  });

  it('offers exactly one action, and it is not an overwrite', () => {
    seedConflict({
      reason: 'base-state-unavailable',
      recoveryAction: 'resync-to-active-head',
      conflictingFields: [],
      currentVersion: 7,
    });

    render(<CampaignSaveStatusCard />);

    expect(
      screen.getByTestId('campaign-conflict-take-server-btn'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('campaign-conflict-keep-local-btn'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Keep My Version/i)).not.toBeInTheDocument();
  });

  it('still reports a conflict when the server sent no typed detail', () => {
    // An older server, or a body this client could not read: the state is
    // still honest and the recovery is still available, so the card must
    // not go blank or invent a reason.
    seedConflict(null);

    render(<CampaignSaveStatusCard />);

    expect(screen.getByTestId('campaign-save-conflict')).toHaveTextContent(
      /changed elsewhere/i,
    );
    expect(
      screen.getByTestId('campaign-conflict-take-server-btn'),
    ).toBeInTheDocument();
  });
});

describe('CampaignSaveStatusCard refusal block (CAMPAIGN-LIVE-WRITE-1)', () => {
  afterEach(() => {
    cleanup();
    useCampaignPersistenceStore.getState().reset();
  });

  it('shows the server\'s refusal reason, keeps the unsaved-changes flag and never says "playing offline"', () => {
    useCampaignPersistenceStore.setState({
      saveState: 'error',
      dirty: true,
      errorMessage: 'only the host session that started it can change it',
      saveRefusal: {
        code: 'HOST_SESSION_REQUIRED',
        reason: 'malformed',
        message: 'only the host session that started it can change it',
      },
    });

    render(<CampaignSaveStatusCard />);

    const refused = screen.getByTestId('campaign-save-refused');
    expect(refused).toHaveTextContent('HOST_SESSION_REQUIRED');
    expect(refused).toHaveTextContent(
      'only the host session that started it can change it',
    );
    expect(refused).toHaveTextContent('unsaved changes are kept');
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    expect(screen.queryByText(/playing offline/i)).not.toBeInTheDocument();
  });

  it('still says "playing offline" for a plain failure (pinned)', () => {
    useCampaignPersistenceStore.setState({
      saveState: 'error',
      errorMessage: 'network down',
      saveRefusal: null,
    });

    render(<CampaignSaveStatusCard />);

    expect(screen.getByText(/network down/)).toHaveTextContent(
      'playing offline; changes are kept locally',
    );
    expect(
      screen.queryByTestId('campaign-save-refused'),
    ).not.toBeInTheDocument();
  });
});
