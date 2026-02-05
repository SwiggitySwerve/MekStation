import { render, screen } from '@testing-library/react';
import React from 'react';

import {
  GlobalStatusBar,
  StatusBarStats,
} from '@/components/customizer/shared/GlobalStatusBar';

describe('GlobalStatusBar', () => {
  const createStats = (
    overrides?: Partial<StatusBarStats>,
  ): StatusBarStats => ({
    weightUsed: 50,
    weightMax: 100,
    weightRemaining: 50,
    slotsUsed: 40,
    slotsTotal: 78,
    heatGenerated: 20,
    heatDissipation: 30,
    ...overrides,
  });

  it('should display weight information', () => {
    const stats = createStats();
    render(<GlobalStatusBar stats={stats} />);

    expect(screen.getByText(/Weight:/)).toBeInTheDocument();
    expect(screen.getByText(/50.0 \/ 100t/)).toBeInTheDocument();
    expect(screen.getByText(/\+50.0t rem/)).toBeInTheDocument();
  });

  it('should display slot information', () => {
    const stats = createStats();
    render(<GlobalStatusBar stats={stats} />);

    expect(screen.getByText(/Free Slots:/)).toBeInTheDocument();
    expect(screen.getByText(/40 \/ 78/)).toBeInTheDocument();
  });

  it('should display heat information', () => {
    const stats = createStats();
    render(<GlobalStatusBar stats={stats} />);

    expect(screen.getByText(/Heat:/)).toBeInTheDocument();
    expect(screen.getByText(/20 \/ 30/)).toBeInTheDocument();
  });

  it('should highlight overweight status', () => {
    const stats = createStats({
      weightUsed: 110,
      weightRemaining: -10,
    });
    render(<GlobalStatusBar stats={stats} />);

    const weightText = screen.getByText(/110.0 \/ 100t/);
    expect(weightText).toHaveClass('text-red-400');

    expect(screen.getByText(/⚠️/)).toBeInTheDocument();
    expect(screen.getByText(/Over Weight/)).toBeInTheDocument();
  });

  it('should highlight over slots status', () => {
    const stats = createStats({
      slotsUsed: 80,
      slotsTotal: 78,
    });
    render(<GlobalStatusBar stats={stats} />);

    const slotsText = screen.getByText(/80 \/ 78/);
    expect(slotsText).toHaveClass('text-red-400');

    expect(screen.getByText(/over by 2/)).toBeInTheDocument();
    expect(screen.getByText(/Over Slots/)).toBeInTheDocument();
  });

  it('should highlight over heat status', () => {
    const stats = createStats({
      heatGenerated: 35,
      heatDissipation: 30,
    });
    render(<GlobalStatusBar stats={stats} />);

    const heatText = screen.getByText(/35 \/ 30/);
    expect(heatText).toHaveClass('text-amber-400');

    expect(screen.getByText(/\+5 buildup/)).toBeInTheDocument();
  });

  it('should show both warnings when over weight and slots', () => {
    const stats = createStats({
      weightUsed: 110,
      weightRemaining: -10,
      slotsUsed: 80,
      slotsTotal: 78,
    });
    render(<GlobalStatusBar stats={stats} />);

    expect(screen.getByText(/Over Weight/)).toBeInTheDocument();
    expect(screen.getByText(/Over Slots/)).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const stats = createStats();
    const { container } = render(
      <GlobalStatusBar stats={stats} className="custom-class" />,
    );

    const statusBar = container.firstChild;
    expect(statusBar).toHaveClass('custom-class');
  });
});
