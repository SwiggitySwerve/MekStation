/**
 * Render tests for the WithdrawControl component.
 *
 * @spec openspec/changes/add-combat-morale-and-withdrawal/tasks.md § 4.4
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { WithdrawControl } from '../WithdrawControl';

describe('WithdrawControl', () => {
  it('renders the edge picker and Withdraw button when idle', () => {
    render(
      <WithdrawControl
        unitId="player-1"
        isWithdrawing={false}
        enabled
        onDeclareWithdrawal={() => {}}
      />,
    );
    expect(screen.getByTestId('withdraw-edge-picker')).toBeInTheDocument();
    expect(screen.getByTestId('withdraw-declare-button')).toBeInTheDocument();
    expect(screen.getByTestId('withdraw-edge-north')).toBeInTheDocument();
    expect(screen.getByTestId('withdraw-edge-south')).toBeInTheDocument();
  });

  it('declares withdrawal toward the selected edge', () => {
    const onDeclare = jest.fn();
    render(
      <WithdrawControl
        unitId="player-1"
        isWithdrawing={false}
        enabled
        onDeclareWithdrawal={onDeclare}
      />,
    );
    fireEvent.click(screen.getByTestId('withdraw-edge-east'));
    fireEvent.click(screen.getByTestId('withdraw-declare-button'));
    expect(onDeclare).toHaveBeenCalledWith('player-1', 'east');
  });

  it('defaults to the north edge when none is picked', () => {
    const onDeclare = jest.fn();
    render(
      <WithdrawControl
        unitId="player-1"
        isWithdrawing={false}
        enabled
        onDeclareWithdrawal={onDeclare}
      />,
    );
    fireEvent.click(screen.getByTestId('withdraw-declare-button'));
    expect(onDeclare).toHaveBeenCalledWith('player-1', 'north');
  });

  it('does not declare while disabled', () => {
    const onDeclare = jest.fn();
    render(
      <WithdrawControl
        unitId="player-1"
        isWithdrawing={false}
        enabled={false}
        onDeclareWithdrawal={onDeclare}
      />,
    );
    fireEvent.click(screen.getByTestId('withdraw-declare-button'));
    expect(onDeclare).not.toHaveBeenCalled();
  });

  it('renders a read-only badge once the unit is withdrawing', () => {
    render(
      <WithdrawControl
        unitId="player-1"
        isWithdrawing
        enabled
        onDeclareWithdrawal={() => {}}
      />,
    );
    expect(screen.getByTestId('withdraw-status')).toHaveTextContent(
      'Withdrawing',
    );
    expect(
      screen.queryByTestId('withdraw-declare-button'),
    ).not.toBeInTheDocument();
  });
});
