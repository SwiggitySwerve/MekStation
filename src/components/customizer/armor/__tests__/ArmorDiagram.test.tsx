import { render, screen } from '@testing-library/react';
import React from 'react';

import { useCustomizerSettingsStore } from '@/stores/useCustomizerSettingsStore';
import { MechLocation } from '@/types/construction';

import { ArmorDiagram } from '../ArmorDiagram';

jest.mock('@/stores/useCustomizerSettingsStore');
const mockUseCustomizerSettingsStore =
  useCustomizerSettingsStore as jest.MockedFunction<
    typeof useCustomizerSettingsStore
  >;

describe('ArmorDiagram', () => {
  const mockArmorData = [
    { location: MechLocation.HEAD, current: 9, maximum: 9 },
    {
      location: MechLocation.CENTER_TORSO,
      current: 35,
      maximum: 47,
      rear: 12,
      rearMaximum: 23,
    },
    {
      location: MechLocation.LEFT_TORSO,
      current: 24,
      maximum: 32,
      rear: 8,
      rearMaximum: 16,
    },
    {
      location: MechLocation.RIGHT_TORSO,
      current: 24,
      maximum: 32,
      rear: 8,
      rearMaximum: 16,
    },
    { location: MechLocation.LEFT_ARM, current: 20, maximum: 24 },
    { location: MechLocation.RIGHT_ARM, current: 20, maximum: 24 },
    { location: MechLocation.LEFT_LEG, current: 28, maximum: 32 },
    { location: MechLocation.RIGHT_LEG, current: 28, maximum: 32 },
  ];

  const defaultProps = {
    armorData: mockArmorData,
    selectedLocation: null,
    unallocatedPoints: 12,
    onLocationClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mode switching', () => {
    it('should render silhouette diagram when mode is silhouette', () => {
      mockUseCustomizerSettingsStore.mockImplementation((selector) =>
        selector({
          armorDiagramMode: 'silhouette',
        } as unknown as ReturnType<typeof useCustomizerSettingsStore.getState>),
      );

      const { container } = render(<ArmorDiagram {...defaultProps} />);

      // Silhouette mode uses SVG
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should render schematic diagram when mode is schematic', () => {
      mockUseCustomizerSettingsStore.mockImplementation((selector) =>
        selector({
          armorDiagramMode: 'schematic',
        } as unknown as ReturnType<typeof useCustomizerSettingsStore.getState>),
      );

      render(<ArmorDiagram {...defaultProps} />);

      // Schematic mode uses CSS grid with location abbreviations
      expect(screen.getAllByText('HD').length).toBeGreaterThan(0);
      expect(screen.getAllByText('CT').length).toBeGreaterThan(0);
    });

    it('should pass props to schematic diagram correctly', () => {
      mockUseCustomizerSettingsStore.mockImplementation((selector) =>
        selector({
          armorDiagramMode: 'schematic',
        } as unknown as ReturnType<typeof useCustomizerSettingsStore.getState>),
      );

      // Check that the selected location has the selected styling
      const { container } = render(
        <ArmorDiagram {...defaultProps} selectedLocation={MechLocation.HEAD} />,
      );
      const selectedButton = container.querySelector('.ring-2');
      expect(selectedButton).toBeInTheDocument();
    });
  });
});
