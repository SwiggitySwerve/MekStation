import { render, screen, within } from '@testing-library/react';

import { QUIRK_SUMMARY_UNITS } from '@/__tests__/fixtures/quirkSummaryUnits';
import CanonicalUnitDetailPage from '@/pages/compendium/units/[id]';
import CustomUnitDetailPage from '@/pages/units/[id]';

let mockQuery: Record<string, string>;
jest.mock('next/router', () => ({
  useRouter: () => ({ query: mockQuery, pathname: '/' }),
}));

const baseUnit = {
  id: 'quirk-fixture',
  name: 'Quirk Fixture',
  chassis: 'Quirk Fixture',
  variant: 'Test',
  tonnage: 50,
  techBase: 'INNER_SPHERE',
  rulesLevel: 'STANDARD',
  era: '3025',
  unitType: 'BattleMech',
  currentVersion: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const surfaces = [
  { name: 'canonical', Page: CanonicalUnitDetailPage, color: 'purple' },
  { name: 'saved', Page: CustomUnitDetailPage, color: 'violet' },
] as const;

describe.each(surfaces)('$name detail quirks', ({ name, Page, color }) => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockQuery = { id: 'quirk-fixture' };
  });

  function supply(fields: Record<string, unknown>) {
    const response =
      name === 'canonical'
        ? { success: true, data: { ...baseUnit, ...fields } }
        : { ...baseUnit, ...fields, parsedData: fields };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => response,
    });
  }

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('retains raw unit badges, duplicates, existing color and saved spacing', async () => {
    supply({ quirks: ['easy_pilot', 'unknown_native_quirk', 'easy_pilot'] });
    render(<Page />);

    await screen.findByText('Quirks');
    const badges = screen.getAllByText('easy_pilot');
    expect(badges).toHaveLength(2);
    expect(screen.getByText('unknown_native_quirk')).toBeInTheDocument();
    for (const badge of badges) {
      expect(badge).toHaveClass(`bg-${color}-600/20`);
    }
    if (name === 'saved') {
      expect(
        screen.getByText('Quirks').parentElement?.parentElement,
      ).toHaveClass('mb-6');
    }
  });

  it.each([undefined, []])(
    'hides the absent/empty unit card (%s)',
    async (quirks) => {
      supply({ quirks });
      render(<Page />);

      await screen.findByText(
        name === 'canonical' ? 'Core Systems' : 'Unit Information',
      );
      expect(screen.queryByText('Quirks')).not.toBeInTheDocument();
    },
  );

  it.each(QUIRK_SUMMARY_UNITS)(
    'shows the committed $label weapon map ($family)',
    async ({ unit, family }) => {
      mockQuery = { id: unit.id, family };
      supply(unit);
      render(<Page />);

      const list = await screen.findByRole('list', { name: 'Weapon quirks' });
      const rows = within(list).getAllByRole('listitem');
      expect(rows).toHaveLength(Object.keys(unit.weaponQuirks).length);
      Object.entries(unit.weaponQuirks).forEach(([locator, quirks], index) => {
        expect(within(rows[index]).getByText(locator)).toBeInTheDocument();
        expect(rows[index].textContent).toBe(locator + quirks.join(''));
      });
    },
  );

  it('keeps mixed unknown IDs, repeated quirks and distinct source locators', async () => {
    supply({
      quirks: ['unknown_unit_quirk'],
      weaponQuirks: {
        'NOS:0:Unknown Weapon': [
          'unknown_weapon_quirk',
          'unknown_weapon_quirk',
        ],
        'NOS:1:Unknown Weapon': ['unknown_weapon_quirk'],
      },
    });
    render(<Page />);

    const list = await screen.findByRole('list', { name: 'Weapon quirks' });
    expect(screen.getByText('unknown_unit_quirk')).toBeInTheDocument();
    expect(within(list).getAllByText('unknown_weapon_quirk')).toHaveLength(3);
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
  });

  if (name === 'saved') {
    it('keeps valid unit badges when optional saved weapon metadata is malformed', async () => {
      supply({
        quirks: ['easy_pilot'],
        weaponQuirks: { 'NOS:0:PPC': 'accurate' },
      });
      render(<Page />);

      expect(await screen.findByText('easy_pilot')).toHaveClass(
        'bg-violet-600/20',
      );
      expect(
        screen.queryByRole('list', { name: 'Weapon quirks' }),
      ).not.toBeInTheDocument();
    });
  }
});
