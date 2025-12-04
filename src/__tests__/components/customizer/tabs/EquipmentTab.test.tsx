import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EquipmentTab } from '@/components/customizer/tabs/EquipmentTab';
import { useUnitStore } from '@/stores/useUnitStore';
import { EquipmentBrowserProps } from '@/components/customizer/equipment/EquipmentBrowser';

// Mock EquipmentBrowser
jest.mock('@/components/customizer/equipment/EquipmentBrowser', () => ({
  EquipmentBrowser: ({ onAddEquipment }: Pick<EquipmentBrowserProps, 'onAddEquipment'>) => (
    <div data-testid="equipment-browser">
      <button onClick={(): void => { onAddEquipment({ id: 'test-equipment', name: 'Test Equipment' }); }}>
        Add Equipment
      </button>
    </div>
  ),
}));

// Mock useUnitStore
jest.mock('@/stores/useUnitStore', () => ({
  useUnitStore: jest.fn(),
}));

describe('EquipmentTab', () => {
  const mockAddEquipment = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useUnitStore as jest.Mock).mockImplementation((selector: (state: unknown) => unknown) => {
      if (selector.toString().includes('addEquipment')) {
        return mockAddEquipment;
      }
      return undefined;
    });
  });

  it('should render equipment browser', () => {
    render(<EquipmentTab />);
    
    expect(screen.getByTestId('equipment-browser')).toBeInTheDocument();
  });

  it('should call addEquipment when equipment is added', async () => {
    const user = userEvent.setup();
    
    render(<EquipmentTab />);
    
    const addButton = screen.getByText('Add Equipment');
    await user.click(addButton);
    
    expect(mockAddEquipment).toHaveBeenCalledWith({
      id: 'test-equipment',
      name: 'Test Equipment',
    });
  });

  it('should not call addEquipment when in read-only mode', async () => {
    const user = userEvent.setup();
    
    render(<EquipmentTab readOnly={true} />);
    
    const addButton = screen.getByText('Add Equipment');
    await user.click(addButton);
    
    expect(mockAddEquipment).not.toHaveBeenCalled();
  });

  it('should display read-only message when in read-only mode', () => {
    render(<EquipmentTab readOnly={true} />);
    
    expect(screen.getByText(/read-only mode/i)).toBeInTheDocument();
  });

  it('should not display read-only message when not in read-only mode', () => {
    render(<EquipmentTab readOnly={false} />);
    
    expect(screen.queryByText(/read-only mode/i)).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<EquipmentTab className="custom-class" />);
    
    const tab = container.firstChild;
    expect(tab).toHaveClass('custom-class');
  });
});

