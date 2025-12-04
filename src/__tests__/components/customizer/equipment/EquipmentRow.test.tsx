import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EquipmentRow } from '@/components/customizer/equipment/EquipmentRow';
import { EquipmentCategory, IEquipmentItem } from '@/types/equipment';
import { TechBase } from '@/types/enums/TechBase';

describe('EquipmentRow', () => {
  const createEquipment = (overrides?: Partial<IEquipmentItem>): IEquipmentItem => ({
    id: 'medium-laser',
    name: 'Medium Laser',
    category: EquipmentCategory.ENERGY_WEAPON,
    weight: 1,
    criticalSlots: 1,
    heat: 3,
    techBase: TechBase.INNER_SPHERE,
    ...overrides,
  });

  it('should render equipment name', () => {
    const equipment = createEquipment();
    const onAdd = jest.fn();
    
    render(
      <table>
        <tbody>
          <EquipmentRow equipment={equipment} onAdd={onAdd} />
        </tbody>
      </table>
    );
    
    expect(screen.getByText('Medium Laser')).toBeInTheDocument();
  });

  it('should render weight', () => {
    const equipment = createEquipment({ weight: 2 });
    const onAdd = jest.fn();
    
    render(
      <table>
        <tbody>
          <EquipmentRow equipment={equipment} onAdd={onAdd} />
        </tbody>
      </table>
    );
    
    expect(screen.getByText('2t')).toBeInTheDocument();
  });

  it('should render critical slots', () => {
    const equipment = createEquipment({ criticalSlots: 2 });
    const onAdd = jest.fn();
    
    render(
      <table>
        <tbody>
          <EquipmentRow equipment={equipment} onAdd={onAdd} />
        </tbody>
      </table>
    );
    
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should render damage when present', () => {
    const equipment = createEquipment({ damage: 5 });
    const onAdd = jest.fn();
    
    render(
      <table>
        <tbody>
          <EquipmentRow equipment={equipment} onAdd={onAdd} />
        </tbody>
      </table>
    );
    
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should render dash when damage is missing', () => {
    const equipment = createEquipment();
    const onAdd = jest.fn();
    
    render(
      <table>
        <tbody>
          <EquipmentRow equipment={equipment} onAdd={onAdd} />
        </tbody>
      </table>
    );
    
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('should render heat when present', () => {
    const equipment = createEquipment({ heat: 3 });
    const onAdd = jest.fn();
    
    render(
      <table>
        <tbody>
          <EquipmentRow equipment={equipment} onAdd={onAdd} />
        </tbody>
      </table>
    );
    
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should render dash when heat is zero or missing', () => {
    const equipment = createEquipment({ heat: 0 });
    const onAdd = jest.fn();
    
    render(
      <table>
        <tbody>
          <EquipmentRow equipment={equipment} onAdd={onAdd} />
        </tbody>
      </table>
    );
    
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('should render range when present', () => {
    const equipment = createEquipment({
      rangeShort: 3,
      rangeMedium: 6,
      rangeLong: 9,
    });
    const onAdd = jest.fn();
    
    render(
      <table>
        <tbody>
          <EquipmentRow equipment={equipment} onAdd={onAdd} />
        </tbody>
      </table>
    );
    
    expect(screen.getByText('3/6/9')).toBeInTheDocument();
  });

  it('should render dash when range is missing', () => {
    const equipment = createEquipment();
    const onAdd = jest.fn();
    
    render(
      <table>
        <tbody>
          <EquipmentRow equipment={equipment} onAdd={onAdd} />
        </tbody>
      </table>
    );
    
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('should call onAdd when Add button is clicked', async () => {
    const user = userEvent.setup();
    const equipment = createEquipment();
    const onAdd = jest.fn();
    
    render(
      <table>
        <tbody>
          <EquipmentRow equipment={equipment} onAdd={onAdd} />
        </tbody>
      </table>
    );
    
    const addButton = screen.getByText('Add');
    await user.click(addButton);
    
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('should render in compact mode', () => {
    const equipment = createEquipment();
    const onAdd = jest.fn();
    
    render(
      <table>
        <tbody>
          <EquipmentRow equipment={equipment} onAdd={onAdd} compact={true} />
        </tbody>
      </table>
    );
    
    expect(screen.getByText('Medium Laser')).toBeInTheDocument();
    // In compact mode, weight doesn't have 't' suffix
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should display equipment name in compact mode', () => {
    const equipment = createEquipment();
    const onAdd = jest.fn();
    
    render(
      <table>
        <tbody>
          <EquipmentRow equipment={equipment} onAdd={onAdd} compact={true} />
        </tbody>
      </table>
    );
    
    expect(screen.getByText('Medium Laser')).toBeInTheDocument();
    // In compact mode, weight doesn't have 't' suffix
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});

