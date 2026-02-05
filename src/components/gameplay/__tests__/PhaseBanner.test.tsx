/**
 * PhaseBanner Component Tests
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import { GamePhase, GameSide } from '@/types/gameplay';

import { PhaseBanner } from '../PhaseBanner';

describe('PhaseBanner', () => {
  const defaultProps = {
    phase: GamePhase.Movement,
    turn: 1,
    activeSide: GameSide.Player,
    isPlayerTurn: true,
  };

  it('should render the phase name', () => {
    render(<PhaseBanner {...defaultProps} />);
    expect(screen.getByText('Movement Phase')).toBeInTheDocument();
  });

  it('should display turn number', () => {
    render(<PhaseBanner {...defaultProps} turn={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should show "Your Turn" when player turn', () => {
    render(<PhaseBanner {...defaultProps} isPlayerTurn={true} />);
    expect(screen.getByText('Your Turn')).toBeInTheDocument();
  });

  it('should show "Opponent\'s Turn" when not player turn', () => {
    render(<PhaseBanner {...defaultProps} isPlayerTurn={false} />);
    expect(screen.getByText("Opponent's Turn")).toBeInTheDocument();
  });

  it('should display status text when provided', () => {
    render(<PhaseBanner {...defaultProps} statusText="Waiting for input" />);
    expect(screen.getByText('Waiting for input')).toBeInTheDocument();
  });

  it('should render different phases correctly', () => {
    const { rerender } = render(
      <PhaseBanner {...defaultProps} phase={GamePhase.Initiative} />,
    );
    expect(screen.getByText('Initiative')).toBeInTheDocument();

    rerender(<PhaseBanner {...defaultProps} phase={GamePhase.WeaponAttack} />);
    expect(screen.getByText('Weapon Attack Phase')).toBeInTheDocument();

    rerender(<PhaseBanner {...defaultProps} phase={GamePhase.Heat} />);
    expect(screen.getByText('Heat Phase')).toBeInTheDocument();
  });

  it('should have banner role for accessibility', () => {
    render(<PhaseBanner {...defaultProps} />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
});
