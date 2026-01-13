import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiagramStyleSelector } from '@/components/customizer/armor/DiagramStyleSelector';
import { useAppSettingsStore, AppSettingsState, ArmorDiagramVariant } from '@/stores/useAppSettingsStore';

jest.mock('@/stores/useAppSettingsStore', () => ({
  useAppSettingsStore: jest.fn(),
}));

const mockUseAppSettingsStore = useAppSettingsStore as jest.MockedFunction<typeof useAppSettingsStore>;

function createMockState(variant: ArmorDiagramVariant, setFn: jest.Mock): Partial<AppSettingsState> {
  return {
    armorDiagramVariant: variant,
    setArmorDiagramVariant: setFn,
  };
}

describe('DiagramStyleSelector', () => {
  const mockSetArmorDiagramVariant = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppSettingsStore.mockImplementation(<T,>(selector: (state: AppSettingsState) => T): T => {
      const state = createMockState('clean-tech', mockSetArmorDiagramVariant);
      return selector(state as AppSettingsState);
    });
  });

  it('renders current variant name', () => {
    render(<DiagramStyleSelector />);
    expect(screen.getByText('Clean Tech')).toBeInTheDocument();
  });

  it('opens dropdown on click', async () => {
    const user = userEvent.setup();
    render(<DiagramStyleSelector />);
    
    await user.click(screen.getByRole('button', { expanded: false }));
    
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(5);
  });

  it('displays all variant options in dropdown', async () => {
    const user = userEvent.setup();
    render(<DiagramStyleSelector />);
    
    await user.click(screen.getByRole('button', { expanded: false }));
    
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(5);
    expect(options[0]).toHaveTextContent('Clean Tech');
    expect(options[1]).toHaveTextContent('Neon');
    expect(options[2]).toHaveTextContent('Tactical');
    expect(options[3]).toHaveTextContent('Premium');
    expect(options[4]).toHaveTextContent('MegaMek');
  });

  it('calls setArmorDiagramVariant when option selected', async () => {
    const user = userEvent.setup();
    render(<DiagramStyleSelector />);
    
    await user.click(screen.getByRole('button', { expanded: false }));
    await user.click(screen.getByText('Neon'));
    
    expect(mockSetArmorDiagramVariant).toHaveBeenCalledWith('neon-operator');
  });

  it('closes dropdown after selection', async () => {
    const user = userEvent.setup();
    render(<DiagramStyleSelector />);
    
    await user.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    
    await user.click(screen.getByText('Tactical'));
    
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes dropdown on outside click', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <DiagramStyleSelector />
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
    render(<DiagramStyleSelector />);
    
    await user.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    
    await user.keyboard('{Escape}');
    
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows checkmark on selected variant', async () => {
    const user = userEvent.setup();
    render(<DiagramStyleSelector />);
    
    await user.click(screen.getByRole('button', { expanded: false }));
    
    const cleanTechOption = screen.getByRole('option', { selected: true });
    expect(cleanTechOption).toHaveTextContent('Clean Tech');
  });

  it('reflects different initial variant', () => {
    mockUseAppSettingsStore.mockImplementation(<T,>(selector: (state: AppSettingsState) => T): T => {
      const state = createMockState('tactical-hud', mockSetArmorDiagramVariant);
      return selector(state as AppSettingsState);
    });

    render(<DiagramStyleSelector />);
    expect(screen.getByText('Tactical')).toBeInTheDocument();
  });

  it('persists changes immediately (syncs with settings)', async () => {
    const user = userEvent.setup();
    render(<DiagramStyleSelector />);
    
    await user.click(screen.getByRole('button', { expanded: false }));
    await user.click(screen.getByText('MegaMek'));
    
    expect(mockSetArmorDiagramVariant).toHaveBeenCalledWith('megamek');
    expect(mockSetArmorDiagramVariant).toHaveBeenCalledTimes(1);
  });
});
