/**
 * Repair Bay — render tests
 *
 * Covers tasks.md 3.5 and the spec scenarios "Repair Bay lists tickets
 * grouped by unit", "Priority reorder persists", "Repair Bay empty state".
 *
 * @spec openspec/changes/add-campaign-bay-ui/specs/campaign-bay-ui/spec.md
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { SAMPLE_REPAIR_BAY } from '../__fixtures__/bayFixtures';
import { RepairBay } from '../RepairBay';

describe('RepairBay', () => {
  it('groups tickets by unit', () => {
    render(<RepairBay repairBay={SAMPLE_REPAIR_BAY} onReorder={() => {}} />);
    expect(
      screen.getByTestId('repair-unit-group-unit-atlas'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('repair-unit-group-unit-locust'),
    ).toBeInTheDocument();
  });

  it('shows kind, location, expected hours, parts-ready and status per ticket', () => {
    render(<RepairBay repairBay={SAMPLE_REPAIR_BAY} onReorder={() => {}} />);
    // ticket-1: armor / CT / 6h / parts ready / queued
    const row = screen.getByTestId('repair-ticket-ticket-1');
    expect(row).toHaveTextContent('armor');
    expect(row).toHaveTextContent('CT');
    expect(
      screen.getByTestId('repair-ticket-hours-ticket-1'),
    ).toHaveTextContent('6h');
    expect(
      screen.getByTestId('repair-ticket-parts-ticket-1'),
    ).toHaveTextContent('Parts ready');
    expect(row).toHaveTextContent('queued');
    // ticket-2 needs parts.
    expect(
      screen.getByTestId('repair-ticket-parts-ticket-2'),
    ).toHaveTextContent('Parts needed');
  });

  it('renders expected-hours and parts-ready as read-only text (no inputs)', () => {
    render(<RepairBay repairBay={SAMPLE_REPAIR_BAY} onReorder={() => {}} />);
    const hours = screen.getByTestId('repair-ticket-hours-ticket-1');
    expect(hours.tagName).toBe('SPAN');
    const parts = screen.getByTestId('repair-ticket-parts-ticket-1');
    expect(parts.tagName).toBe('SPAN');
  });

  it('priority reorder hands the new ticket order to onReorder', () => {
    const onReorder = jest.fn();
    render(<RepairBay repairBay={SAMPLE_REPAIR_BAY} onReorder={onReorder} />);
    // Move ticket-2 (index 1 in unit-atlas group) up one step.
    fireEvent.click(screen.getByTestId('repair-ticket-up-ticket-2'));
    expect(onReorder).toHaveBeenCalledTimes(1);
    // The atlas group is ticket-1, ticket-2, ticket-3 — after moving
    // ticket-2 up it becomes ticket-2, ticket-1, ticket-3.
    expect(onReorder).toHaveBeenCalledWith([
      'ticket-2',
      'ticket-1',
      'ticket-3',
    ]);
  });

  it('disables the up control on the first ticket and down on the last', () => {
    render(<RepairBay repairBay={SAMPLE_REPAIR_BAY} onReorder={() => {}} />);
    expect(screen.getByTestId('repair-ticket-up-ticket-1')).toBeDisabled();
    expect(screen.getByTestId('repair-ticket-down-ticket-3')).toBeDisabled();
  });

  it('shows an empty state — not an error — when there are no tickets', () => {
    render(<RepairBay repairBay={[]} onReorder={() => {}} />);
    expect(screen.getByTestId('bay-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('bay-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('repair-bay-queue')).not.toBeInTheDocument();
  });

  it('orders the focused unit group first', () => {
    render(
      <RepairBay
        repairBay={SAMPLE_REPAIR_BAY}
        onReorder={() => {}}
        focusUnitId="unit-locust"
      />,
    );
    const groups = screen.getAllByTestId(/^repair-unit-group-/);
    expect(groups[0]).toHaveAttribute(
      'data-testid',
      'repair-unit-group-unit-locust',
    );
  });
});
