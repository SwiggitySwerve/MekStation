import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { useCustomizerSettingsStore } from '@/stores/useCustomizerSettingsStore';

import { ArmorDiagramModeSwitch } from '../ArmorDiagramModeSwitch';

jest.mock('@/stores/useCustomizerSettingsStore');
const mockUseCustomizerSettingsStore =
  useCustomizerSettingsStore as jest.MockedFunction<
    typeof useCustomizerSettingsStore
  >;

describe('ArmorDiagramModeSwitch', () => {
  const mockSetArmorDiagramMode = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCustomizerSettingsStore.mockImplementation((selector) =>
      selector({
        armorDiagramMode: 'silhouette',
        setArmorDiagramMode: mockSetArmorDiagramMode,
      } as unknown as ReturnType<typeof useCustomizerSettingsStore.getState>),
    );
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
