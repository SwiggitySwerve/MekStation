/**
 * ActionBar Component Tests
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import { GamePhase } from '@/types/gameplay';

import { ActionBar } from '../ActionBar';

describe('ActionBar', () => {
  const defaultProps = {
    phase: GamePhase.Movement,
    canUndo: false,
    canAct: true,
    onAction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render movement phase actions', () => {
    render(<ActionBar {...defaultProps} />);
    expect(screen.getByText(/Lock Movement/)).toBeInTheDocument();
    expect(screen.getByText(/Undo/)).toBeInTheDocument();
    expect(screen.getByText(/Skip/)).toBeInTheDocument();
  });

  it('should render attack phase actions', () => {
    render(<ActionBar {...defaultProps} phase={GamePhase.WeaponAttack} />);
    expect(screen.getByText(/Lock Attacks/)).toBeInTheDocument();
    expect(screen.getByText(/Clear All/)).toBeInTheDocument();
    expect(screen.getByText(/Skip Attacks/)).toBeInTheDocument();
  });

  it('should call onAction when button clicked', () => {
    const onAction = jest.fn();
    render(<ActionBar {...defaultProps} onAction={onAction} />);

    fireEvent.click(screen.getByText(/Lock Movement/));
    expect(onAction).toHaveBeenCalledWith('lock');
  });

  it('should disable undo when canUndo is false', () => {
    render(<ActionBar {...defaultProps} canUndo={false} />);
    const undoButton = screen.getByText(/Undo/).closest('button');
    expect(undoButton).toBeDisabled();
  });

  it('should enable undo when canUndo is true', () => {
    render(<ActionBar {...defaultProps} canUndo={true} />);
    const undoButton = screen.getByText(/Undo/).closest('button');
    expect(undoButton).not.toBeDisabled();
  });

  it('should disable all buttons when canAct is false', () => {
    render(<ActionBar {...defaultProps} canAct={false} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('should display info text when provided', () => {
    render(<ActionBar {...defaultProps} infoText="Select a hex to move" />);
    expect(screen.getByText('Select a hex to move')).toBeInTheDocument();
  });

  it('should have toolbar role for accessibility', () => {
    render(<ActionBar {...defaultProps} />);
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });
});
