import { render, screen } from '@testing-library/react';

import CanonicalUnitDetailPage from '@/pages/compendium/units/[id]';
import CustomUnitDetailPage from '@/pages/units/[id]';

jest.mock('next/router', () => ({
  useRouter: () => ({ query: { id: 'quirk-fixture' }, pathname: '/' }),
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

  function supply(fields: Record<string, unknown>) {
    const response =
      name === 'canonical'
        ? { success: true, data: { ...baseUnit, ...fields } }
        : { ...baseUnit, parsedData: fields };
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
});
