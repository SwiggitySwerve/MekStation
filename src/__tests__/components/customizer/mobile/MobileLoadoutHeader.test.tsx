import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileLoadoutHeader, MobileLoadoutStats } from '@/components/customizer/mobile/MobileLoadoutHeader';

describe('MobileLoadoutHeader', () => {
  const createStats = (overrides?: Partial<MobileLoadoutStats>): MobileLoadoutStats => ({
    weightUsed: 45,
    weightMax: 75,
    slotsUsed: 42,
    slotsMax: 78,
    heatGenerated: 15,
    heatDissipation: 20,
    battleValue: 1500,
    equipmentCount: 12,
    unassignedCount: 3,
    ...overrides,
  });

  const defaultProps = {
    stats: createStats(),
    isExpanded: false,
    onToggle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Stats Display', () => {
    it('should display weight stats', () => {
      render(<MobileLoadoutHeader {...defaultProps} />);
      expect(screen.getByText('45.0')).toBeInTheDocument();
      expect(screen.getByText('75')).toBeInTheDocument();
    });

    it('should display slot stats', () => {
      render(<MobileLoadoutHeader {...defaultProps} />);
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('78')).toBeInTheDocument();
    });

    it('should display heat stats', () => {
      render(<MobileLoadoutHeader {...defaultProps} />);
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
    });

    it('should display battle value', () => {
      render(<MobileLoadoutHeader {...defaultProps} />);
      expect(screen.getByText('1,500')).toBeInTheDocument();
    });
  });

  describe('Overage Indicators', () => {
    it('should show red for weight overage', () => {
      const stats = createStats({ weightUsed: 80, weightMax: 75 });
      const { container } = render(<MobileLoadoutHeader {...defaultProps} stats={stats} />);
      const weightValue = container.querySelector('.text-red-400');
      expect(weightValue).toBeInTheDocument();
    });

    it('should show red for slot overage', () => {
      const stats = createStats({ slotsUsed: 85, slotsMax: 78 });
      const { container } = render(<MobileLoadoutHeader {...defaultProps} stats={stats} />);
      const slotValue = container.querySelector('.text-red-400');
      expect(slotValue).toBeInTheDocument();
    });

    it('should show red for heat overage', () => {
      const stats = createStats({ heatGenerated: 25, heatDissipation: 20 });
      const { container } = render(<MobileLoadoutHeader {...defaultProps} stats={stats} />);
      const heatValue = container.querySelector('.text-red-400');
      expect(heatValue).toBeInTheDocument();
    });
  });

  describe('Equipment Count Badge', () => {
    it('should show equipment count', () => {
      render(<MobileLoadoutHeader {...defaultProps} />);
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('should show unassigned count if greater than zero', () => {
      const stats = createStats({ unassignedCount: 5 });
      render(<MobileLoadoutHeader {...defaultProps} stats={stats} />);
      expect(screen.getByText('5 unassigned')).toBeInTheDocument();
    });
  });

  describe('Toggle Behavior', () => {
    it('should call onToggle when clicked', async () => {
      const user = userEvent.setup();
      render(<MobileLoadoutHeader {...defaultProps} />);
      
      const header = screen.getByRole('button');
      await user.click(header);
      
      expect(defaultProps.onToggle).toHaveBeenCalled();
    });

    it('should show expand indicator', () => {
      render(<MobileLoadoutHeader {...defaultProps} isExpanded={false} />);
      expect(screen.getByText('▲')).toBeInTheDocument();
    });

    it('should rotate indicator when expanded', () => {
      const { container } = render(<MobileLoadoutHeader {...defaultProps} isExpanded={true} />);
      const indicator = container.querySelector('.rotate-180');
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('Formatting', () => {
    it('should format large battle values with commas', () => {
      const stats = createStats({ battleValue: 12345 });
      render(<MobileLoadoutHeader {...defaultProps} stats={stats} />);
      expect(screen.getByText('12,345')).toBeInTheDocument();
    });

    it('should handle zero equipment count', () => {
      const stats = createStats({ equipmentCount: 0 });
      render(<MobileLoadoutHeader {...defaultProps} stats={stats} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });
});
