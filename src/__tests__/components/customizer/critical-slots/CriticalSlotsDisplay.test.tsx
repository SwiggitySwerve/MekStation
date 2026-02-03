import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CriticalSlotsDisplay } from '@/components/customizer/critical-slots/CriticalSlotsDisplay';
import { MechLocation } from '@/types/construction';

// Mock LocationGrid
jest.mock('@/components/customizer/critical-slots/LocationGrid', () => ({
  LocationGrid: ({ location, onSlotClick }: { location: string; onSlotClick: (location: string, slotIndex: number) => void }) => (
    <div data-testid={`location-grid-${location}`}>
      <button onClick={() => onSlotClick(location, 0)}>Slot 0</button>
    </div>
  ),
}));

// Mock CriticalSlotToolbar
jest.mock('@/components/customizer/critical-slots/CriticalSlotToolbar', () => ({
  CriticalSlotToolbar: ({ onAutoFillToggle, onPreviewToggle }: { onAutoFillToggle: () => void; onPreviewToggle: () => void }) => (
    <div data-testid="toolbar">
      <button onClick={onAutoFillToggle}>Toggle Auto-Fill</button>
      <button onClick={onPreviewToggle}>Toggle Preview</button>
    </div>
  ),
}));

describe('CriticalSlotsDisplay', () => {
  const defaultProps = {
    locations: [
      {
        location: MechLocation.HEAD,
        slots: [
          { index: 0, type: 'empty' as const },
          { index: 1, type: 'empty' as const },
        ],
      },
    ],
    autoFillUnhittables: false,
    showPlacementPreview: false,
    onSlotClick: jest.fn(),
    onEquipmentDrop: jest.fn(),
    onEquipmentRemove: jest.fn(),
    onAutoFillToggle: jest.fn(),
    onPreviewToggle: jest.fn(),
    onToolbarAction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render location grids', () => {
    render(<CriticalSlotsDisplay {...defaultProps} />);
    
    // MechLocation.HEAD = 'Head', so testid is location-grid-Head
    // Should render for both mobile and desktop views
    const headGrids = screen.getAllByTestId(`location-grid-${MechLocation.HEAD}`);
    expect(headGrids.length).toBeGreaterThanOrEqual(1);
  });

  it('should render toolbar', () => {
    render(<CriticalSlotsDisplay {...defaultProps} />);
    
    expect(screen.getByTestId('toolbar')).toBeInTheDocument();
  });

  it('should render location grids with slots', () => {
    render(<CriticalSlotsDisplay {...defaultProps} />);
    
    // Should render for both mobile and desktop views
    const headGrids = screen.getAllByTestId(`location-grid-${MechLocation.HEAD}`);
    expect(headGrids.length).toBeGreaterThanOrEqual(1);
  });

  it('should call onAutoFillToggle when toggle is clicked', async () => {
    const user = userEvent.setup();
    render(<CriticalSlotsDisplay {...defaultProps} />);
    
    const toggleButton = screen.getByText('Toggle Auto-Fill');
    await user.click(toggleButton);
    
    expect(defaultProps.onAutoFillToggle).toHaveBeenCalledTimes(1);
  });

  it('should call onPreviewToggle when preview toggle is clicked', async () => {
    const user = userEvent.setup();
    render(<CriticalSlotsDisplay {...defaultProps} />);
    
    const previewButton = screen.getByText('Toggle Preview');
    await user.click(previewButton);
    
    expect(defaultProps.onPreviewToggle).toHaveBeenCalledTimes(1);
  });

  it('should apply custom className', () => {
    const { container } = render(<CriticalSlotsDisplay {...defaultProps} className="custom-class" />);
    
    const display = container.firstChild;
    expect(display).toHaveClass('custom-class');
  });
});

