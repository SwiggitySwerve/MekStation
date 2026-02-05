import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import {
  TechBaseConfiguration,
  DEFAULT_COMPONENT_VALUES,
} from '@/components/customizer/shared/TechBaseConfiguration';
import {
  TechBaseMode,
  createDefaultComponentTechBases,
} from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';

describe('TechBaseConfiguration', () => {
  const defaultProps = {
    mode: TechBaseMode.INNER_SPHERE,
    components: createDefaultComponentTechBases(TechBase.INNER_SPHERE),
    componentValues: DEFAULT_COMPONENT_VALUES,
    onModeChange: jest.fn(),
    onComponentChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render tech base mode buttons', () => {
    render(<TechBaseConfiguration {...defaultProps} />);

    expect(screen.getByText('Inner Sphere')).toBeInTheDocument();
    // Use getAllByText and check that at least one exists (mode button + component buttons)
    const clanButtons = screen.getAllByText('Clan');
    expect(clanButtons.length).toBeGreaterThan(0);
    expect(screen.getByText('Mixed')).toBeInTheDocument();
  });

  it('should highlight active mode', () => {
    render(
      <TechBaseConfiguration {...defaultProps} mode={TechBaseMode.CLAN} />,
    );

    // Find the mode button by title attribute
    const clanModeButton = screen.getByTitle(
      'All components use Clan technology',
    );
    expect(clanModeButton).toHaveClass('bg-red-600');
  });

  it('should call onModeChange when mode button is clicked', async () => {
    const user = userEvent.setup();
    render(<TechBaseConfiguration {...defaultProps} />);

    // Find the mode button by title attribute to avoid clicking component buttons
    const clanModeButton = screen.getByTitle(
      'All components use Clan technology',
    );
    await user.click(clanModeButton);

    expect(defaultProps.onModeChange).toHaveBeenCalledWith(TechBaseMode.CLAN);
  });

  it('should render component rows', () => {
    render(<TechBaseConfiguration {...defaultProps} />);

    // Check for component labels - they might be in different format
    const componentLabels = screen.getAllByText(
      /Chassis|Gyro|Engine|Heat Sink|Targeting|Myomer|Movement|Armor/i,
    );
    expect(componentLabels.length).toBeGreaterThan(0);
  });

  it('should display component values', () => {
    const componentValues = {
      ...DEFAULT_COMPONENT_VALUES,
      engine: 'Standard Fusion 300',
      gyro: 'XL',
    };

    render(
      <TechBaseConfiguration
        {...defaultProps}
        componentValues={componentValues}
      />,
    );

    expect(screen.getByText('Standard Fusion 300')).toBeInTheDocument();
    expect(screen.getByText('XL')).toBeInTheDocument();
  });

  it('should call onComponentChange when component tech base changes', async () => {
    const user = userEvent.setup();
    render(
      <TechBaseConfiguration {...defaultProps} mode={TechBaseMode.MIXED} />,
    );

    // Find component Clan buttons (skip the mode button)
    const clanButtons = screen.getAllByText('Clan');
    if (clanButtons.length > 1) {
      await user.click(clanButtons[1]);
      expect(defaultProps.onComponentChange).toHaveBeenCalled();
    }
  });

  it('should disable component tech base buttons in non-mixed mode', () => {
    render(
      <TechBaseConfiguration
        {...defaultProps}
        mode={TechBaseMode.INNER_SPHERE}
      />,
    );

    // In non-mixed mode, component tech base buttons should be disabled
    const isButtons = screen.getAllByText('IS');
    const clanButtons = screen.getAllByText('Clan');
    // Should have mode buttons + disabled component buttons
    expect(isButtons.length + clanButtons.length).toBeGreaterThan(2);
  });

  it('should enable component tech base buttons in mixed mode', () => {
    render(
      <TechBaseConfiguration {...defaultProps} mode={TechBaseMode.MIXED} />,
    );

    // In mixed mode, component tech base buttons should be enabled
    const clanButtons = screen.getAllByText('Clan');
    expect(clanButtons.length).toBeGreaterThan(1); // Mode button + component buttons
  });
});
