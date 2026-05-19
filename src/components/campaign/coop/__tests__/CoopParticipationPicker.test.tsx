/**
 * Tests for `CoopParticipationPicker` (CO2, tasks 3.4).
 *
 * Covers: a player can pick deploy or command-hq; the picker surfaces
 * the launch-blocking warning when both players are in command-hq.
 *
 * @spec openspec/changes/add-coop-campaign-play/specs/coop-campaign-sync/spec.md
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { CoopParticipationPicker } from '../CoopParticipationPicker';

describe('CoopParticipationPicker — choice', () => {
  it('marks the current choice as selected', () => {
    render(
      <CoopParticipationPicker
        playerName="Host Commander"
        value="deploy"
        onChange={() => {}}
      />,
    );
    expect(screen.getByTestId('participation-deploy')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('participation-command-hq')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('forwards a choice change', () => {
    const onChange = jest.fn();
    render(
      <CoopParticipationPicker
        playerName="Host Commander"
        value="deploy"
        onChange={onChange}
      />,
    );
    screen.getByTestId('participation-command-hq').click();
    expect(onChange).toHaveBeenCalledWith('command-hq');
  });
});

describe('CoopParticipationPicker — launch-blocking warning', () => {
  it('warns when both players chose command-hq', () => {
    render(
      <CoopParticipationPicker
        playerName="Guest Commander"
        value="command-hq"
        otherPlayerChoice="command-hq"
        onChange={() => {}}
      />,
    );
    expect(
      screen.getByTestId('participation-block-warning'),
    ).toBeInTheDocument();
  });

  it('shows no warning when at least one player deploys', () => {
    render(
      <CoopParticipationPicker
        playerName="Guest Commander"
        value="command-hq"
        otherPlayerChoice="deploy"
        onChange={() => {}}
      />,
    );
    expect(screen.queryByTestId('participation-block-warning')).toBeNull();
  });
});
