import type { NextApiRequest, NextApiResponse } from 'next';

import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { createMocks } from 'node-mocks-http';

import { UnitsTable } from '@/components/compendium/units/UnitsTable';
import catalogHandler from '@/pages/api/catalog';
import unitsHandler from '@/pages/api/units';
import ListPage from '@/pages/compendium/units';
import DetailPage from '@/pages/compendium/units/[id]';
import { getCanonicalUnitService } from '@/services/units/CanonicalUnitService';
import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { Era } from '@/types/enums/Era';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

const mockRouter = {
  query: {} as Record<string, string>,
  isReady: true,
  push: jest.fn(),
};
jest.mock('next/router', () => ({ useRouter: () => mockRouter }));
jest.mock('@/components/compendium', () => ({
  CompendiumLayout: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
}));
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
  mockRouter.query = {};
});
afterEach(cleanup);

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

it('links the two Tomahawks to distinct detail URLs and shows their types', () => {
  render(
    <UnitsTable
      units={[mech, fighter]}
      sort={{ column: 'chassis', direction: 'asc' }}
      onSort={() => {}}
    />,
  );
  expect(
    screen
      .getAllByRole('link', { name: 'Tomahawk' })
      .map((link) => link.getAttribute('href')),
  ).toEqual([
    '/compendium/units/tomahawk-c',
    '/compendium/units/tomahawk-c?family=aerospace',
  ]);
  expect(screen.getByText('Aerospace')).toBeVisible();
});

it('list uses the route family and retains a way to select families', async () => {
  mockRouter.query = { family: 'aerospace' };
  global.fetch = jest.fn().mockResolvedValue({
    json: async () => ({ success: true, data: [fighter] }),
  });
  render(<ListPage />);
  await waitFor(() =>
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/catalog?family=aerospace',
      expect.anything(),
    ),
  );
  expect(
    await screen.findByRole('combobox', { name: 'Unit family' }),
  ).toHaveValue('aerospace');
});

it.each([undefined, 'aerospace'] as const)(
  'detail uses family %s, defaulting old URLs to mechs',
  async (family) => {
    mockRouter.query = { id: 'tomahawk-c', ...(family ? { family } : {}) };
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ success: true, data: family ? fighter : mech }),
    });
    render(<DetailPage />);
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/units?id=tomahawk-c${family ? '&family=aerospace' : ''}`,
        expect.anything(),
      ),
    );
    expect(
      await screen.findByText(family ? 'Aerospace' : 'BattleMech'),
    ).toBeVisible();
  },
);
