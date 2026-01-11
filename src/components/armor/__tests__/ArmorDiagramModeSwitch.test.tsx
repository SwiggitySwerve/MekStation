import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArmorDiagramModeSwitch } from '../ArmorDiagramModeSwitch';
import { useAppSettingsStore } from '@/stores/useAppSettingsStore';

// Mock the store
jest.mock('@/stores/useAppSettingsStore');

describe('ArmorDiagramModeSwitch', () => {
  const mockSetArmorDiagramMode = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAppSettingsStore as unknown as jest.Mock).mockReturnValue({
      armorDiagramMode: 'silhouette',
      setArmorDiagramMode: mockSetArmorDiagramMode,
    });
  });

  it('should render mode options', () => {
    render(<ArmorDiagramModeSwitch />);
    expect(screen.getByText('Schematic')).toBeInTheDocument();
    expect(screen.getByText('Silhouette')).toBeInTheDocument();
  });

  it('should show current mode as selected', () => {
    render(<ArmorDiagramModeSwitch />);
    const silhouetteButton = screen.getByText('Silhouette');
    expect(silhouetteButton).toHaveClass('bg-accent');
  });

  it('should call setArmorDiagramMode when mode is changed', () => {
    render(<ArmorDiagramModeSwitch />);
    fireEvent.click(screen.getByText('Schematic'));
    expect(mockSetArmorDiagramMode).toHaveBeenCalledWith('schematic');
  });
});
