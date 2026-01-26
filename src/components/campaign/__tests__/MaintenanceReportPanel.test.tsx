import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MaintenanceReportPanel } from '../MaintenanceReportPanel';
import type { MaintenanceEvent } from '../MaintenanceReportPanel';
import { PartQuality } from '@/types/campaign/quality';

function createEvent(overrides: Partial<MaintenanceEvent> = {}): MaintenanceEvent {
  return {
    unitId: 'unit-atlas',
    techId: 'tech-1',
    techName: 'Sgt. Wrench',
    roll: 8,
    targetNumber: 7,
    margin: 1,
    outcome: 'success',
    qualityBefore: PartQuality.D,
    qualityAfter: PartQuality.D,
    modifiers: [
      { name: 'Tech Skill', value: 7 },
      { name: 'Quality', value: 0 },
    ],
    unmaintained: false,
    ...overrides,
  };
}

describe('MaintenanceReportPanel', () => {
  it('should render nothing when no events', () => {
    const { container } = render(<MaintenanceReportPanel events={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should display event count in header', () => {
    const events = [createEvent(), createEvent({ unitId: 'unit-hunchback' })];
    render(<MaintenanceReportPanel events={events} />);
    expect(screen.getByText('Maintenance Checks (2)')).toBeInTheDocument();
  });

  it('should display unit ID and outcome', () => {
    render(<MaintenanceReportPanel events={[createEvent()]} />);
    expect(screen.getByText('unit-atlas')).toBeInTheDocument();
    expect(screen.getByText(/Success/)).toBeInTheDocument();
  });

  it('should display tech name for maintained units', () => {
    render(<MaintenanceReportPanel events={[createEvent()]} />);
    expect(screen.getByText(/Sgt\. Wrench/)).toBeInTheDocument();
  });

  it('should display roll vs target number', () => {
    render(<MaintenanceReportPanel events={[createEvent()]} />);
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('should show quality badges for quality changes', () => {
    render(
      <MaintenanceReportPanel
        events={[createEvent({ qualityBefore: PartQuality.D, qualityAfter: PartQuality.C, outcome: 'failure', margin: -1 })]}
      />,
    );
    const badges = screen.getAllByTestId('quality-badge');
    expect(badges.length).toBe(2);
    expect(badges[0]).toHaveTextContent('D');
    expect(badges[1]).toHaveTextContent('C');
  });

  it('should show single quality badge when quality unchanged', () => {
    render(<MaintenanceReportPanel events={[createEvent()]} />);
    const badges = screen.getAllByTestId('quality-badge');
    expect(badges.length).toBe(1);
    expect(badges[0]).toHaveTextContent('D');
  });

  it('should display summary counts', () => {
    const events = [
      createEvent({ unitId: 'u1', outcome: 'success' }),
      createEvent({ unitId: 'u2', outcome: 'failure', qualityBefore: PartQuality.D, qualityAfter: PartQuality.C }),
      createEvent({ unitId: 'u3', unmaintained: true, techId: undefined, techName: undefined, roll: 0, targetNumber: 0, margin: 0, outcome: 'failure', qualityBefore: PartQuality.D, qualityAfter: PartQuality.C }),
    ];
    render(<MaintenanceReportPanel events={events} />);
    expect(screen.getByText('1 passed')).toBeInTheDocument();
    expect(screen.getByText('1 failed')).toBeInTheDocument();
    expect(screen.getByText('1 no tech')).toBeInTheDocument();
    expect(screen.getByText('2 quality changed')).toBeInTheDocument();
  });

  it('should expand modifier breakdown on click', () => {
    render(<MaintenanceReportPanel events={[createEvent()]} />);

    expect(screen.queryByText('Tech Skill')).not.toBeInTheDocument();

    const expandButton = screen.getByRole('button', { name: /unit-atlas/i });
    fireEvent.click(expandButton);

    expect(screen.getByText('Tech Skill')).toBeInTheDocument();
    expect(screen.getByText('Quality')).toBeInTheDocument();
  });

  it('should show margin in expanded view', () => {
    render(<MaintenanceReportPanel events={[createEvent()]} />);

    const expandButton = screen.getByRole('button', { name: /unit-atlas/i });
    fireEvent.click(expandButton);

    expect(screen.getByText('Margin')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('should collapse on second click', () => {
    render(<MaintenanceReportPanel events={[createEvent()]} />);

    const expandButton = screen.getByRole('button', { name: /unit-atlas/i });
    fireEvent.click(expandButton);
    expect(screen.getByText('Tech Skill')).toBeInTheDocument();

    fireEvent.click(expandButton);
    expect(screen.queryByText('Tech Skill')).not.toBeInTheDocument();
  });

  it('should show unmaintained warning in expanded view', () => {
    const event = createEvent({
      unmaintained: true,
      techId: undefined,
      techName: undefined,
      roll: 0,
      targetNumber: 0,
      margin: 0,
      outcome: 'failure',
      qualityBefore: PartQuality.D,
      qualityAfter: PartQuality.C,
    });
    render(<MaintenanceReportPanel events={[event]} />);

    const expandButton = screen.getByRole('button', { name: /unit-atlas/i });
    fireEvent.click(expandButton);

    expect(screen.getByText(/No tech assigned/)).toBeInTheDocument();
  });

  it('should have accessible expand button with aria-expanded', () => {
    render(<MaintenanceReportPanel events={[createEvent()]} />);

    const expandButton = screen.getByRole('button', { name: /unit-atlas/i });
    expect(expandButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(expandButton);
    expect(expandButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('should have data-testid for integration', () => {
    render(<MaintenanceReportPanel events={[createEvent()]} />);
    expect(screen.getByTestId('maintenance-report-panel')).toBeInTheDocument();
  });

  it('should display critical failure outcome', () => {
    render(
      <MaintenanceReportPanel
        events={[createEvent({ outcome: 'critical_failure', roll: 2, margin: -5, qualityBefore: PartQuality.D, qualityAfter: PartQuality.C })]}
      />,
    );
    expect(screen.getByText(/Critical Failure/)).toBeInTheDocument();
  });

  it('should display excellent outcome for critical success', () => {
    render(
      <MaintenanceReportPanel
        events={[createEvent({ outcome: 'critical_success', roll: 12, margin: 5, qualityBefore: PartQuality.D, qualityAfter: PartQuality.E })]}
      />,
    );
    expect(screen.getByText(/Excellent/)).toBeInTheDocument();
  });
});
