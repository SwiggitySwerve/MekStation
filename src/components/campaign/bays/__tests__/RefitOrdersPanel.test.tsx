import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import React from 'react';

import type { IRefitOrder } from '@/types/campaign/Refit';

import { DEFAULT_UNIT_CONFIGURATION } from '@/lib/campaign/refit/unitConfiguration';
import { RefitClass } from '@/types/campaign/Refit';

import { RefitOrdersPanel } from '../RefitOrdersPanel';

const order: IRefitOrder = {
  id: 'first',
  unitId: 'unit-1',
  targetConfiguration: DEFAULT_UNIT_CONFIGURATION,
  refitClass: RefitClass.EquipmentSwap,
  status: 'in-progress',
  estimatedCost: 1000,
  estimatedHours: 20,
  hoursCompleted: 7,
  createdAt: '3025-01-01',
};

describe('RefitOrdersPanel', () => {
  it('shows every legacy open order and cancels the requested ID', async () => {
    const onCancel = jest.fn().mockResolvedValue({ applied: true });
    render(
      <RefitOrdersPanel
        orders={[
          order,
          { ...order, id: 'second', status: 'proposed' },
          { ...order, id: 'old', status: 'completed' },
        ]}
        onCancel={onCancel}
      />,
    );
    expect(
      screen.getAllByText(
        'Multiple open refits pause this unit until only one remains.',
      ),
    ).toHaveLength(2);
    const row = screen.getByTestId('refit-order-second');
    expect(row).toHaveTextContent('7/20h');
    expect(screen.queryByTestId('refit-order-old')).not.toBeInTheDocument();
    fireEvent.click(within(row).getByRole('button', { name: 'Cancel Refit' }));
    await waitFor(() => expect(onCancel).toHaveBeenCalledWith('second'));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Refit cancellation saved.',
    );
  });

  it('keeps a failed cancellation retryable and does not claim success', async () => {
    const onCancel = jest
      .fn()
      .mockResolvedValueOnce({ applied: false, reason: 'Save failed.' })
      .mockResolvedValueOnce({ applied: true });
    const { rerender } = render(
      <RefitOrdersPanel orders={[order]} onCancel={onCancel} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Refit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Save failed.');
    rerender(
      <RefitOrdersPanel
        orders={[{ ...order, status: 'cancelled' }]}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry Save' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Refit cancellation saved.',
    );
    expect(onCancel).toHaveBeenNthCalledWith(2, 'first');
  });

  it('disables guest controls and explains authority', () => {
    const onCancel = jest.fn();
    render(<RefitOrdersPanel orders={[order]} readOnly onCancel={onCancel} />);
    expect(screen.getByRole('button', { name: 'Cancel Refit' })).toBeDisabled();
    expect(
      screen.getByText('Only the host can cancel refit orders.'),
    ).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('disables controls while awaiting persistence and reports thrown failures', async () => {
    let rejectSave: (error: Error) => void = () => {};
    const onCancel = jest.fn(
      () =>
        new Promise<{ applied: boolean }>((_resolve, reject) => {
          rejectSave = reject;
        }),
    );
    render(<RefitOrdersPanel orders={[order]} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Refit' }));
    expect(screen.getByRole('button', { name: 'Cancel Refit' })).toBeDisabled();
    rejectSave(new Error('Offline.'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Offline.');
    expect(screen.getByRole('button', { name: 'Retry Save' })).toBeEnabled();
  });

  it('has an empty state and wraps long IDs', () => {
    const { rerender } = render(
      <RefitOrdersPanel orders={[]} onCancel={jest.fn()} />,
    );
    expect(screen.getByText('No open refit orders.')).toBeInTheDocument();
    rerender(
      <RefitOrdersPanel
        orders={[{ ...order, id: 'x'.repeat(300), unitId: 'y'.repeat(300) }]}
        onCancel={jest.fn()}
      />,
    );
    expect(screen.getByText('x'.repeat(300))).toHaveClass('break-all');
  });
});
