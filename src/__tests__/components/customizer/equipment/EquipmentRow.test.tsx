import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { EquipmentRow } from '@/components/customizer/equipment/EquipmentRow';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import {
  EquipmentCategory,
  IEquipmentItem,
  IWeapon,
  WeaponCategory,
} from '@/types/equipment';
import { getAllWeapons } from '@/utils/equipment/equipmentAggregation';

// Mock getAllWeapons to return our test weapon data
jest.mock('@/utils/equipment/equipmentAggregation', () => {
  const actual = jest.requireActual<
    typeof import('@/utils/equipment/equipmentAggregation')
  >('@/utils/equipment/equipmentAggregation');
  return {
    ...actual,
    getAllWeapons: jest.fn((): ReturnType<typeof actual.getAllWeapons> => []),
  };
});

const mockGetAllWeapons = getAllWeapons as jest.MockedFunction<
  typeof getAllWeapons
>;

describe('EquipmentRow', () => {
  beforeEach(() => {
    // Reset mock to empty array by default
    mockGetAllWeapons.mockReturnValue([]);
  });

  const createEquipment = (
    overrides?: Partial<IEquipmentItem>,
  ): IEquipmentItem => ({
    id: 'medium-laser',
    name: 'Medium Laser',
    category: EquipmentCategory.ENERGY_WEAPON,
    weight: 1,
    criticalSlots: 1,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    costCBills: 40000,
    battleValue: 46,
    introductionYear: 2300,
    ...overrides,
  });

  const createMockWeapon = (overrides?: Partial<IWeapon>): IWeapon => ({
    id: 'medium-laser',
    name: 'Medium Laser',
    category: WeaponCategory.ENERGY,
    subType: '',
    weight: 1,
    criticalSlots: 1,
    heat: 3,
    damage: 5,
    ranges: { minimum: 0, short: 3, medium: 6, long: 9 },
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    costCBills: 40000,
    battleValue: 46,
    introductionYear: 2300,
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
      </table>,
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
      </table>,
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
      </table>,
    );

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should render damage when present', () => {
    // Setup mock weapon data for lookup
    mockGetAllWeapons.mockReturnValue([
      createMockWeapon({ id: 'medium-laser', damage: 5 }),
    ]);

    const equipment = createEquipment();
    const onAdd = jest.fn();

    render(
      <table>
        <tbody>
          <EquipmentRow equipment={equipment} onAdd={onAdd} />
        </tbody>
      </table>,
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
      </table>,
    );

    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('should render heat when present', () => {
    // Setup mock weapon data for lookup
    mockGetAllWeapons.mockReturnValue([
      createMockWeapon({ id: 'medium-laser', heat: 3 }),
    ]);

    const equipment = createEquipment();
    const onAdd = jest.fn();

    render(
      <table>
        <tbody>
          <EquipmentRow equipment={equipment} onAdd={onAdd} />
        </tbody>
      </table>,
    );

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should render dash when heat is zero or missing', () => {
    // Provide a weapon with zero heat to simulate dash display
    mockGetAllWeapons.mockReturnValue([
      createMockWeapon({ id: 'medium-laser', heat: 0 }),
    ]);

    const equipment = createEquipment();
    const onAdd = jest.fn();

    render(
      <table>
        <tbody>
          <EquipmentRow equipment={equipment} onAdd={onAdd} />
        </tbody>
      </table>,
    );

    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('should render range when present', () => {
    // Setup mock weapon data for lookup
    mockGetAllWeapons.mockReturnValue([
      createMockWeapon({
        id: 'medium-laser',
        ranges: { minimum: 0, short: 3, medium: 6, long: 9 },
      }),
    ]);

    const equipment = createEquipment();
    const onAdd = jest.fn();

    render(
      <table>
        <tbody>
          <EquipmentRow equipment={equipment} onAdd={onAdd} />
        </tbody>
      </table>,
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
      </table>,
    );

    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThan(0);
  });

  // Regression: physical / melee weapons (hatchet, sword, claws, …) have no
  // `ranges` block. `formatRange` used to do `weapon.ranges.short` unguarded
  // and crashed the whole Equipment tab with
  // "Cannot read properties of undefined (reading 'short')".
  it('renders a rangeless physical weapon without crashing', () => {
    const { ranges: _omitRanges, ...rangeless } = createMockWeapon({
      id: 'hatchet',
      name: 'Hatchet',
      category: WeaponCategory.PHYSICAL,
    });
    mockGetAllWeapons.mockReturnValue([rangeless as IWeapon]);

    const equipment = createEquipment({
      id: 'hatchet',
      name: 'Hatchet',
      category: EquipmentCategory.PHYSICAL_WEAPON,
    });
    const onAdd = jest.fn();

    expect(() =>
      render(
        <table>
          <tbody>
            <EquipmentRow equipment={equipment} onAdd={onAdd} />
          </tbody>
        </table>,
      ),
    ).not.toThrow();

    expect(screen.getByText('Hatchet')).toBeInTheDocument();
    // Range column falls back to a dash for rangeless weapons.
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('renders a rangeless physical weapon without crashing in compact mode', () => {
    const { ranges: _omitRanges, ...rangeless } = createMockWeapon({
      id: 'sword',
      name: 'Sword',
      category: WeaponCategory.PHYSICAL,
    });
    mockGetAllWeapons.mockReturnValue([rangeless as IWeapon]);

    const equipment = createEquipment({
      id: 'sword',
      name: 'Sword',
      category: EquipmentCategory.PHYSICAL_WEAPON,
    });
    const onAdd = jest.fn();

    expect(() =>
      render(
        <table>
          <tbody>
            <EquipmentRow equipment={equipment} onAdd={onAdd} compact={true} />
          </tbody>
        </table>,
      ),
    ).not.toThrow();

    expect(screen.getByText('Sword')).toBeInTheDocument();
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
      </table>,
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
      </table>,
    );

    expect(screen.getByText('Medium Laser')).toBeInTheDocument();
    // In compact mode, weight and slots are both 1, so there are multiple elements
    const onesElements = screen.getAllByText('1');
    expect(onesElements.length).toBeGreaterThanOrEqual(1);
  });

  it('should display equipment name in compact mode', () => {
    const equipment = createEquipment();
    const onAdd = jest.fn();

    render(
      <table>
        <tbody>
          <EquipmentRow equipment={equipment} onAdd={onAdd} compact={true} />
        </tbody>
      </table>,
    );

    expect(screen.getByText('Medium Laser')).toBeInTheDocument();
    // Compact mode renders the row correctly
    expect(screen.getByTitle('Add Medium Laser')).toBeInTheDocument();
  });
});
