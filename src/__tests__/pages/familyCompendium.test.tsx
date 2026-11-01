import {
  render,
  screen,
  waitFor,
  cleanup,
  within,
  fireEvent,
} from '@testing-library/react';

import { UnitsTable } from '@/components/compendium/units/UnitsTable';
import ListPage from '@/pages/compendium/units';
import DetailPage from '@/pages/compendium/units/[id]';
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
    await screen.findByRole('combobox', { name: 'Unit Family' }),
  ).toHaveValue('aerospace');
});

it('shows display names and navigates with the family id', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    json: async () => ({ success: true, data: [mech] }),
  });
  render(<ListPage />);
  const selector = await screen.findByRole('combobox', { name: 'Unit Family' });
  expect(
    within(selector)
      .getAllByRole('option')
      .map((option) => option.textContent),
  ).toEqual([
    'BattleMechs',
    'Vehicles',
    'Aerospace',
    'Capital Ships',
    'Battle Armor',
    'Infantry',
  ]);
  fireEvent.change(selector, { target: { value: 'battlearmor' } });
  expect(mockRouter.push).toHaveBeenCalledWith(
    '/compendium/units?family=battlearmor',
  );
});

it.each(['capital', 'battlearmor', 'infantry'])(
  'explains an empty %s catalog and keeps the selector available',
  async (family) => {
    mockRouter.query = { family };
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ success: true, data: [] }),
    });
    render(<ListPage />);
    expect(
      await screen.findByText('No units are available in this family yet.'),
    ).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Unit Family' })).toHaveValue(
      family,
    );
  },
);

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
