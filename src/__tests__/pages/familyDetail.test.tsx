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
  {
    family: 'capital',
    fixture: 'src/types/contracts/__tests__/fixtures/dropship-union-3070.json',
    total: '660 pts',
    movement: [
      ['Safe Thrust', '3'],
      ['Max Thrust', '5'],
    ],
    armor: [
      ['NOSE', '180'],
      ['RIGHT SIDE', '180'],
      ['LEFT SIDE', '180'],
      ['AFT', '120'],
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

it.each([
  [
    'tomahawk-c',
    'a21aa7b85ba35a979b7ff2bda15b43c26be62365babe6c563f4b8fadf6a8edc9',
  ],
  [
    'battle-tripod-r-h3l-2x',
    '349c380f3087aefe9f40a3968cecbb4639923ff2867979f6213bf87be8b426e3',
  ],
  [
    'archer-arc-6w',
    'a9cfea8a129f042f01140da09844de1c9bbf0e6d338bbcc1114fc6d675a8902d',
  ],
  [
    'dervish-dv-1s',
    '35a9963b19a2804aecb40e8f58fb4e7effdcf59e634212659ae7bbad8e7c2166',
  ],
  [
    'kintaro-kto-21',
    '0fc25c2d5644d83eab107636b990dbfa41c5b8b2b53c27be630b06db671e4006',
  ],
  [
    'zeus-x-zeu-x4',
    'c07f67fe6263bd226642abb61bfc07230da8a933d9e98e4ffd05d1ff6f9096e8',
  ],
])('preserves the complete shipped %s mech rendering', async (id, hash) => {
  const rows = JSON.parse(
    fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'),
  ).units as { id: string; path: string }[];
  const mech = rows.find((row) => row.id === id)!;
  const view = await showUnit(
    'battlemechs',
    path.join('public/data/units/battlemechs', mech.path),
  );
  // Captured before the family presentation fix; compare the complete mech DOM.
  const dom = format(view.container, {
    plugins: [plugins.DOMElement, plugins.DOMCollection],
  });
  expect(createHash('sha256').update(dom).digest('hex')).toBe(hash);
});

it('shows capital structural integrity', async () => {
  await showUnit('capital', cases[2].fixture);
  expectStat('SI', '11');
  expect(screen.queryByText('Jump MP')).not.toBeInTheDocument();
});

it.each([
  [
    'battlearmor',
    'public/data/units/battlearmor/elemental-standard-sqd5.json',
    '3',
  ],
  ['infantry', 'public/data/units/infantry/foot-rifle-platoon.json', '0'],
])('shows only supplied %s movement', async (family, fixture, jump) => {
  await showUnit(family, fixture);
  expectStat('Ground MP', '1');
  expectStat('Jump MP', jump);
  expectStat('UMU MP', '0');
  expect(screen.queryByText('Walk MP')).not.toBeInTheDocument();
  expect(screen.queryByText('Run MP')).not.toBeInTheDocument();
});

it.each(['battlearmor', 'infantry', 'capital'])(
  'shows unavailable movement for a sparse %s definition',
  async (family) => {
    mockRouter.query = { family, id: 'sparse' };
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: { id: 'sparse', name: 'Sparse unit', tonnage: 1 },
      }),
    });
    render(<DetailPage />);
    expect(await screen.findByText('Not Yet Available')).toBeVisible();
    for (const label of ['Walk MP', 'Run MP', 'Jump MP']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  },
);
