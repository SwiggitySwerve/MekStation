import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import {
  QuickStartUnits,
  QUICK_START_UNITS,
  resolveQuickStartUnits,
} from '@/components/customizer/tabs/QuickStartUnits';
import { getCanonicalUnitService } from '@/services/units/CanonicalUnitService';
import { Era } from '@/types/enums/Era';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { IUnitIndexEntry } from '@/types/unit/UnitIndex';

jest.mock('@/services/units/CanonicalUnitService', () => ({
  getCanonicalUnitService: jest.fn(),
}));

function entry(
  chassis: string,
  variant: string,
  tonnage: number,
  weightClass: WeightClass,
): IUnitIndexEntry {
  return {
    id: `${chassis}-${variant}`.toLowerCase(),
    name: `${chassis} ${variant}`,
    chassis,
    variant,
    tonnage,
    techBase: TechBase.INNER_SPHERE,
    era: Era.LATE_SUCCESSION_WARS,
    weightClass,
    unitType: UnitType.BATTLEMECH,
    filePath: '',
  };
}

const INDEX: IUnitIndexEntry[] = [
  entry('Atlas', 'AS7-D', 100, WeightClass.ASSAULT),
  entry('Atlas', 'AS7-K', 100, WeightClass.ASSAULT),
  entry('Locust', 'LCT-1V', 20, WeightClass.LIGHT),
  entry('Hunchback', 'HBK-4G', 50, WeightClass.MEDIUM),
  entry('Marauder', 'MAD-3R', 75, WeightClass.HEAVY),
];

function mockIndex(getIndex: () => Promise<readonly IUnitIndexEntry[]>): void {
  jest
    .mocked(getCanonicalUnitService)
    .mockReturnValue({ getIndex } as unknown as ReturnType<
      typeof getCanonicalUnitService
    >);
}

describe('resolveQuickStartUnits', () => {
  it('keeps the listed order and matches chassis and variant exactly', () => {
    expect(
      resolveQuickStartUnits(INDEX).map((u) => `${u.chassis} ${u.variant}`),
    ).toEqual([
      'Locust LCT-1V',
      'Hunchback HBK-4G',
      'Marauder MAD-3R',
      'Atlas AS7-D',
    ]);
    expect(QUICK_START_UNITS.length).toBeLessThanOrEqual(4);
  });

  it('skips units the index does not have', () => {
    expect(resolveQuickStartUnits([INDEX[0]])).toHaveLength(1);
    expect(resolveQuickStartUnits([])).toEqual([]);
  });
});

describe('QuickStartUnits', () => {
  it('shows each unit with its tonnage and weight class', async () => {
    mockIndex(() => Promise.resolve(INDEX));
    render(<QuickStartUnits isLoadingUnit={false} onLoadUnit={jest.fn()} />);

    const atlas = await screen.findByRole('button', { name: /Atlas AS7-D/ });
    expect(atlas).toHaveTextContent('100t · Assault');
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  it('loads the clicked unit as a canonical unit through the load path', async () => {
    mockIndex(() => Promise.resolve(INDEX));
    const onLoadUnit = jest.fn().mockResolvedValue(undefined);
    render(<QuickStartUnits isLoadingUnit={false} onLoadUnit={onLoadUnit} />);

    await userEvent.click(
      await screen.findByRole('button', { name: /Hunchback HBK-4G/ }),
    );

    expect(onLoadUnit).toHaveBeenCalledTimes(1);
    expect(onLoadUnit).toHaveBeenCalledWith(INDEX[3], 'canonical');
  });

  it('disables the chips while a unit is loading', async () => {
    mockIndex(() => Promise.resolve(INDEX));
    render(<QuickStartUnits isLoadingUnit onLoadUnit={jest.fn()} />);

    for (const chip of await screen.findAllByRole('button')) {
      expect(chip).toBeDisabled();
    }
  });

  it('renders nothing when the index is empty or fails to load', async () => {
    mockIndex(() => Promise.reject(new Error('offline')));
    const { container } = render(
      <QuickStartUnits isLoadingUnit={false} onLoadUnit={jest.fn()} />,
    );

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
