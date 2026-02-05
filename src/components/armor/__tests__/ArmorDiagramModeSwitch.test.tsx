import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { useAppSettingsStore } from '@/stores/useAppSettingsStore';

import { ArmorDiagramModeSwitch } from '../ArmorDiagramModeSwitch';

// Mock the store
jest.mock('@/stores/useAppSettingsStore');
const mockUseAppSettingsStore = useAppSettingsStore as jest.MockedFunction<
  typeof useAppSettingsStore
>;

describe('ArmorDiagramModeSwitch', () => {
  const mockSetArmorDiagramMode = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppSettingsStore.mockReturnValue({
      armorDiagramMode: 'silhouette',
      setArmorDiagramMode: mockSetArmorDiagramMode,
    } as ReturnType<typeof useAppSettingsStore>);
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
