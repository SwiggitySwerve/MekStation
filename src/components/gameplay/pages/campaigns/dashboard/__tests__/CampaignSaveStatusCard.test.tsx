/**
 * The save-status card's conflict block (umbrella task 8.3).
 *
 * A refused save used to offer two buttons, and the dangerous one was
 * the default: "Keep My Version" re-sent the same stale envelope at the
 * version the server had just reported, which the server accepts,
 * discarding whatever the other writer committed. These rows pin what
 * replaced it - the server's typed reason, and exactly one action.
 *
 * The launch-conflict block shares this card and is deliberately NOT
 * touched here; it has its own rows and its own action.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';

import { CampaignSaveStatusCard } from '../CampaignSaveStatusCard';

describe('CampaignSaveStatusCard conflict block', () => {
  afterEach(() => {
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
