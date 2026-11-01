import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks } from 'node-mocks-http';

import catalogHandler from '@/pages/api/catalog';
import unitsHandler from '@/pages/api/units';
import { getCanonicalUnitService } from '@/services/units/CanonicalUnitService';
import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { Era } from '@/types/enums/Era';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

jest.mock('@/services/units/CanonicalUnitService', () => {
  const service = { getIndex: jest.fn(), query: jest.fn(), getById: jest.fn() };
  return { getCanonicalUnitService: () => service };
});
jest.mock('@/services/units/NodeCanonicalUnitService', () => {
  const service = { getIndexSyncWithBV: jest.fn() };
  return { getNodeCanonicalUnitService: () => service };
});

const mech = {
  id: 'tomahawk-c',
  name: 'Tomahawk C',
  chassis: 'Tomahawk',
  variant: 'C',
  tonnage: 100,
  techBase: TechBase.CLAN,
  era: Era.CLAN_INVASION,
  weightClass: WeightClass.ASSAULT,
  unitType: UnitType.BATTLEMECH,
  filePath: 'mech.json',
};
const fighter = {
  ...mech,
  family: 'aerospace' as const,
  unitType: UnitType.AEROSPACE,
  tonnage: 60,
  filePath: 'fighter.json',
};

beforeEach(() => {
  jest.clearAllMocks();
});

it.each([undefined, 'aerospace'] as const)(
  'catalog and units pass family %s to the service',
  async (family) => {
    (getCanonicalUnitService().getIndex as jest.Mock).mockResolvedValue([
      family ? fighter : mech,
    ]);
    (getCanonicalUnitService().getById as jest.Mock).mockResolvedValue(
      family ? fighter : mech,
    );
    const query = family ? { family } : {};
    const catalog = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query,
    });
    await catalogHandler(catalog.req, catalog.res);
    expect(catalog.res._getStatusCode()).toBe(200);
    expect(getCanonicalUnitService().getIndex).toHaveBeenCalledWith({
      family: family ?? 'battlemechs',
    });
    const unit = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { ...query, id: 'tomahawk-c' },
    });
    await unitsHandler(unit.req, unit.res);
    expect(getCanonicalUnitService().getById).toHaveBeenCalledWith(
      'tomahawk-c',
      { family: family ?? 'battlemechs' },
    );
    expect(unit.res._getJSONData().data.unitType).toBe(
      family ? UnitType.AEROSPACE : UnitType.BATTLEMECH,
    );
  },
);

it.each(['catalog', 'units'])('rejects invalid family on %s', async (api) => {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: 'GET',
    query: { family: '../vehicles' },
  });
  await (api === 'catalog' ? catalogHandler : unitsHandler)(req, res);
  expect(res._getStatusCode()).toBe(400);
});

it('filters BV-enriched results by family without borrowing mech BV for aerospace', async () => {
  (
    getNodeCanonicalUnitService().getIndexSyncWithBV as jest.Mock
  ).mockReturnValue([mech, fighter]);
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: 'GET',
    query: { family: 'aerospace', includeBV: 'true' },
  });
  await unitsHandler(req, res);
  expect(res._getJSONData().data).toEqual([fighter]);
});
