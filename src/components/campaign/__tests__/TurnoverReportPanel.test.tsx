import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TurnoverReportPanel } from '../TurnoverReportPanel';
import type { TurnoverDepartureEvent } from '@/lib/campaign/dayAdvancement';

function createDeparture(overrides: Partial<TurnoverDepartureEvent> = {}): TurnoverDepartureEvent {
  return {
    personId: 'p1',
    personName: 'Alice Smith',
    departureType: 'retired',
    roll: 4,
    targetNumber: 7,
    payoutAmount: 12000,
    modifiers: [
      { modifierId: 'baseTarget', displayName: 'Base Target', value: 3, isStub: false },
      { modifierId: 'injuries', displayName: 'Injuries', value: 2, isStub: false },
      { modifierId: 'officer', displayName: 'Officer Status', value: -1, isStub: false },
      { modifierId: 'fatigue', displayName: 'Fatigue', value: 0, isStub: true },
    ],
    ...overrides,
  };
}

describe('TurnoverReportPanel', () => {
  it('should render nothing when no departures', () => {
    const { container } = render(<TurnoverReportPanel departures={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should display departure count in header', () => {
    const departures = [createDeparture(), createDeparture({ personId: 'p2', personName: 'Bob' })];
    render(<TurnoverReportPanel departures={departures} />);
    expect(screen.getByText('Personnel Departures (2)')).toBeInTheDocument();
  });

  it('should display person name and departure type', () => {
    render(<TurnoverReportPanel departures={[createDeparture()]} />);
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Retired')).toBeInTheDocument();
  });

  it('should display deserted status', () => {
    render(
      <TurnoverReportPanel
        departures={[createDeparture({ departureType: 'deserted', payoutAmount: 0 })]}
      />,
    );
    expect(screen.getByText('Deserted')).toBeInTheDocument();
  });

  it('should display roll vs target number', () => {
    render(<TurnoverReportPanel departures={[createDeparture()]} />);
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('should display summary counts', () => {
    const departures = [
      createDeparture({ personId: 'p1', departureType: 'retired' }),
      createDeparture({ personId: 'p2', personName: 'Bob', departureType: 'deserted', payoutAmount: 0 }),
    ];
    render(<TurnoverReportPanel departures={departures} />);
    expect(screen.getByText('1 retired')).toBeInTheDocument();
    expect(screen.getByText('1 deserted')).toBeInTheDocument();
  });

  it('should expand modifier breakdown on click', () => {
    render(<TurnoverReportPanel departures={[createDeparture()]} />);

    expect(screen.queryByText('Base Target')).not.toBeInTheDocument();

    const expandButton = screen.getByRole('button', { name: /Alice Smith/i });
    fireEvent.click(expandButton);

    expect(screen.getByText('Base Target')).toBeInTheDocument();
    expect(screen.getByText('Injuries')).toBeInTheDocument();
    expect(screen.getByText('Officer Status')).toBeInTheDocument();
  });

  it('should show modifier values with correct signs', () => {
    render(<TurnoverReportPanel departures={[createDeparture()]} />);

    const expandButton = screen.getByRole('button', { name: /Alice Smith/i });
    fireEvent.click(expandButton);

    expect(screen.getByText('+3')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.getByText('-1')).toBeInTheDocument();
  });

  it('should hide zero-value stub modifiers', () => {
    render(<TurnoverReportPanel departures={[createDeparture()]} />);

    const expandButton = screen.getByRole('button', { name: /Alice Smith/i });
    fireEvent.click(expandButton);

    expect(screen.queryByText('Fatigue')).not.toBeInTheDocument();
  });

  it('should collapse modifier breakdown on second click', () => {
    render(<TurnoverReportPanel departures={[createDeparture()]} />);

    const expandButton = screen.getByRole('button', { name: /Alice Smith/i });
    fireEvent.click(expandButton);
    expect(screen.getByText('Base Target')).toBeInTheDocument();

    fireEvent.click(expandButton);
    expect(screen.queryByText('Base Target')).not.toBeInTheDocument();
  });

  it('should have accessible expand button with aria-expanded', () => {
    render(<TurnoverReportPanel departures={[createDeparture()]} />);

    const expandButton = screen.getByRole('button', { name: /Alice Smith/i });
    expect(expandButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(expandButton);
    expect(expandButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('should have data-testid for integration', () => {
    render(<TurnoverReportPanel departures={[createDeparture()]} />);
    expect(screen.getByTestId('turnover-report-panel')).toBeInTheDocument();
  });
});
