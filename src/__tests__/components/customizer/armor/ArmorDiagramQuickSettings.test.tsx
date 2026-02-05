import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { ArmorDiagramQuickSettings } from '@/components/customizer/armor/ArmorDiagramQuickSettings';
import {
  useAppSettingsStore,
  AppSettingsState,
  ArmorDiagramVariant,
} from '@/stores/useAppSettingsStore';

jest.mock('@/stores/useAppSettingsStore', () => ({
  useAppSettingsStore: jest.fn(),
}));

const mockUseAppSettingsStore = useAppSettingsStore as jest.MockedFunction<
  typeof useAppSettingsStore
>;

function createMockState(
  variant: ArmorDiagramVariant,
  setFn: jest.Mock,
  revertFn: jest.Mock,
): Partial<AppSettingsState> {
  return {
    armorDiagramVariant: variant,
    setArmorDiagramVariant: setFn,
    revertCustomizer: revertFn,
    getEffectiveArmorDiagramVariant: () => variant,
  };
}

describe('ArmorDiagramQuickSettings', () => {
  const mockSetArmorDiagramVariant = jest.fn();
  const mockRevertCustomizer = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppSettingsStore.mockImplementation(
      <T,>(selector: (state: AppSettingsState) => T): T => {
        const state = createMockState(
          'clean-tech',
          mockSetArmorDiagramVariant,
          mockRevertCustomizer,
        );
        return selector(state as AppSettingsState);
      },
    );
  });

  it('renders current variant name with silhouette label', () => {
    render(<ArmorDiagramQuickSettings />);
    expect(screen.getByText('Silhouette:')).toBeInTheDocument();
    // Uses DIAGRAM_VARIANT_INFO name: 'Standard' for 'clean-tech'
    expect(screen.getByText('Standard')).toBeInTheDocument();
  });

  it('opens dropdown on click', async () => {
    const user = userEvent.setup();
    render(<ArmorDiagramQuickSettings />);

    await user.click(screen.getByRole('button', { expanded: false }));

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(5);
  });

  it('displays all variant options in dropdown', async () => {
    const user = userEvent.setup();
    render(<ArmorDiagramQuickSettings />);

    await user.click(screen.getByRole('button', { expanded: false }));

    // Uses VARIANT_NAMES from VariantConstants
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveTextContent('Standard');
    expect(options[1]).toHaveTextContent('Glow');
    expect(options[2]).toHaveTextContent('HUD');
    expect(options[3]).toHaveTextContent('Chromatic');
    expect(options[4]).toHaveTextContent('MegaMek');
  });

  it('calls setArmorDiagramVariant when option selected', async () => {
    const user = userEvent.setup();
    render(<ArmorDiagramQuickSettings />);

    await user.click(screen.getByRole('button', { expanded: false }));
    await user.click(screen.getByRole('option', { name: 'Glow' }));

    expect(mockRevertCustomizer).toHaveBeenCalled();
    expect(mockSetArmorDiagramVariant).toHaveBeenCalledWith('neon-operator');
  });

  it('closes dropdown after selection', async () => {
    const user = userEvent.setup();
    render(<ArmorDiagramQuickSettings />);

    await user.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: 'HUD' }));

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes dropdown on outside click', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <ArmorDiagramQuickSettings />
        <button data-testid="outside">Outside</button>
      </div>,
    );

    await user.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes dropdown on escape key', async () => {
    const user = userEvent.setup();
    render(<ArmorDiagramQuickSettings />);

    await user.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows checkmark on selected variant', async () => {
    const user = userEvent.setup();
    render(<ArmorDiagramQuickSettings />);

    await user.click(screen.getByRole('button', { expanded: false }));

    const selectedOption = screen.getByRole('option', { selected: true });
    expect(selectedOption).toHaveTextContent('Standard');
  });

  it('reflects different initial variant', () => {
    mockUseAppSettingsStore.mockImplementation(
      <T,>(selector: (state: AppSettingsState) => T): T => {
        const state = createMockState(
          'tactical-hud',
          mockSetArmorDiagramVariant,
          mockRevertCustomizer,
        );
        return selector(state as AppSettingsState);
      },
    );

    render(<ArmorDiagramQuickSettings />);
    // VARIANT_NAMES name for 'tactical-hud' is 'HUD'
    expect(screen.getByText('HUD')).toBeInTheDocument();
  });

  it('persists changes immediately', async () => {
    const user = userEvent.setup();
    render(<ArmorDiagramQuickSettings />);

    await user.click(screen.getByRole('button', { expanded: false }));
    await user.click(screen.getByRole('option', { name: 'MegaMek' }));

    expect(mockSetArmorDiagramVariant).toHaveBeenCalledWith('megamek');
    expect(mockSetArmorDiagramVariant).toHaveBeenCalledTimes(1);
  });
});
