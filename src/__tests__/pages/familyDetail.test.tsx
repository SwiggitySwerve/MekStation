import { cleanup, render, screen, within } from '@testing-library/react';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { format, plugins } from 'pretty-format';

import DetailPage from '@/pages/compendium/units/[id]';

const mockRouter = { query: {} as Record<string, string>, isReady: true };
jest.mock('next/router', () => ({ useRouter: () => mockRouter }));
jest.mock('@/components/compendium', () => ({
  CompendiumLayout: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
}));
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

async function showUnit(family: string, fixture: string) {
  const unit = JSON.parse(fs.readFileSync(fixture, 'utf8'));
  mockRouter.query = { family, id: unit.id };
  global.fetch = jest
    .fn()
    .mockResolvedValue({ json: async () => ({ success: true, data: unit }) });
  const view = render(<DetailPage />);
  await screen.findByText(unit.unitType);
  return view;
}

function expectStat(label: string, value: string, scope = document.body) {
  expect(
    within(within(scope).getByText(label).parentElement!).getByText(value),
  ).toBeVisible();
}

const cases = [
  {
    family: 'aerospace',
    fixture:
      "scripts/__tests__/fixtures/unit-index/aerospace/Tomahawk 'C'.json",
    total: '211 pts',
    movement: [
      ['Safe Thrust', '8'],
      ['Max Thrust', '12'],
    ],
    armor: [
      ['NOSE', '72'],
      ['LEFT WING', '52'],
      ['RIGHT WING', '52'],
      ['AFT', '35'],
    ],
  },
  {
    family: 'vehicles',
    fixture:
      'scripts/__tests__/fixtures/unit-index/vehicles/Demolisher II Heavy Tank.json',
    total: '259 pts',
    movement: [
      ['Cruise MP', '3'],
      ['Flank MP', '5'],
      ['Jump MP', '0'],
    ],
    armor: [
      ['FRONT', '60'],
      ['RIGHT', '50'],
      ['LEFT', '50'],
      ['REAR', '40'],
      ['TURRET', '59'],
    ],
  },
];

it.each(cases)(
  'shows the real $family total armor',
  async ({ family, fixture, total }) => {
    await showUnit(family, fixture);
    expectStat('Total Armor', total);
  },
);

it.each(cases)(
  'shows the real $family movement',
  async ({ family, fixture, movement }) => {
    await showUnit(family, fixture);
    for (const [label, value] of movement) expectStat(label, value);
    expect(screen.queryByText('Walk MP')).not.toBeInTheDocument();
    expect(screen.queryByText('Run MP')).not.toBeInTheDocument();
  },
);

it.each(cases)(
  'shows each real $family armor allocation',
  async ({ family, fixture, armor }) => {
    await showUnit(family, fixture);
    const heading = screen.getByRole('heading', { name: 'Armor Allocation' });
    expect(heading).toBeVisible();
    const allocation = heading.parentElement!.parentElement!;
    for (const [label, value] of armor) expectStat(label, value, allocation);
  },
);

it('preserves the complete real mech detail rendering', async () => {
  const rows = JSON.parse(
    fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'),
  ).units as { id: string; path: string }[];
  const mech = rows.find(({ id }) => id === 'tomahawk-c')!;
  const view = await showUnit(
    'battlemechs',
    path.join('public/data/units/battlemechs', mech.path),
  );
  // Captured before the family presentation fix; compare the complete mech DOM.
  const dom = format(view.container, {
    plugins: [plugins.DOMElement, plugins.DOMCollection],
  });
  expect(createHash('sha256').update(dom).digest('hex')).toBe(
    'a21aa7b85ba35a979b7ff2bda15b43c26be62365babe6c563f4b8fadf6a8edc9',
  );
});
