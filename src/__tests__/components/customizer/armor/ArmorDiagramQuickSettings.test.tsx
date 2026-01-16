import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArmorDiagramQuickSettings } from '@/components/customizer/armor/ArmorDiagramQuickSettings';
import { useAppSettingsStore, AppSettingsState, ArmorDiagramVariant } from '@/stores/useAppSettingsStore';

jest.mock('@/stores/useAppSettingsStore', () => ({
  useAppSettingsStore: jest.fn(),
}));

const mockUseAppSettingsStore = useAppSettingsStore as jest.MockedFunction<typeof useAppSettingsStore>;

function createMockState(
  variant: ArmorDiagramVariant,
  setFn: jest.Mock,
  revertFn: jest.Mock
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
    mockUseAppSettingsStore.mockImplementation(<T,>(selector: (state: AppSettingsState) => T): T => {
      const state = createMockState('clean-tech', mockSetArmorDiagramVariant, mockRevertCustomizer);
      return selector(state as AppSettingsState);
    });
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
    expect(screen.getAllByRole('option')).toHaveLength(6);
  });

  it('displays all variant options in dropdown', async () => {
    const user = userEvent.setup();
    render(<ArmorDiagramQuickSettings />);

    await user.click(screen.getByRole('button', { expanded: false }));

    // Uses DIAGRAM_VARIANT_INFO names
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveTextContent('Standard');
    expect(options[1]).toHaveTextContent('Glow Effects');
    expect(options[2]).toHaveTextContent('LED Display');
    expect(options[3]).toHaveTextContent('Metallic');
    expect(options[4]).toHaveTextContent('MegaMek');
    expect(options[5]).toHaveTextContent('MegaMek Classic');
  });

  it('calls setArmorDiagramVariant when option selected', async () => {
    const user = userEvent.setup();
    render(<ArmorDiagramQuickSettings />);

    await user.click(screen.getByRole('button', { expanded: false }));
    await user.click(screen.getByRole('option', { name: 'Glow Effects' }));

    expect(mockRevertCustomizer).toHaveBeenCalled();
    expect(mockSetArmorDiagramVariant).toHaveBeenCalledWith('neon-operator');
  });

  it('closes dropdown after selection', async () => {
    const user = userEvent.setup();
    render(<ArmorDiagramQuickSettings />);

    await user.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: 'LED Display' }));

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes dropdown on outside click', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <ArmorDiagramQuickSettings />
        <button data-testid="outside">Outside</button>
      </div>
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
    mockUseAppSettingsStore.mockImplementation(<T,>(selector: (state: AppSettingsState) => T): T => {
      const state = createMockState('tactical-hud', mockSetArmorDiagramVariant, mockRevertCustomizer);
      return selector(state as AppSettingsState);
    });

    render(<ArmorDiagramQuickSettings />);
    // DIAGRAM_VARIANT_INFO name for 'tactical-hud' is 'LED Display'
    expect(screen.getByText('LED Display')).toBeInTheDocument();
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
