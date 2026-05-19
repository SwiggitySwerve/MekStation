/**
 * Render tests for the MoraleIndicator + ForcedWithdrawalNotice
 * components.
 *
 * @spec openspec/changes/add-combat-morale-and-withdrawal/tasks.md § 4.4
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { GameSide } from '@/types/gameplay';

import { ForcedWithdrawalNotice } from '../ForcedWithdrawalNotice';
import { MoraleIndicator } from '../MoraleIndicator';

describe('MoraleIndicator', () => {
  it('renders a row per side with the morale level', () => {
    render(
      <MoraleIndicator
        battleMorale={{
          [GameSide.Player]: 'INSPIRED',
          [GameSide.Opponent]: 'BROKEN',
        }}
      />,
    );
    expect(screen.getByTestId('morale-level-player')).toHaveTextContent(
      'Inspired',
    );
    expect(screen.getByTestId('morale-level-opponent')).toHaveTextContent(
      'Broken',
    );
  });

  it('renders STEADY for both sides at the baseline', () => {
    render(
      <MoraleIndicator
        battleMorale={{
          [GameSide.Player]: 'STEADY',
          [GameSide.Opponent]: 'STEADY',
        }}
      />,
    );
    expect(screen.getByTestId('morale-level-player')).toHaveTextContent(
      'Steady',
    );
    expect(screen.getByTestId('morale-level-opponent')).toHaveTextContent(
      'Steady',
    );
  });
});

describe('ForcedWithdrawalNotice', () => {
  it('renders nothing when there are no entries', () => {
    const { container } = render(<ForcedWithdrawalNotice entries={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists each forced withdrawal with its reason', () => {
    render(
      <ForcedWithdrawalNotice
        entries={[
          { unitId: 'player-1', unitName: 'Atlas', reason: 'morale-broken' },
          { unitId: 'player-2', reason: 'crippled' },
        ]}
      />,
    );
    expect(screen.getByTestId('forced-withdrawal-notice')).toBeInTheDocument();
    expect(
      screen.getByTestId('forced-withdrawal-entry-player-1'),
    ).toHaveTextContent('Atlas');
    expect(
      screen.getByTestId('forced-withdrawal-entry-player-2'),
    ).toHaveTextContent('crippled in combat');
  });
});
